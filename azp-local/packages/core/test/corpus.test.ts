// The corpus: pipelines from different ecosystems, none of which the tool knows
// anything about. Each is expanded and compared with a recorded expansion
// (corpus/expected/<name>.final.yml), and its model is checked for the features it exercises.
//
// The recorded expansions were produced by this expander and read through by hand.
// The design's oracle is Azure DevOps' Preview API (finalYaml); comparing against it
// needs an organisation and belongs to the "Connect" phase.
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildGraph, discoverPipelines, loadConfig, loadPipeline, toYamlText, type Job } from '../src';

const corpus = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../corpus');
// Recorded expansions live beside the corpus, not inside it: they are pipeline-shaped and would be discovered.
const expected = (root: string) => path.join(corpus, 'expected', `${path.basename(root)}.final.yml`);

function open(name: string, file = 'azure-pipelines.yml', overrides: { parameters?: Record<string, unknown>; variables?: Record<string, string> } = {}) {
  const root = path.join(corpus, name);
  const config = loadConfig(root);
  const loaded = loadPipeline(file, { workspaceRoot: root, config, ...overrides });
  const jobs = loaded.pipeline.stages.flatMap((s) => s.jobs);
  const job = (id: string): Job => {
    const found = jobs.find((j) => j.id === id);
    if (!found) throw new Error(`No job ${id}; have ${jobs.map((j) => j.id).join(', ')}`);
    return found;
  };
  return { root, config, loaded, jobs, job, graph: buildGraph(loaded.pipeline, loaded.staticVariables, config, 'linux') };
}

describe('.NET multi-stage pipeline with templates from another repository', () => {
  const c = open('dotnet-multistage');

  it('expands as recorded', async () => {
    expect(c.loaded.pipeline.diagnostics).toEqual([]);
    await expect(toYamlText(c.loaded.expanded!)).toMatchFileSnapshot(expected(c.root));
  });

  it('resolves templates through the repository alias, including nested and /absolute ones', () => {
    const files = c.loaded.pipeline.files.map((f) => path.relative(corpus, f).split(path.sep).join('/')).sort();
    expect(files).toEqual([
      'dotnet-multistage/azure-pipelines.yml',
      'shared-templates/stages/build.yml',
      'shared-templates/steps/dotnet.yml',
      'shared-templates/variables/common.yml',
    ]);
    const build = c.job('Build.build').steps[1];
    expect(build.displayName).toBe('dotnet build');
    // The step lives in steps/dotnet.yml, included by stages/build.yml, included by the pipeline.
    expect([build.src, build.src.via, build.src.via?.via].map((s) => s && path.basename(s.file))).toEqual(['dotnet.yml', 'build.yml', 'azure-pipelines.yml']);
  });

  it('generates a stage per environment with ${{ each }}, with conditional dependencies', () => {
    expect(c.loaded.pipeline.stages.map((s) => [s.id, s.displayName, s.dependsOn])).toEqual([
      ['Build', 'Build (Release)', []],
      ['Deploy_test', 'Deploy to TEST', ['Build']],
      ['Deploy_prod', 'Deploy to PROD', ['Build', 'Deploy_test']],
    ]);
    expect(c.loaded.pipeline.stages[1].condition).toBe('succeeded()');
    expect(c.loaded.pipeline.stages[2].condition).toContain("startsWith(variables['Build.SourceBranch'], 'refs/heads/release/')");
    expect(c.graph.stages.map((s) => s.column)).toEqual([0, 1, 2]);
  });

  it('flattens deployment hooks and maps a self-hosted pool through the config file', () => {
    const deploy = c.job('Deploy_prod.deploy');
    expect(deploy.steps.map((s) => [s.displayName, s.condition])).toEqual([
      ['Download orders', 'succeeded()'],
      ['Deploy web app', 'succeeded()'],
      ['Notify', 'failed()'],
    ]);
    expect(deploy.pool).toMatchObject({ kind: 'named', name: 'OnPremLinux' });
    expect(c.graph.stages[2].jobs[0].target).toMatchObject({ kind: 'container', image: 'mcr.microsoft.com/dotnet/sdk:9.0', source: 'config' });
  });

  it('evaluates a compile-time expression over a predefined variable', () => {
    const scheduled = open('dotnet-multistage', 'azure-pipelines.yml', { variables: { 'Build.Reason': 'Schedule' } });
    expect(scheduled.job('Build.build').steps.map((s) => s.displayName)).toEqual(['Checkout', 'dotnet build', 'CmdLine', 'Publish orders']);
  });

  it('reports an unmapped repository alias on the line that uses it', () => {
    const root = path.join(corpus, 'dotnet-multistage');
    const bare = loadPipeline('azure-pipelines.yml', { workspaceRoot: root });
    const errors = bare.pipeline.diagnostics.filter((d) => d.code === 'repository-unmapped');
    expect(errors.map((d) => d.source?.line)).toEqual([28, 33]); // the two `template: ...@templates` lines
    expect(errors[0].message).toContain("Repository alias 'templates' is not mapped");
  });
});

