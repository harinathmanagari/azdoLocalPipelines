// The demo application's pipeline is the first entry of the corpus: these tests pin
// down what the model, the graph and the planner make of it.
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildGraph,
  createPlan,
  loadConfig,
  loadPipeline,
  renderGraphText,
  toYamlText,
  type GraphModel,
  type LoadedPipeline,
  type LocalConfig,
} from '../src';

const demo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../demo-app');
let config: LocalConfig;
let loaded: LoadedPipeline;
let graph: GraphModel;

beforeAll(() => {
  config = loadConfig(demo);
  loaded = loadPipeline('azure-pipelines.yml', { workspaceRoot: demo, config });
  graph = buildGraph(loaded.pipeline, loaded.staticVariables, config, 'win32');
});

const job = (id: string) => loaded.pipeline.stages.flatMap((s) => s.jobs).find((j) => j.id === id)!;

describe('demo pipeline: model', () => {
  it('expands without diagnostics', () => {
    expect(config.diagnostics).toEqual([]);
    expect(loaded.pipeline.diagnostics).toEqual([]);
  });

  it('has three stages in dependency order', () => {
    expect(loaded.pipeline.stages.map((s) => [s.id, s.dependsOn])).toEqual([
      ['Validate', []],
      ['Build', ['Validate']],
      ['Deploy', ['Build']],
    ]);
    expect(loaded.pipeline.stages[2].displayName).toBe('Deploy (staging)');
  });

  it('fans the test job into its matrix legs', () => {
    const ids = loaded.pipeline.stages[0].jobs.map((j) => j.id);
    expect(ids).toEqual(['Validate.lint', 'Validate.test.linux_node22', 'Validate.test.linux_node24', 'Validate.test.windows_node22']);
    expect(job('Validate.test.windows_node22').pool).toMatchObject({ kind: 'hosted', vmImage: 'windows-2025' });
    expect(job('Validate.test.linux_node24').maxParallel).toBe(2);
  });

  it('drops the Windows leg when the parameter says so', () => {
    const without = loadPipeline('azure-pipelines.yml', { workspaceRoot: demo, config, parameters: { includeWindows: false } });
    expect(without.pipeline.stages[0].jobs.map((j) => j.matrixLeg?.name)).toEqual([undefined, 'linux_node22', 'linux_node24']);
  });

  it('includes the install template with positions that survive expansion (D2)', () => {
    const lint = job('Validate.lint');
    expect(lint.steps.map((s) => s.displayName)).toEqual([
      'Checkout',
      'Use Node 22.x',
      'Cache npm',
      'Install dependencies',
      'ESLint',
      'Extra check: typecheck',
    ]);
    const useNode = lint.steps[1];
    expect(path.basename(useNode.src.file)).toBe('install.yml');
    expect(path.basename(useNode.src.via!.file)).toBe('azure-pipelines.yml');
    expect(job('Validate.test.linux_node24').steps[1].displayName).toBe('Use Node 24.x');
  });

  it('classifies tasks into tiers and applies the config file', () => {
    const tasks = Object.fromEntries(
      loaded.pipeline.stages
        .flatMap((s) => s.jobs)
        .flatMap((j) => j.steps)
        .flatMap((s) => (s.run.kind === 'task' ? [[`${s.run.name}@${s.run.version}`, [s.run.tier, s.run.override?.action]]] : [])),
    );
    expect(tasks).toEqual({
      'UseNode@1': [1, undefined],
      'Cache@2': [1, undefined],
      'PublishTestResults@2': [1, undefined],
      'PublishCodeCoverageResults@2': [1, undefined],
      'BundleSizeReport@1': [2, 'path'],
      'AzureStaticWebApp@0': [3, 'script'],
    });
  });

  it('flattens the deployment job and gives it an artifact download', () => {
    const deploy = job('Deploy.deploy_web');
    expect(deploy.kind).toBe('deployment');
    expect(deploy.environment).toBe('pipeline-pulse-staging');
    expect(deploy.steps.map((s) => s.run.kind)).toEqual(['download', 'script', 'task']);
    expect(deploy.variables.map((v) => v.group ?? v.name)).toEqual(['demo-release-settings', 'appVersion']);
  });

  it('reports a parameter value outside the allowed set', () => {
    const bad = loadPipeline('azure-pipelines.yml', { workspaceRoot: demo, config, parameters: { deployEnvironment: 'moon' } });
    expect(bad.pipeline.diagnostics.map((d) => d.code)).toContain('parameter-value');
  });

  it('serves unsaved editor text through readFile', () => {
    const unsaved = loadPipeline('azure-pipelines.yml', {
      workspaceRoot: demo,
      config,
      readFile: (file) => (file.endsWith('azure-pipelines.yml') ? 'steps:\n  - script: echo unsaved\n' : undefined),
    });
    expect(unsaved.pipeline.stages[0].implicit).toBe(true);
    expect(unsaved.pipeline.stages[0].jobs[0].steps.map((s) => s.displayName)).toEqual(['Checkout', 'CmdLine']);
  });
});

