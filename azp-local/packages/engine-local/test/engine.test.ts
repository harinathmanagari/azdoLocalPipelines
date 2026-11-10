// Runs small pipelines through the real engine in host mode, so the scheduler, step
// runner, logging commands, variables and artifacts are exercised without Docker.
// Scripts go through `node -e` so the same YAML works under cmd and under bash.
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  RunStore,
  RunView,
  createPlan,
  loadConfig,
  loadPipeline,
  startRun,
  ISOLATION_DECLINED,
  type IsolationRisk,
  type JobResult,
  type RunEvent,
  type Selection,
} from '@azp-local/core';
import { LocalEngine } from '../src';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'azpl-engine-'));
const workspace = path.join(tmp, 'repo');
const storeDir = path.join(tmp, 'store');

const say = (text: string) => `node -e "console.log('${text}')"`;

const CONFIG = `
images:
  testpool: host
variableGroups:
  release:
    region: westeurope
    apiKey: { secret: true }
tasks:
  SkippedTask@1: skip
  InHouse@1: { path: ./tasks/InHouse }
`;

interface Outcome {
  events: RunEvent[];
  view: RunView;
  result: JobResult;
  gaps: string[];
  runId: string;
  logs(jobId: string, stepId: string): string;
}

async function run(
  yaml: string,
  opts: {
    selection?: Selection;
    onEvent?: (event: RunEvent, cancel: () => void) => void;
    secrets?: Record<string, string>;
    confirm?: boolean;
    /** Answer to the isolation approval; these tests run in host mode, so it is always asked. */
    approve?: (risks: IsolationRisk[]) => boolean;
  } = {},
): Promise<Outcome> {
  fs.writeFileSync(path.join(workspace, 'azure-pipelines.yml'), yaml);
  const config = loadConfig(workspace);
  const { pipeline } = loadPipeline('azure-pipelines.yml', { workspaceRoot: workspace, config });
  expect(pipeline.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const store = new RunStore(storeDir);
  const buildId = store.nextBuildId();
  const plan = createPlan(pipeline, opts.selection ?? { kind: 'pipeline' }, { history: store, buildId, buildNumber: String(buildId) });
  const engine = new LocalEngine({
    imagesDir: path.join(tmp, 'images'),
    cacheDir: store.cacheDir,
    homeDir: path.join(tmp, 'home'),
    hostScratchDir: path.join(tmp, 'scratch'),
    maxParallelJobs: 3,
  });
  const events: RunEvent[] = [];
  const view = new RunView(plan.jobs.map((j) => ({ jobId: j.job.id, action: j.action })));
  const session = startRun({
    engine,
    plan,
    store,
    workspaceRoot: workspace,
    config,
    hooks: {
      getSecret: async (name) => opts.secrets?.[name],
      confirm: async () => opts.confirm ?? false,
      approveIsolation: async (risks) => opts.approve?.(risks) ?? true,
    },
    onEvent: (event) => {
      events.push(event);
      view.apply(event);
      opts.onEvent?.(event, () => void session.cancel());
    },
  });
  const outcome = await session.done;
  return {
    events,
    view,
    result: outcome.result,
    gaps: outcome.gaps,
    runId: session.runId,
    logs: (jobId, stepId) => store.readStepLog(session.runId, jobId, stepId),
  };
}

const steps = (out: Outcome, jobId: string) => Object.fromEntries(out.view.job(jobId).steps.map((s) => [s.id, s.state]));

beforeAll(() => {
  const write = (rel: string, content: string) => {
    fs.mkdirSync(path.dirname(path.join(workspace, rel)), { recursive: true });
    fs.writeFileSync(path.join(workspace, rel), content);
  };
  write('.gitignore', '.env\n');
  write('.env', 'TOKEN=do-not-copy');
  write('hello.txt', 'hello');
  write('.azp-local.yml', CONFIG);
  write('tasks/InHouse/task.json', JSON.stringify({ name: 'InHouse', inputs: [{ name: 'greeting', defaultValue: 'hi' }, { name: 'who' }], execution: { Node20_1: { target: 'index.js' } } }));
  write(
    'tasks/InHouse/index.js',
    "console.log(process.env.INPUT_GREETING + ' ' + process.env.INPUT_WHO);\nconsole.log('##vso[task.setvariable variable=said;isOutput=true]yes');\nconsole.log('##vso[task.complete result=SucceededWithIssues]done');\n",
  );
});

afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('local engine (host mode)', () => {
  it('checks out a copy without ignored files, and passes variables between steps', async () => {
    const out = await run(`
pool: testpool
variables:
  greeting: hello
steps:
  - script: node -e "const fs=require('fs'); if (fs.existsSync('.env') || !fs.existsSync('hello.txt')) process.exit(1)"
    displayName: Ignored files are not copied
  - script: ${say('##vso[task.setvariable variable=later]from-step')}
    displayName: Set a variable
  - script: node -e "if ('$(later)' !== 'from-step' || '$(greeting)' !== 'hello' || process.env.LATER !== 'from-step') process.exit(1)"
    displayName: Read it as macro and environment
  - script: node -e "if (process.env.MAPPED !== 'hello world') process.exit(1)"
    displayName: Step env
    env:
      MAPPED: $(greeting) world
`);
    expect(out.result).toBe('succeeded');
    expect(steps(out, '__default.Job')).toEqual({ __init: 'succeeded', checkout: 'succeeded', step1: 'succeeded', step2: 'succeeded', step3: 'succeeded', step4: 'succeeded' });
    expect(fs.existsSync(path.join(workspace, '.env'))).toBe(true); // the working tree is untouched
  });

  it('applies conditions, continueOnError and task.complete as Azure does', async () => {
    const out = await run(`
pool: testpool
steps:
  - checkout: none
  - script: node -e "process.exit(3)"
    displayName: Fails softly
    continueOnError: true
  - script: ${say('still runs')}
    displayName: After a soft failure
  - script: ${say('##vso[task.complete result=Failed]declared failure')}
    displayName: Fails by declaration
  - script: ${say('never')}
    displayName: Default condition
  - script: ${say('cleanup')}
    displayName: Runs on failure
    condition: failed()
  - script: ${say('always')}
    displayName: Always
    condition: always()
  - script: ${say('off')}
    displayName: Disabled
    enabled: false
`);
    expect(out.result).toBe('failed');
    expect(steps(out, '__default.Job')).toMatchObject({
      step1: 'succeeded', // the explicit `checkout: none`
      step2: 'succeededWithIssues',
      step3: 'succeeded',
      step4: 'failed',
      step5: 'skipped',
      step6: 'succeeded',
      step7: 'succeeded',
      step8: 'skipped',
    });
  });

  it('never counts a step that could not run as passed (D6)', async () => {
    const out = await run(`
pool: testpool
steps:
  - checkout: none
  - task: AzureWebApp@1
    displayName: Deploy
    inputs:
      azureSubscription: prod
  - task: SomeMarketplaceTask@2
    displayName: No package
  - task: SkippedTask@1
    displayName: Skipped by config
  - script: ${say('after')}
    displayName: Later step still runs
`);
    expect(out.result).toBe('succeededWithGaps');
    expect(out.view.job('__default.Job').state).toBe('succeededWithGaps');
    expect(steps(out, '__default.Job')).toMatchObject({ step2: 'unsupported', step3: 'unsupported', step4: 'skipped', step5: 'succeeded' });
    expect(out.gaps).toHaveLength(3);
    expect(out.gaps.join('\n')).toMatch(/Deploy: not run.*service connection/s);
    expect(out.gaps.join('\n')).toContain('SkippedTask@1 was skipped by .azp-local.yml');
  });

  it("runs a task's own Node handler from a mapped folder (tier 2)", async () => {
    const out = await run(`
pool: testpool
steps:
  - checkout: none
  - task: InHouse@1
    name: inhouse
    inputs:
      who: world
  - script: node -e "if ('$(inhouse.said)' !== 'yes') process.exit(1)"
`);
    expect(out.logs('__default.Job', 'inhouse')).toContain('hi world');
    expect(steps(out, '__default.Job')).toMatchObject({ inhouse: 'succeededWithIssues', step3: 'succeeded' });
    expect(out.result).toBe('succeededWithIssues');
  });

  it('flows output variables and artifacts between jobs and stages, and masks secrets', async () => {
    const out = await run(`
stages:
  - stage: Build
    jobs:
      - job: produce
        pool: testpool
        steps:
          - checkout: none
          - script: ${say('##vso[task.setvariable variable=version;isOutput=true]1.4.2')}
            name: meta
          - script: ${say('##vso[task.setvariable variable=token;isSecret=true]s3cr3t-value')}
          - script: ${say('token is $(token)')}
            name: leak
          - script: node -e "require('fs').writeFileSync('out.txt', 'artifact body')"
            workingDirectory: $(Build.ArtifactStagingDirectory)
          - publish: $(Build.ArtifactStagingDirectory)
            artifact: drop
      - job: consume
        pool: testpool
        dependsOn: produce
        variables:
          fromJob: $[ dependencies.produce.outputs['meta.version'] ]
        steps:
          - checkout: none
          - download: current
            artifact: drop
          - script: node -e "const fs=require('fs'); const p=require('path').join(process.env.PIPELINE_WORKSPACE,'drop','out.txt'); if (fs.readFileSync(p,'utf8') !== 'artifact body' || '$(fromJob)' !== '1.4.2') process.exit(1)"
  - stage: Release
    jobs:
      - job: later
        pool: testpool
        condition: eq(stageDependencies.Build.produce.outputs['meta.version'], '1.4.2')
        variables:
          - group: release
          - name: fromStage
            value: $[ stageDependencies.Build.produce.outputs['meta.version'] ]
        steps:
          - checkout: none
          - script: node -e "if ('$(fromStage)' !== '1.4.2' || '$(region)' !== 'westeurope' || process.env.APIKEY !== undefined) process.exit(1); console.log('key $(apiKey)')"
            name: show
`, { secrets: { apiKey: 'group-secret-value' } });
    expect(out.result).toBe('succeeded');
    expect(out.view.artifacts.map((a) => [a.name, a.files])).toEqual([['drop', 1]]);
    expect(out.logs('Build.produce', 'leak')).toContain('token is ***');
    expect(out.logs('Build.produce', 'leak')).not.toContain('s3cr3t-value');
    expect(out.logs('Release.later', 'show')).toContain('key ***');
    const finished = out.events.find((e) => e.type === 'job.finished' && e.jobId === 'Build.produce');
    expect(finished).toMatchObject({ outputs: { 'meta.version': '1.4.2' } });
  });

  it('runs nothing when the isolation approval is declined', async () => {
    const marker = path.join(tmp, 'ran-anyway.txt');
    let asked: IsolationRisk[] = [];
    const out = await run(
      `
pool: testpool
steps:
  - checkout: none
  - script: node -e "require('fs').writeFileSync(process.argv[1], 'x')" "${marker.replace(/\\/g, '/')}"
`,
      {
        approve: (risks) => {
          asked = risks;
          return false;
        },
      },
    );
    expect(asked.map((r) => r.kind)).toEqual(['host']);
    expect(fs.existsSync(marker)).toBe(false);
    expect(out.result).toBe('canceled');
    expect(out.gaps[0]).toBe(ISOLATION_DECLINED);
    expect(out.view.job('__default.Job')).toMatchObject({ state: 'canceled', message: ISOLATION_DECLINED });
    expect(out.events.some((e) => e.type === 'job.started' || e.type === 'step.started')).toBe(false);
  });

  it('keeps artifact names from writing outside the run (artifact.upload, publish)', async () => {
    // From <store>/runs/<id>/artifacts, four levels up is the temp root beside the store.
    const escaped = path.join(tmp, 'escaped');
    const out = await run(`
pool: testpool
steps:
  - checkout: none
  - script: node -e "require('fs').writeFileSync('payload.txt','planted'); console.log('##vso[artifact.upload artifactname=../../../../escaped]payload.txt')"
    name: upload
  - script: node -e "console.log('##vso[artifact.upload artifactname=..%5C..%5C..%5C..%5Cescaped]payload.txt')"
    name: backslash
    condition: always()
  - publish: $(Build.SourcesDirectory)
    artifact: ../../../../escaped
    condition: always()
  - task: PublishPipelineArtifact@1
    inputs:
      targetPath: $(Build.SourcesDirectory)
      artifact: ../../../../escaped
    condition: always()
`);
    expect(fs.existsSync(escaped)).toBe(false);
    expect(out.view.artifacts).toEqual([]);
    expect(out.logs('__default.Job', 'upload')).toContain('artifact.upload was refused');
    expect(out.result).toBe('failed');
  });

  it('keeps artifact names from reading host folders into a job (download)', async () => {
    const outside = path.join(tmp, 'private');
    fs.mkdirSync(outside, { recursive: true });
    fs.writeFileSync(path.join(outside, 'id_rsa'), 'PRIVATE KEY');
    const out = await run(`
pool: testpool
steps:
  - checkout: none
  - task: DownloadPipelineArtifact@2
    inputs:
      artifact: ../../../../private
      targetPath: $(Pipeline.Workspace)/got
  - download: current
    artifact: ../../../../private
    condition: always()
  - script: node -e "const p=require('path').join(process.env.PIPELINE_WORKSPACE,'got','id_rsa'); console.log(require('fs').existsSync(p) && 'LEAKED' || 'kept out')"
    name: look
    condition: always()
`);
    const states = out.view.job('__default.Job').steps.filter((s) => !['__init', 'look'].includes(s.id));
    expect(states.map((s) => [s.id, s.state])).toEqual([['step1', 'succeeded'], ['step2', 'failed'], ['step3', 'failed']]);
    expect(out.logs('__default.Job', 'look')).toContain('kept out');
    expect(out.logs('__default.Job', 'look')).not.toContain('LEAKED');
  });

  it('skips what depends on a failed job, and still runs a job that asks for it', async () => {
    const out = await run(`
jobs:
  - job: a
    pool: testpool
    steps:
      - checkout: none
      - script: node -e "process.exit(1)"
  - job: b
    pool: testpool
    dependsOn: a
    steps:
      - checkout: none
      - script: ${say('b')}
  - job: c
    pool: testpool
    dependsOn: a
    condition: failed()
    steps:
      - checkout: none
      - script: ${say('c')}
  - job: mac
    pool:
      vmImage: macOS-15
    steps:
      - script: ${say('mac')}
`);
    expect(out.result).toBe('failed');
    expect([...out.view.jobs.values()].map((j) => [j.id, j.state])).toEqual([
      ['__default.a', 'failed'],
      ['__default.b', 'skipped'],
      ['__default.c', 'succeeded'],
      ['__default.mac', 'unsupported'],
    ]);
    expect(out.gaps.join('\n')).toContain('macOS jobs cannot run in a container');
  });

  it('reports issues with the workspace file they point at', async () => {
    const out = await run(`
pool: testpool
steps:
  - script: ${say('##vso[task.logissue type=warning;sourcepath=hello.txt;linenumber=1;columnnumber=2]check this')}
    name: lint
`);
    expect(out.view.step('__default.Job', 'lint').issues).toEqual([
      { severity: 'warning', message: 'check this', source: { file: path.join(workspace, 'hello.txt'), line: 1, column: 2 } },
    ]);
    expect(out.result).toBe('succeeded');
  });

  it('stops the running step on cancel, then runs steps whose condition allows it', async () => {
    const out = await run(
      `
pool: testpool
steps:
  - checkout: none
  - script: node -e "console.log('started'); setTimeout(() => {}, 120000)"
    name: long
  - script: ${say('skipped by cancel')}
    name: normal
  - script: ${say('cleanup ran')}
    name: cleanup
    condition: always()
`,
      {
        onEvent: (event, cancel) => {
          if (event.type === 'log' && event.stepId === 'long' && event.line.includes('started')) cancel();
        },
      },
    );
    expect(out.result).toBe('canceled');
    expect(steps(out, '__default.Job')).toMatchObject({ long: 'canceled', normal: 'canceled', cleanup: 'succeeded' });
    expect(out.logs('__default.Job', 'cleanup')).toContain('cleanup ran');
  });

  it('runs a job up to a chosen step', async () => {
    const out = await run(
      `
pool: testpool
steps:
  - checkout: none
  - script: ${say('one')}
    name: one
  - script: ${say('two')}
    name: two
  - script: node -e "process.exit(1)"
    name: three
`,
      { selection: { kind: 'step', jobId: '__default.Job', stepId: 'two' } },
    );
    expect(out.result).toBe('succeeded');
    expect(steps(out, '__default.Job')).toMatchObject({ one: 'succeeded', two: 'succeeded', three: 'skipped' });
  });

  it('reuses the outputs and artifacts of jobs that already passed', async () => {
    const yaml = `
jobs:
  - job: build
    pool: testpool
    steps:
      - checkout: none
      - script: ${say('##vso[task.setvariable variable=n;isOutput=true]41')}
        name: out
      - script: node -e "require('fs').writeFileSync(require('path').join(process.env.BUILD_ARTIFACTSTAGINGDIRECTORY, 'a.txt'), 'A')"
      - publish: $(Build.ArtifactStagingDirectory)
        artifact: bits
  - job: use
    pool: testpool
    dependsOn: build
    variables:
      n: $[ dependencies.build.outputs['out.n'] ]
    steps:
      - checkout: none
      - download: current
        artifact: bits
      - script: node -e "const fs=require('fs'); if ('$(n)' !== '41' || !fs.existsSync(require('path').join(process.env.PIPELINE_WORKSPACE,'bits','a.txt'))) process.exit(1)"
`;
    const first = await run(yaml);
    expect(first.result).toBe('succeeded');
    const second = await run(yaml, { selection: { kind: 'job', jobId: '__default.use' } });
    expect(second.result).toBe('succeeded');
    expect(second.view.job('__default.build')).toMatchObject({ state: 'succeeded', reused: true, steps: [] });
    expect(second.view.job('__default.use').state).toBe('succeeded');
    expect(second.events.filter((e) => e.type === 'job.started').map((e) => (e as { jobId: string }).jobId)).toEqual(['__default.use']);
  });

  it('asks before running something whose condition cannot be decided locally (D3)', async () => {
    const yaml = `
pool: testpool
variables:
  - group: not-configured-here
steps:
  - checkout: none
  - script: ${say('maybe')}
    name: maybe
    condition: eq(variables['fromTheGroup'], 'yes')
`;
    const declined = await run(yaml, { confirm: false });
    expect(steps(declined, '__default.Job')).toMatchObject({ maybe: 'skipped' });
    const accepted = await run(yaml, { confirm: true });
    expect(steps(accepted, '__default.Job')).toMatchObject({ maybe: 'succeeded' });
  });
});