describe('Python matrix build with a service container, in a file not called azure-pipelines.yml', () => {
  const c = open('python-matrix-services', 'ci.yml');

  it('is found by its content', () => {
    expect(discoverPipelines(c.root, c.config).pipelines.map((p) => path.basename(p))).toEqual(['ci.yml']);
  });

  it('expands as recorded', async () => {
    expect(c.loaded.pipeline.diagnostics).toEqual([]);
    await expect(toYamlText(c.loaded.expanded!)).toMatchFileSnapshot(expected(c.root));
  });

  it('has an implicit stage, matrix legs with dotted variables, and a service container', () => {
    expect(c.loaded.pipeline.stages).toHaveLength(1);
    expect(c.loaded.pipeline.stages[0].implicit).toBe(true);
    expect(c.jobs.map((j) => j.id)).toEqual(['__default.test.py311', '__default.test.py312', '__default.test.py313', '__default.package', '__default.mac']);
    const leg = c.job('__default.test.py312');
    expect(leg.matrixLeg?.variables).toEqual({ 'python.version': '3.12' });
    expect(leg.steps[3].displayName).toBe('pytest (3.12)');
    expect(leg.services).toEqual({ db: { alias: 'postgres', image: 'postgres:17', env: { POSTGRES_PASSWORD: 'example' }, ports: ['5432:5432'], volumes: undefined, options: undefined } });
    expect(leg.maxParallel).toBe(3);
  });

  it('judges conditions from what is known before the run', () => {
    const preview = (jobId: string) => c.graph.stages[0].jobs.find((j) => j.id === jobId)!;
    expect(preview('__default.package').preview).toBe('runs');
    expect(preview('__default.test.py313').steps[5].preview).toBe('skipped');
    // isPullRequest is a runtime expression: its value is not known until the job starts.
    expect(preview('__default.package').steps[3].preview).toBe('depends');
    const asPullRequest = open('python-matrix-services', 'ci.yml', { variables: { 'Build.Reason': 'PullRequest' } });
    expect(asPullRequest.graph.stages[0].jobs.find((j) => j.name === 'package')!.preview).toBe('skipped');
  });

  it('marks what cannot run locally before anything runs', () => {
    expect(c.graph.stages[0].jobs.find((j) => j.name === 'mac')!.target.kind).toBe('unsupported');
    const tiers = Object.fromEntries(c.jobs.flatMap((j) => j.steps).flatMap((s) => (s.run.kind === 'task' ? [[s.run.name, s.run.tier]] : [])));
    expect(tiers).toEqual({ UsePythonVersion: 2, PublishTestResults: 1, PublishCodeCoverageResults: 1, TwineAuthenticate: 3 });
  });
});

describe('Go service: a container job on top of an extends template', () => {
  const c = open('container-job-extends');

  it('expands as recorded', async () => {
    expect(c.loaded.pipeline.diagnostics).toEqual([]);
    await expect(toYamlText(c.loaded.expanded!)).toMatchFileSnapshot(expected(c.root));
  });

  it('takes its jobs from the extended template and its build steps from the pipeline', () => {
    const build = c.job('__default.build');
    expect(build.displayName).toBe('Build in golang:1.24-alpine');
    expect(build.container).toEqual({ image: 'golang:1.24-alpine' });
    expect(c.graph.stages[0].jobs[0].target).toMatchObject({ kind: 'container', image: 'golang:1.24-alpine', source: 'container-job' });
    expect(build.steps.map((s) => s.displayName)).toEqual(['Checkout self', 'Report', 'Build', 'Test', 'After test']);
    // Steps passed as a stepList keep the position they were written at, in the pipeline file.
    expect(path.basename(build.steps[2].src.file)).toBe('azure-pipelines.yml');
    expect(path.basename(build.steps[1].src.file)).toBe('governed.yml');
    expect(build.steps[0].run).toEqual({ kind: 'checkout', repository: 'self', fetchDepth: 1 });
  });

  it('handles ${{ insert }}, if / elseif / else and functions', () => {
    expect(c.loaded.pipeline.variables.map((v) => [v.name, v.value])).toEqual([['CGO_ENABLED', '0'], ['governed', 'true']]);
    expect(c.job('__default.build').variables.map((v) => [v.name, v.value])).toEqual([['support', 'current']]);
    expect(c.job('__default.build').steps[1].run).toMatchObject({ script: 'echo "Support level $(support), 2 build steps"' });

    const older = open('container-job-extends', 'azure-pipelines.yml', { parameters: { goVersion: '1.23', lint: true } });
    expect(older.job('__default.build').variables[0].value).toBe('previous');
    expect(older.job('__default.build').steps.map((s) => s.displayName)).toEqual(['Checkout self', 'Report', 'Build', 'Test', 'Lint', 'After test']);
    expect(open('container-job-extends', 'azure-pipelines.yml', { parameters: { goVersion: '1.20' } }).job('__default.build').variables[0].value).toBe('unsupported');
  });
});