describe('demo pipeline: graph', () => {
  it('lays stages out in columns', () => {
    expect(graph.stages.map((s) => [s.id, s.column])).toEqual([['Validate', 0], ['Build', 1], ['Deploy', 2]]);
  });

  it('resolves the coverage condition per matrix leg', () => {
    const preview = (jobId: string, step: string) =>
      graph.stages.flatMap((s) => s.jobs).find((j) => j.id === jobId)!.steps.find((s) => s.displayName === step)!.preview;
    expect(preview('Validate.test.linux_node22', 'Publish coverage')).toBe('runs');
    expect(preview('Validate.test.linux_node24', 'Publish coverage')).toBe('skipped');
    expect(preview('Validate.test.linux_node22', 'Run unit tests')).toBe('skipped');
    expect(preview('Validate.test.linux_node24', 'Publish test results')).toBe('runs');
  });

  it('maps pools to local targets', () => {
    const target = (jobId: string) => graph.stages.flatMap((s) => s.jobs).find((j) => j.id === jobId)!.target;
    expect(target('Validate.lint')).toMatchObject({ kind: 'container', image: 'azp-local/agent-ubuntu:24.04' });
    expect(target('Validate.test.windows_node22').kind).toBe('host');
    const linux = buildGraph(loaded.pipeline, loaded.staticVariables, config, 'linux');
    expect(linux.stages[0].jobs[3].target.kind).toBe('unsupported');
  });

  it('shows job dependencies and the stage condition', () => {
    const notes = graph.stages[1].jobs.find((j) => j.name === 'release_notes')!;
    expect(notes.dependsOn).toEqual(['Build.build']);
    expect(graph.stages[2].condition).toContain("eq(variables['Build.SourceBranch'], 'refs/heads/main')");
    expect(graph.stages[2].preview).toBe('runs');
  });

  it('renders as text', () => {
    const text = renderGraphText(graph);
    expect(text).toContain('Stage Build  (after Validate)');
    expect(text).toContain('{AzureStaticWebApp@0} (tier 3, replaced by ./ci/local/deploy-stub.sh)');
  });
});

describe('demo pipeline: expansion', () => {
  it('produces a final YAML with no template syntax left', () => {
    const text = toYamlText(loaded.expanded!);
    expect(text).not.toContain('${{');
    expect(text).not.toContain('template:');
    expect(text).toContain('displayName: "Extra check: typecheck"');
  });
});

describe('demo pipeline: planner', () => {
  const actions = (plan: ReturnType<typeof createPlan>) => Object.fromEntries(plan.jobs.map((j) => [j.job.id, j.action]));

  it('runs everything for the whole pipeline', () => {
    const plan = createPlan(loaded.pipeline, { kind: 'pipeline' }, { buildId: 1, buildNumber: '1' });
    expect(new Set(Object.values(actions(plan)))).toEqual(new Set(['run']));
  });

  it('runs dependencies first when there is nothing to reuse', () => {
    const plan = createPlan(loaded.pipeline, { kind: 'job', jobId: 'Build.release_notes' }, { buildId: 1, buildNumber: '1' });
    expect(actions(plan)).toMatchObject({
      'Validate.lint': 'run',
      'Build.build': 'run',
      'Build.release_notes': 'run',
      'Deploy.deploy_web': 'omit',
    });
    expect(plan.jobs.find((j) => j.job.id === 'Build.build')!.reason).toContain('no earlier result');
  });

  it('reuses dependencies that passed in an earlier run', () => {
    const history = {
      lastSuccessful: (_file: string, jobId: string) => ({ runId: 'run-0001', jobId, result: 'succeeded' as const, outputs: { 'meta.appVersion': '1.0' } }),
      fromRun: () => undefined,
    };
    const plan = createPlan(loaded.pipeline, { kind: 'job', jobId: 'Build.release_notes' }, { buildId: 2, buildNumber: '2', history });
    expect(actions(plan)).toMatchObject({ 'Validate.lint': 'reuse', 'Build.build': 'reuse', 'Build.release_notes': 'run' });
  });

  it('selects every leg of a matrix job by its base id, and later stages with andLater', () => {
    const legs = createPlan(loaded.pipeline, { kind: 'job', jobId: 'Validate.test' }, { buildId: 1, buildNumber: '1' });
    expect(Object.entries(actions(legs)).filter(([, a]) => a === 'run').map(([id]) => id)).toEqual([
      'Validate.test.linux_node22',
      'Validate.test.linux_node24',
      'Validate.test.windows_node22',
    ]);
    const later = createPlan(loaded.pipeline, { kind: 'stage', stageId: 'Build', andLater: true }, { buildId: 1, buildNumber: '1' });
    expect(actions(later)['Deploy.deploy_web']).toBe('run');
  });

  it('re-runs only what did not pass', () => {
    const history = {
      lastSuccessful: () => undefined,
      fromRun: (runId: string, jobId: string) =>
        jobId.startsWith('Validate.') ? { runId, jobId, result: 'succeeded' as const, outputs: {} } : { runId, jobId, result: 'failed' as const, outputs: {} },
    };
    const plan = createPlan(loaded.pipeline, { kind: 'failed', runId: 'run-0003' }, { buildId: 4, buildNumber: '4', history });
    expect(actions(plan)).toMatchObject({ 'Validate.lint': 'reuse', 'Build.build': 'run', 'Deploy.deploy_web': 'run' });
  });
});
