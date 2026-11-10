// The local engine (design option B): one backend per job, one process per step.
// It emits the same event stream any engine does; the views cannot tell which ran.
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  BUILT_IN_IMAGE,
  ExprError,
  RunState,
  Unknown,
  VariableBag,
  describeTarget,
  evalJobCondition,
  evalRuntimeValue,
  evalStageCondition,
  evalStepCondition,
  jobContext,
  resolveTarget,
  staticVariables,
  statusOf,
  variablesContext,
  type Engine,
  type EvalContext,
  type Job,
  type JobResult,
  type PlannedJob,
  type RunEvent,
  type RunHandle,
  type RunIO,
  type RunPlan,
  type Stage,
  type Status,
  type Step,
  type StepResult,
  type StepRun,
  type Value,
} from '@azp-local/core';
import { ContainerBackend, HostBackend, type JobBackend } from './backend';
import type { EngineSettings, ExecResult, StepContext, StepOutcome } from './context';
import { DockerClient } from './docker';
import { LineSplitter, maskSecrets, parseLoggingCommand, type LoggingCommand } from './logging';
import { artifactNameProblem, artifactPath, checkout, download, publish } from './steps/artifacts';
import { cache } from './steps/cache';
import { runReplacementScript, runTaskFromFolder } from './steps/custom';
import { useNode } from './steps/node';
import { publishCoverage, publishTestResults } from './steps/publish';
import { runScript, runScriptTask } from './steps/script';
import { listDirectory, packFiles } from './workspace';

export type LocalEngineOptions = Pick<EngineSettings, 'imagesDir' | 'cacheDir' | 'homeDir'> & Partial<EngineSettings>;

class EventQueue implements AsyncIterable<RunEvent> {
  private readonly items: RunEvent[] = [];
  private readonly waiters: ((result: IteratorResult<RunEvent>) => void)[] = [];
  private closed = false;

  push(event: RunEvent): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter) waiter({ value: event, done: false });
    else this.items.push(event);
  }

  close(): void {
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) waiter({ value: undefined, done: true });
  }

  [Symbol.asyncIterator](): AsyncIterator<RunEvent> {
    return {
      next: () => {
        if (this.items.length > 0) return Promise.resolve({ value: this.items.shift()!, done: false });
        if (this.closed) return Promise.resolve({ value: undefined, done: true });
        return new Promise((resolve) => this.waiters.push(resolve));
      },
    };
  }
}

class Semaphore {
  private readonly waiting: (() => void)[] = [];
  constructor(private free: number) {}

  async acquire(): Promise<void> {
    if (this.free > 0) {
      this.free--;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  release(): void {
    const next = this.waiting.shift();
    if (next) next();
    else this.free++;
  }
}

const safe = (name: string) => name.replace(/[^A-Za-z0-9._-]/g, '_');
const succeededSoFar = (status: Status) => status === 'Succeeded' || status === 'SucceededWithIssues';

export class LocalEngine implements Engine {
  readonly id = 'local';
  readonly settings: EngineSettings;

  constructor(options: LocalEngineOptions) {
    this.settings = {
      hostScratchDir: path.join(os.tmpdir(), 'azpl'),
      maxParallelJobs: 2,
      keepContainersOnFailure: false,
      matchHostedHardware: false,
      platform: process.platform,
      ...options,
    };
  }

  start(plan: RunPlan, io: RunIO): RunHandle {
    const run = new Run(plan, io, this.settings);
    void run.main();
    return { events: run.queue, cancel: () => run.cancel() };
  }
}

class Run {
  readonly queue = new EventQueue();
  readonly state: RunState;
  readonly gaps: string[] = [];
  readonly cancelSignal = new AbortController();
  /** Secret values seen anywhere in the run; every log line is masked against them. */
  readonly secrets = new Set<string>();
  readonly baseVars: Record<string, string>;
  buildNumber: string;
  readonly startTime = new Date();

  private readonly slots: Semaphore;
  private readonly groupSlots = new Map<string, Semaphore>();
  private readonly results = new Map<string, JobResult>();
  private readonly imageLocks = new Map<string, Promise<void>>();
  private readonly secretCache = new Map<string, Promise<string | undefined>>();
  private dockerClient?: Promise<DockerClient>;

  constructor(
    readonly plan: RunPlan,
    readonly io: RunIO,
    readonly settings: EngineSettings,
  ) {
    this.state = new RunState(plan.pipeline);
    this.slots = new Semaphore(Math.max(1, settings.maxParallelJobs));
    this.buildNumber = plan.buildNumber;
    this.baseVars = staticVariables(io.workspaceRoot, plan.pipeline.file, { ...io.config.variables, ...plan.variables });
  }

  emit(event: RunEvent): void {
    this.queue.push(event);
  }

  docker(): Promise<DockerClient> {
    this.dockerClient ??= DockerClient.connect(this.settings.dockerHost);
    return this.dockerClient;
  }

  /** One prompt per secret for the whole run, however many jobs need it. */
  secret(name: string, group: string): Promise<string | undefined> {
    const key = `${group}/${name}`;
    let pending = this.secretCache.get(key);
    if (!pending) {
      pending = this.io.getSecret(name, group).then((value) => {
        if (value) this.secrets.add(value);
        return value;
      });
      this.secretCache.set(key, pending);
    }
    return pending;
  }

  async cancel(): Promise<void> {
    this.state.canceled = true;
    this.cancelSignal.abort();
  }

  /** Makes sure an image is present: builds the built-in ones, pulls the rest. Concurrent jobs share one attempt. */
  ensureImage = async (image: string, log: (line: string) => void): Promise<void> => {
    const running = this.imageLocks.get(image);
    if (running) {
      log(`Waiting for image ${image}, which another job is preparing`);
      return running;
    }
    const attempt = (async () => {
      const docker = await this.docker();
      const present = await docker.imageInfo(image);
      if (present) {
        log(`Image ${image} (${present.RepoDigests?.[0] ?? present.Id})`);
        return;
      }
      if (image.startsWith(`${BUILT_IN_IMAGE}:`)) {
        const release = image.slice(BUILT_IN_IMAGE.length + 1);
        const context = path.join(this.settings.imagesDir, 'ubuntu');
        if (!fs.existsSync(path.join(context, 'Dockerfile'))) throw new Error(`The Dockerfile for the built-in image is missing from ${context}.`);
        log(`Building ${image} from ${context}. This happens once; later runs reuse the image.`);
        await docker.build(packFiles(listDirectory(context)), image, { UBUNTU_VERSION: release }, (text) => {
          for (const line of text.split('\n')) if (line.trim()) log(line.trimEnd());
        });
        log(`Built ${image}`);
      } else {
        log(`Pulling ${image}`);
        await docker.pull(image, log);
        const pulled = await docker.imageInfo(image);
        log(`Pulled ${image} (${pulled?.RepoDigests?.[0] ?? pulled?.Id ?? 'unknown digest'})`);
      }
    })();
    this.imageLocks.set(image, attempt);
    try {
      await attempt;
    } catch (err) {
      this.imageLocks.delete(image);
      throw err;
    }
  };

  async main(): Promise<void> {
    const { plan } = this;
    this.emit({ type: 'run.started', runId: this.io.runId, at: Date.now() });
    try {
      for (const pj of plan.jobs) {
        if (pj.action !== 'reuse' || !pj.reused) continue;
        this.state.jobs.set(pj.job.id, { result: pj.reused.result, outputs: pj.reused.outputs });
        this.emit({
          type: 'job.finished',
          jobId: pj.job.id,
          result: pj.reused.result,
          message: `Not run again: result and outputs reused from ${pj.reused.runId}.`,
          outputs: pj.reused.outputs,
          at: Date.now(),
        });
      }
      const stages = new Map<string, Promise<void>>();
      for (const stage of plan.pipeline.stages) {
        stages.set(
          stage.id,
          (async () => {
            await Promise.resolve();
            await Promise.all(stage.dependsOn.map((id) => stages.get(id)));
            await this.runStage(stage);
          })(),
        );
      }
      await Promise.all(stages.values());
    } catch (err) {
      this.gaps.push(`The run stopped on an internal error: ${(err as Error).message}`);
      this.results.set('__internal', 'failed');
    }
    this.emit({ type: 'run.finished', result: this.overall(), gaps: this.gaps, at: Date.now() });
    this.queue.close();
  }

  private overall(): JobResult {
    const results = [...this.results.values()];
    if (results.includes('failed')) return 'failed';
    if (this.state.canceled || results.includes('canceled')) return 'canceled';
    if (this.gaps.length > 0 || results.includes('succeededWithGaps') || results.includes('unsupported')) return 'succeededWithGaps';
    if (results.includes('succeededWithIssues')) return 'succeededWithIssues';
    if (results.length > 0 && results.every((r) => r === 'skipped')) return 'skipped';
    return 'succeeded';
  }

  finishJob(job: Job, result: JobResult, message?: string, outputs: Record<string, string> = {}, container?: string): void {
    this.state.jobs.set(job.id, { result, outputs });
    this.results.set(job.id, result);
    this.emit({ type: 'job.finished', jobId: job.id, result, message, outputs, container, at: Date.now() });
  }

  /** Asks the host when a condition cannot be decided from what is known locally (D3). */
  private async decide(what: string, condition: string, verdict: boolean | Unknown): Promise<boolean> {
    if (!(verdict instanceof Unknown)) return verdict;
    return this.io.confirm(`${what} has the condition '${condition}', which depends on a value that is not known locally (${verdict.reason}). Run it anyway?`);
  }

  private async runStage(stage: Stage): Promise<void> {
    const planned = this.plan.jobs.filter((pj) => pj.job.stageId === stage.id && pj.action === 'run');
    if (planned.length === 0) return;
    const all = (result: JobResult, message: string) => planned.forEach((pj) => this.finishJob(pj.job, result, message));

    if (this.state.canceled) return all('canceled', 'The run was canceled before this stage started.');
    try {
      const { bag, unknown } = await this.variables(stage, undefined, undefined);
      const verdict = evalStageCondition(stage, this.state, variablesContext(lookup(bag, unknown)));
      if (!(await this.decide(`Stage '${stage.displayName}'`, stage.condition, verdict))) {
        return all('skipped', stage.dependsOn.length ? `Stage skipped: its condition '${stage.condition}' was false.` : 'Stage skipped by its condition.');
      }
    } catch (err) {
      if (!(err instanceof ExprError)) throw err;
      return all('failed', `Stage condition could not be evaluated: ${err.message}`);
    }

    const jobs = new Map<string, Promise<void>>();
    for (const pj of planned) {
      jobs.set(
        pj.job.id,
        (async () => {
          await Promise.resolve();
          const waits = pj.job.dependsOn.flatMap((dep) => planned.filter((other) => other.job.name === dep).map((other) => jobs.get(other.job.id)));
          await Promise.all(waits);
          await this.runJob(pj, stage);
        })(),
      );
    }
    await Promise.all(jobs.values());
  }

  private async runJob(pj: PlannedJob, stage: Stage): Promise<void> {
    const { job } = pj;
    try {
      if (this.state.canceled) return this.finishJob(job, 'canceled', 'The run was canceled before this job started.');
      const { bag, unknown } = await this.variables(stage, job, undefined);
      const verdict = evalJobCondition(stage, job, this.state, variablesContext(lookup(bag, unknown)));
      if (!(await this.decide(`Job '${job.displayName}'`, job.condition, verdict))) {
        const blocked = job.dependsOn.filter((dep) => !['Succeeded', 'SucceededWithIssues'].includes(this.state.jobStatus(stage.id, dep) ?? ''));
        return this.finishJob(
          job,
          'skipped',
          blocked.length ? `Skipped: ${blocked.join(', ')} did not succeed.` : `Skipped: the condition '${job.condition}' was false.`,
        );
      }

      const target = resolveTarget(job, this.io.config, this.settings.platform);
      if (target.kind === 'unsupported') {
        this.gaps.push(`${job.displayName}: not run. ${target.reason}`);
        return this.finishJob(job, 'unsupported', target.reason);
      }

      // Matrix legs honour maxParallel; everything honours the global limit.
      const groupKey = `${stage.id}.${job.name}`;
      let group: Semaphore | undefined;
      if (job.matrixLeg && job.maxParallel && job.maxParallel > 0) {
        group = this.groupSlots.get(groupKey) ?? new Semaphore(job.maxParallel);
        this.groupSlots.set(groupKey, group);
      }
      await group?.acquire();
      await this.slots.acquire();
      try {
        if (this.state.canceled) return this.finishJob(job, 'canceled', 'The run was canceled before this job started.');
        this.emit({ type: 'job.started', jobId: job.id, image: describeTarget(target), at: Date.now() });
        const runner = new JobRunner(this, pj, stage);
        const done = await runner.execute(target.kind === 'host' ? undefined : target.image);
        this.finishJob(job, done.result, done.message, done.outputs, done.shell);
      } finally {
        this.slots.release();
        group?.release();
      }
    } catch (err) {
      this.finishJob(job, 'failed', `The job stopped on an error: ${(err as Error).message}`);
    }
  }

  /**
   * The variables in scope for a stage or a job. Without a backend this is what
   * conditions see before the job starts; with one, the agent's own variables are added.
   * `unknown` lists names that cannot be known locally.
   */
  async variables(stage: Stage, job: Job | undefined, backend: JobBackend | undefined): Promise<{ bag: VariableBag; unknown: Unknown | Set<string>; notes: string[] }> {
    const { plan, io } = this;
    const bag = new VariableBag();
    const notes: string[] = [];
    const unknownNames = new Set<string>();
    let unsuppliedGroup: string | undefined;

    for (const [name, value] of Object.entries(this.baseVars)) bag.set(name, value);
    bag.set('Build.BuildId', String(plan.buildId));
    bag.set('Build.BuildNumber', this.buildNumber);
    bag.set('Build.BuildUri', `vstfs:///Build/Build/${plan.buildId}`);
    bag.set('System.StageName', stage.id);
    bag.set('System.StageDisplayName', stage.displayName);
    bag.set('System.StageAttempt', '1');
    if (job) {
      bag.set('System.PhaseName', job.name);
      bag.set('System.PhaseDisplayName', job.displayName);
      bag.set('System.JobName', job.matrixLeg?.name ?? '__default');
      bag.set('System.JobDisplayName', job.displayName);
      bag.set('System.JobAttempt', '1');
      bag.set('System.JobId', crypto.randomUUID());
      bag.set('Agent.JobName', job.displayName);
      if (job.kind === 'deployment') {
        bag.set('Environment.Name', job.environment ?? '');
        bag.set('Strategy.Name', 'runOnce');
      }
    }
    if (backend) {
      const p = backend.paths;
      const agent: Record<string, string> = {
        'Agent.OS': backend.os,
        'Agent.OSArchitecture': backend.arch,
        'Agent.Name': 'azp-local',
        'Agent.MachineName': backend.kind === 'host' ? os.hostname() : 'azp-local',
        'Agent.Id': '1',
        'Agent.Version': '4.0.0',
        'Agent.JobStatus': 'Succeeded',
        'Agent.WorkFolder': backend.p.dirname(p.workspace),
        'Agent.RootDirectory': backend.p.dirname(p.workspace),
        'Agent.HomeDirectory': backend.p.dirname(p.workspace),
        'Agent.BuildDirectory': p.workspace,
        'Agent.TempDirectory': p.temp,
        'Agent.ToolsDirectory': p.tools,
        'Pipeline.Workspace': p.workspace,
        'Build.SourcesDirectory': p.sources,
        'Build.Repository.LocalPath': p.sources,
        'System.DefaultWorkingDirectory': p.sources,
        'Build.ArtifactStagingDirectory': p.artifacts,
        'Build.StagingDirectory': p.artifacts,
        'Build.BinariesDirectory': p.binaries,
        'System.ArtifactsDirectory': p.artifacts,
        'System.WorkFolder': backend.p.dirname(p.workspace),
        'Common.TestResultsDirectory': backend.p.join(p.workspace, 'TestResults'),
      };
      for (const [name, value] of Object.entries(agent)) bag.set(name, value);
    }

    const ctx: EvalContext = {
      named: {
        variables: variablesContext((name) => bag.get(name)),
        pipeline: { startTime: this.startTime.toISOString() },
        ...(job ? jobContext(stage, job, this.state) : {}),
      } as Record<string, Value>,
      counter: this.settings.counter,
    };
    if (!job) (ctx.named as Record<string, Value>).dependencies = jobContext(stage, { dependsOn: [] } as unknown as Job, this.state).stageDependencies;

    for (const decl of [...plan.pipeline.variables, ...stage.variables, ...(job?.variables ?? [])]) {
      if (decl.group) {
        const group = Object.entries(io.config.variableGroups).find(([name]) => name.toLowerCase() === decl.group!.toLowerCase())?.[1];
        if (!group) {
          unsuppliedGroup = decl.group;
          notes.push(`Variable group '${decl.group}' has no local values. Add it under 'variableGroups:' in .azp-local.yml.`);
          continue;
        }
        for (const [name, entry] of Object.entries(group)) {
          if (!entry.secret) {
            bag.set(name, entry.value ?? '');
            continue;
          }
          // Secrets are only asked for once a job is really starting.
          const value = backend ? await this.secret(name, decl.group) : undefined;
          if (value === undefined) {
            unknownNames.add(name.toLowerCase());
            if (backend) notes.push(`Secret '${name}' of variable group '${decl.group}' was not supplied; $(${name}) is left as written.`);
          } else {
            bag.set(name, value, { secret: true });
          }
        }
      } else {
        let value: string | Unknown = decl.value;
        try {
          value = evalRuntimeValue(decl.value, ctx);
        } catch (err) {
          if (!(err instanceof ExprError)) throw err;
          notes.push(`Variable '${decl.name}': ${err.message}`);
          value = '';
        }
        if (value instanceof Unknown) {
          unknownNames.add(decl.name.toLowerCase());
          notes.push(`Variable '${decl.name}' depends on a value that is not known locally (${value.reason}).`);
        } else {
          bag.set(decl.name, value, { readonly: decl.readonly });
        }
      }
    }
    for (const [name, value] of Object.entries(job?.matrixLeg?.variables ?? {})) bag.set(name, value);
    // Values given for this run win over what the YAML declares, as queue-time variables do.
    for (const [name, value] of Object.entries({ ...io.config.variables, ...plan.variables })) bag.set(name, value);

    return {
      bag,
      notes,
      unknown: unsuppliedGroup ? new Unknown(`it may come from variable group '${unsuppliedGroup}', which has no local values`) : unknownNames,
    };
  }
}

/** How a variable reads in a condition: its value, Unknown when it cannot be known locally, undefined when simply not set. */
function lookup(bag: VariableBag, unknown: Unknown | Set<string>): (name: string) => string | Unknown | undefined {
  return (name) => {
    const value = bag.get(name);
    if (value !== undefined) return value;
    if (unknown instanceof Unknown) return unknown;
    return unknown.has(name.toLowerCase()) ? new Unknown(`secret '${name}' was not supplied`) : undefined;
  };
}

interface PostStep {
  displayName: string;
  run: (ctx: StepContext) => Promise<StepOutcome>;
}

class JobRunner {
  private readonly job: Job;
  private backend!: JobBackend;
  private bag = new VariableBag();
  private unknown: Unknown | Set<string> = new Set();
  private status: Status = 'Succeeded';
  private hasGaps = false;
  private canceled = false;
  private readonly outputs: Record<string, string> = {};
  private readonly prepended: string[] = [];
  private readonly postSteps: PostStep[] = [];
  private readonly jobAbort = new AbortController();
  /** Uploads started by logging commands; awaited before the step ends. */
  private pending: Promise<void>[] = [];
  private completed?: { result: StepResult; message?: string };
  private failure?: string;

  constructor(
    private readonly run: Run,
    private readonly pj: PlannedJob,
    private readonly stage: Stage,
  ) {
    this.job = pj.job;
    run.cancelSignal.signal.addEventListener('abort', () => this.jobAbort.abort(), { once: true });
  }

  private log(stepId: string, line: string, stream: 'out' | 'err' = 'out'): void {
    this.run.emit({ type: 'log', jobId: this.job.id, stepId, line: maskSecrets(line, [...this.run.secrets]), stream, at: Date.now() });
  }

  private issue(stepId: string, severity: 'error' | 'warning', message: string, source?: { file: string; line: number; column: number }): void {
    const masked = maskSecrets(message, [...this.run.secrets]);
    this.run.emit({ type: 'issue', jobId: this.job.id, stepId, severity, message: masked, source });
    this.log(stepId, `##[${severity}]${message}`);
  }

  private setStatus(next: Status): void {
    if (this.status === 'Failed' || this.status === 'Canceled') return;
    this.status = next;
    this.bag.set('Agent.JobStatus', next);
  }

  private async initialize(image: string | undefined): Promise<void> {
    const { run, job } = this;
    const settings = run.settings;
    if (image) {
      const docker = await run.docker();
      this.backend = new ContainerBackend({
        docker,
        image,
        runId: run.io.runId,
        jobId: job.id,
        services: job.services,
        env: job.container?.env,
        mountWorkspace: run.io.config.workspace === 'mount' ? run.io.workspaceRoot : undefined,
        dockerSocket: run.io.config.dockerSocket,
        matchHostedHardware: settings.matchHostedHardware,
        ensureImage: run.ensureImage,
      });
    } else {
      this.backend = new HostBackend(settings.hostScratchDir, path.join(settings.homeDir, 'tools'), `${safe(run.io.runId)}-${crypto.randomBytes(2).toString('hex')}`);
      if (Object.keys(job.services).length > 0) this.issue('__init', 'warning', 'Service containers are not started in host mode.');
    }
    await this.backend.prepare((line) => this.log('__init', line));
    const { bag, unknown, notes } = await run.variables(this.stage, job, this.backend);
    this.bag = bag;
    this.unknown = unknown;
    this.log('__init', `Job: ${job.displayName}`);
    this.log('__init', `Pool: ${job.pool.label || '(default)'} -> ${this.backend.label}`);
    this.log('__init', `Agent.OS ${this.backend.os} ${this.backend.arch}, sources at ${this.backend.paths.sources}`);
    for (const note of notes) this.issue('__init', 'warning', note);
  }

  async execute(image: string | undefined): Promise<{ result: JobResult; message?: string; outputs: Record<string, string>; shell?: string }> {
    const { run, job } = this;
    run.emit({ type: 'step.started', jobId: job.id, stepId: '__init', displayName: 'Initialize job', at: Date.now() });
    try {
      await this.initialize(image);
      run.emit({ type: 'step.finished', jobId: job.id, stepId: '__init', result: 'succeeded', at: Date.now() });
    } catch (err) {
      const message = (err as Error).message;
      this.issue('__init', 'error', message);
      run.emit({ type: 'step.finished', jobId: job.id, stepId: '__init', result: 'failed', message: message.split(/\r?\n/)[0], at: Date.now() });
      await this.backend?.dispose(false).catch(() => undefined);
      return { result: 'failed', message: `Could not start the job: ${message.split('\n')[0]}`, outputs: {} };
    }

    let timer: NodeJS.Timeout | undefined;
    if (job.timeoutInMinutes && job.timeoutInMinutes > 0) {
      timer = setTimeout(() => {
        this.canceled = true;
        this.failure = `The job ran longer than its timeout of ${job.timeoutInMinutes} minute(s).`;
        this.jobAbort.abort();
      }, job.timeoutInMinutes * 60_000);
    }

    let stopped = false;
    for (const step of job.steps) {
      if (stopped) {
        run.emit({ type: 'step.finished', jobId: job.id, stepId: step.id, result: 'skipped', message: 'Comes after the step that was selected to run.', at: Date.now() });
        continue;
      }
      await this.runStep(step.id, step, (ctx) => this.invoke(ctx, step.run));
      if (this.pj.untilStepId === step.id) stopped = true;
    }
    if (!stopped) {
      const posts = [...this.postSteps].reverse();
      for (const [index, post] of posts.entries()) {
        const synthetic: Step = { ...job.steps[0], id: `__post${index + 1}`, displayName: post.displayName, condition: 'always()', env: {}, enabled: true, continueOnError: false, timeoutInMinutes: undefined, retryCount: undefined };
        await this.runStep(synthetic.id, synthetic, post.run, post.displayName);
      }
    }
    if (timer) clearTimeout(timer);

    const wasCanceled = this.canceled || run.state.canceled;
    const failed = this.status === 'Failed';
    const keep = failed && !wasCanceled && run.settings.keepContainersOnFailure;
    const shell = await this.backend.dispose(keep).catch(() => undefined);

    let result: JobResult;
    if (wasCanceled) result = 'canceled';
    else if (failed) result = job.continueOnError ? 'succeededWithIssues' : 'failed';
    else if (this.hasGaps) result = 'succeededWithGaps';
    else result = this.status === 'SucceededWithIssues' ? 'succeededWithIssues' : 'succeeded';
    return { result, message: this.failure, outputs: this.outputs, shell };
  }

  private async runStep(stepId: string, step: Step, body: (ctx: StepContext) => Promise<StepOutcome>, syntheticName?: string): Promise<void> {
    const { run, job } = this;
    const finish = (result: StepResult, message?: string) => run.emit({ type: 'step.finished', jobId: job.id, stepId, result, message, at: Date.now() });
    if (!step.enabled) return finish('skipped', 'The step is disabled (enabled: false).');

    const canceled = this.canceled || run.state.canceled;
    let proceed: boolean;
    try {
      const verdict = evalStepCondition(step.condition, this.status, variablesContext(lookup(this.bag, this.unknown)), canceled);
      proceed =
        verdict instanceof Unknown
          ? await run.io.confirm(`Step '${step.displayName}' of ${job.displayName} has the condition '${step.condition}', which depends on a value that is not known locally (${verdict.reason}). Run it anyway?`)
          : verdict;
    } catch (err) {
      if (!(err instanceof ExprError)) throw err;
      run.emit({ type: 'step.started', jobId: job.id, stepId, displayName: syntheticName, at: Date.now() });
      this.issue(stepId, 'error', `The condition '${step.condition}' could not be evaluated: ${err.message}`);
      this.setStatus('Failed');
      this.failure ??= `Step '${step.displayName}' has a condition that could not be evaluated.`;
      return finish('failed', err.message);
    }
    if (!proceed) {
      if (canceled) return finish('canceled', 'The run was canceled.');
      const reason = succeededSoFar(this.status) ? `Its condition was false: ${step.condition}` : `An earlier step failed and its condition is ${step.condition}`;
      return finish('skipped', reason);
    }

    run.emit({ type: 'step.started', jobId: job.id, stepId, displayName: syntheticName, at: Date.now() });
    const attempts = 1 + Math.max(0, step.retryCount ?? 0);
    let outcome: StepOutcome = { result: 'failed' };
    for (let attempt = 1; attempt <= attempts; attempt++) {
      outcome = await this.attempt(stepId, step, body);
      if (outcome.result !== 'failed' || attempt === attempts || this.jobAbort.signal.aborted) break;
      this.log(stepId, `##[warning]The step failed; retrying (attempt ${attempt + 1} of ${attempts}).`);
    }

    if (outcome.gap) {
      this.hasGaps = true;
      run.gaps.push(`${job.displayName} / ${step.displayName}: ${outcome.gap}.`);
    }
    switch (outcome.result) {
      case 'failed':
        if (outcome.message) this.issue(stepId, 'error', outcome.message);
        if (step.continueOnError) {
          this.setStatus('SucceededWithIssues');
          return finish('succeededWithIssues', `${outcome.message ?? 'Failed'} (continueOnError)`);
        }
        this.setStatus('Failed');
        this.failure ??= `Step '${step.displayName}' failed.`;
        return finish('failed', outcome.message);
      case 'unsupported':
        // D6: a step that could not run is never counted as passed.
        this.hasGaps = true;
        if (!outcome.gap) run.gaps.push(`${job.displayName} / ${step.displayName}: not run. ${outcome.message ?? ''}`.trim());
        if (outcome.message) this.issue(stepId, 'warning', outcome.message);
        return finish('unsupported', outcome.message);
      case 'succeededWithIssues':
        this.setStatus('SucceededWithIssues');
        return finish('succeededWithIssues', outcome.message);
      case 'canceled':
        return finish('canceled', outcome.message);
      default:
        return finish(outcome.result, outcome.message);
    }
  }

  private async attempt(stepId: string, step: Step, body: (ctx: StepContext) => Promise<StepOutcome>): Promise<StepOutcome> {
    const stepAbort = new AbortController();
    const onJobAbort = () => stepAbort.abort();
    this.jobAbort.signal.addEventListener('abort', onJobAbort, { once: true });
    let timedOut = false;
    const timer =
      step.timeoutInMinutes && step.timeoutInMinutes > 0
        ? setTimeout(() => {
            timedOut = true;
            stepAbort.abort();
          }, step.timeoutInMinutes * 60_000)
        : undefined;

    this.completed = undefined;
    this.pending = [];
    let outcome: StepOutcome;
    try {
      outcome = await body(this.context(stepId, step, stepAbort.signal));
      await Promise.all(this.pending);
    } catch (err) {
      outcome = { result: 'failed', message: (err as Error).message };
    } finally {
      if (timer) clearTimeout(timer);
      this.jobAbort.signal.removeEventListener('abort', onJobAbort);
    }

    if (timedOut) return { result: 'failed', message: `The step timed out after ${step.timeoutInMinutes} minute(s).` };
    if (stepAbort.signal.aborted) return { result: 'canceled', message: 'The step was stopped because the run was canceled.' };
    // `task.complete` can turn a clean exit into a failure, or into a pass with issues.
    const completed = this.completed as { result: StepResult; message?: string } | undefined;
    if (outcome.result === 'succeeded' && completed) {
      outcome = { ...outcome, result: completed.result, message: completed.result === 'succeeded' ? outcome.message : completed.message };
    }
    return outcome;
  }

  private invoke(ctx: StepContext, stepRun: StepRun): Promise<StepOutcome> {
    switch (stepRun.kind) {
      case 'script':
        return runScript(ctx, stepRun.shell, ctx.expand(stepRun.script), { cwd: ctx.step.workingDirectory && ctx.expand(ctx.step.workingDirectory), failOnStderr: ctx.step.failOnStderr });
      case 'checkout':
        return checkout(ctx, stepRun.repository);
      case 'download':
        return download(ctx, { source: stepRun.source, artifact: ctx.expand(stepRun.artifact), patterns: stepRun.patterns, shortcut: true });
      case 'publish':
        return publish(ctx, ctx.expand(stepRun.path), ctx.expand(stepRun.artifact));
      case 'task':
        return this.invokeTask(ctx, stepRun);
    }
  }

  private async invokeTask(ctx: StepContext, task: Extract<StepRun, { kind: 'task' }>): Promise<StepOutcome> {
    const label = task.version ? `${task.name}@${task.version}` : task.name;
    switch (task.override?.action) {
      case 'skip':
        ctx.log(`${label} is skipped locally, as .azp-local.yml says.`);
        return { result: 'skipped', message: 'Skipped by .azp-local.yml.', gap: `${label} was skipped by .azp-local.yml` };
      case 'fail':
        return { result: 'failed', message: `${label} is set to fail locally in .azp-local.yml.` };
      case 'script':
        return runReplacementScript(ctx, task.override.script, label);
      case 'path':
        return runTaskFromFolder(ctx, task.override.path);
    }
    const p = ctx.backend.paths;
    switch (task.name.toLowerCase()) {
      case 'cmdline':
        return runScriptTask(ctx, 'cmdline');
      case 'bash':
        return runScriptTask(ctx, 'bash');
      case 'powershell':
        return runScriptTask(ctx, 'powershell');
      case 'usenode':
      case 'nodetool':
        return useNode(ctx);
      case 'cache':
        return cache(ctx);
      case 'publishpipelineartifact':
        return publish(ctx, ctx.input('targetPath', 'path') ?? p.workspace, ctx.input('artifact', 'artifactName') ?? '');
      case 'publishbuildartifacts':
        return publish(ctx, ctx.input('PathtoPublish') ?? p.artifacts, ctx.input('ArtifactName') ?? 'drop');
      case 'downloadpipelineartifact':
        return download(ctx, {
          source: (ctx.input('buildType', 'source') ?? 'current').toLowerCase() === 'specific' ? 'another pipeline' : 'current',
          artifact: ctx.input('artifact', 'artifactName') ?? '',
          targetPath: ctx.input('targetPath', 'path', 'downloadPath'),
          patterns: ctx.input('patterns', 'itemPattern'),
          shortcut: false,
        });
      case 'downloadbuildartifacts':
        return download(ctx, {
          source: (ctx.input('buildType') ?? 'current').toLowerCase() === 'specific' ? 'another pipeline' : 'current',
          artifact: ctx.input('artifactName') ?? '',
          targetPath: ctx.input('downloadPath') ?? p.artifacts,
          patterns: ctx.input('itemPattern'),
          shortcut: true,
        });
      case 'publishtestresults':
        return publishTestResults(ctx);
      case 'publishcodecoverageresults':
        return publishCoverage(ctx);
    }
    if (task.tier === 2) {
      return {
        result: 'unsupported',
        message: `The task package for ${label} is not available locally. Map a folder that holds its task.json under 'tasks:' in .azp-local.yml ({ path: ... }), or choose skip, fail or a replacement script.`,
      };
    }
    return { result: 'unsupported', message: `${label} cannot run locally. ${task.tierReason}` };
  }

  private context(stepId: string, step: Step, signal: AbortSignal): StepContext {
    const { run, job, backend } = this;
    const bag = this.bag;
    const rawInputs = step.run.kind === 'task' ? step.run.inputs : {};
    const inputs = Object.fromEntries(Object.entries(rawInputs).map(([name, value]) => [name, bag.expand(value)]));
    const artifactDirs = (): string[] => {
      const reused = [...new Set(run.plan.jobs.flatMap((pj) => (pj.action === 'reuse' && pj.reused ? [pj.reused.runId] : [])))];
      return [run.io.runDir, ...reused.map((id) => run.io.resolveRunDir(id))].map((dir) => path.join(dir, 'artifacts'));
    };

    const ctx: StepContext = {
      job,
      step,
      backend,
      vars: bag,
      io: run.io,
      plan: run.plan,
      settings: run.settings,
      signal,
      inputs,
      input: (name, ...aliases) => {
        const wanted = [name, ...aliases].map((n) => n.toLowerCase());
        for (const want of wanted) {
          const key = Object.keys(inputs).find((k) => k.toLowerCase() === want);
          if (key !== undefined && inputs[key] !== '') return inputs[key];
        }
        return undefined;
      },
      boolInput: (name, fallback) => {
        const value = ctx.input(name)?.toLowerCase();
        return value === 'true' ? true : value === 'false' ? false : fallback;
      },
      expand: (text) => bag.expand(text),
      resolve: (target, base = backend.paths.sources) => backend.p.resolve(base, target),
      log: (line) => this.log(stepId, line),
      warn: (message) => this.issue(stepId, 'warning', message),
      error: (message) => this.issue(stepId, 'error', message),
      emit: (event) => run.emit(event),
      exec: (cmd, opts = {}) => this.exec(stepId, step, cmd, signal, opts),
      setVariable: (name, value, flags = {}) => this.setVariable(stepId, step, name, value, flags),
      prependPath: (dir) => {
        this.prepended.unshift(dir);
      },
      addPostStep: (displayName, runPost) => {
        this.postSteps.push({ displayName, run: runPost });
      },
      jobStatus: () => this.status,
      findArtifact: (name) =>
        artifactDirs()
          .map((dir) => artifactPath(dir, name))
          .find((dir): dir is string => !!dir && fs.existsSync(dir)),
      listArtifacts: () => {
        const names = new Set<string>();
        for (const dir of artifactDirs()) {
          try {
            fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => entry.isDirectory() && names.add(entry.name));
          } catch {
            /* no artifacts in that run */
          }
        }
        return [...names];
      },
    };
    return ctx;
  }

  private environment(step: Step, extra: Record<string, string> = {}): Record<string, string> {
    const { backend, bag } = this;
    const env: Record<string, string> = backend.kind === 'host' ? { ...(process.env as Record<string, string>) } : {};
    const set = (name: string, value: string) => {
      // Windows environment names are case-insensitive: replace `Path` rather than add `PATH` beside it.
      if (backend.os === 'Windows_NT') for (const key of Object.keys(env)) if (key.toLowerCase() === name.toLowerCase()) delete env[key];
      env[name] = value;
    };
    for (const [name, value] of Object.entries(bag.toEnv())) set(name, value);
    for (const [name, value] of Object.entries(step.env)) set(name, bag.expand(value));
    for (const [name, value] of Object.entries(extra)) set(name, value);
    set('PATH', [...this.prepended, backend.basePath].join(backend.pathDelimiter));
    return env;
  }

  private async exec(stepId: string, step: Step, cmd: string[], signal: AbortSignal, opts: { cwd?: string; env?: Record<string, string>; verbatim?: boolean }): Promise<ExecResult> {
    let sawStderr = false;
    const out = new LineSplitter((line) => this.line(stepId, step, line, 'out'));
    const err = new LineSplitter((line) => {
      sawStderr = true;
      this.line(stepId, step, line, 'err');
    });
    const code = await this.backend.exec({
      cmd,
      env: this.environment(step, opts.env),
      cwd: opts.cwd ?? this.backend.paths.sources,
      onOut: (chunk) => out.push(chunk),
      onErr: (chunk) => err.push(chunk),
      signal,
      verbatim: opts.verbatim,
    });
    out.flush();
    err.flush();
    return { code, sawStderr };
  }

  private line(stepId: string, step: Step, line: string, stream: 'out' | 'err'): void {
    const command = parseLoggingCommand(line);
    if (command) {
      try {
        this.command(stepId, step, command);
      } catch (err) {
        this.issue(stepId, 'warning', `Logging command ${command.area}.${command.action} failed: ${(err as Error).message}`);
      }
    }
    this.log(stepId, line, stream);
  }

  private setVariable(stepId: string, step: Step, name: string, value: string, flags: { isOutput?: boolean; isSecret?: boolean; isReadOnly?: boolean }): void {
    if (!name) return;
    if (this.bag.entry(name)?.readonly) {
      this.issue(stepId, 'warning', `Variable '${name}' is read-only and was not changed.`);
      return;
    }
    if (flags.isSecret && value) this.run.secrets.add(value);
    if (flags.isOutput) {
      const key = `${step.refName ?? step.id}.${name}`;
      this.bag.set(key, value, { secret: flags.isSecret });
      // Outputs are written to the run store for later jobs and runs, so secrets are kept out of them.
      if (flags.isSecret) this.issue(stepId, 'warning', `Secret output variable '${key}' is available in this job only; it is not stored for other jobs.`);
      else this.outputs[key] = value;
    } else {
      this.bag.set(name, value, { secret: flags.isSecret, readonly: flags.isReadOnly });
    }
    this.run.emit({ type: 'variable.set', jobId: this.job.id, stepId, name, isOutput: !!flags.isOutput, isSecret: !!flags.isSecret });
  }

  /** Maps a path a step reports (inside the job) back to the file in the workspace. */
  private workspaceFile(reported: string | undefined): string | undefined {
    if (!reported) return undefined;
    const { p, paths } = this.backend;
    const absolute = p.isAbsolute(reported) ? reported : p.join(paths.sources, reported);
    const relative = p.relative(paths.sources, absolute);
    if (relative.startsWith('..')) return undefined;
    return path.join(this.run.io.workspaceRoot, ...relative.split(/[\\/]/));
  }

  private command(stepId: string, step: Step, command: LoggingCommand): void {
    const { run, job, backend } = this;
    const prop = command.properties;
    const flag = (name: string) => (prop[name] ?? '').toLowerCase() === 'true';
    const key = `${command.area}.${command.action}`;
    switch (key) {
      case 'task.setvariable':
        return this.setVariable(stepId, step, prop.variable ?? '', command.data, { isOutput: flag('isoutput'), isSecret: flag('issecret'), isReadOnly: flag('isreadonly') });
      case 'task.setsecret':
        if (command.data) run.secrets.add(command.data);
        return;
      case 'task.prependpath':
        if (command.data.trim()) this.prepended.unshift(command.data.trim());
        return;
      case 'task.logissue':
      case 'task.issue': {
        const file = this.workspaceFile(prop.sourcepath);
        run.emit({
          type: 'issue',
          jobId: job.id,
          stepId,
          severity: (prop.type ?? 'error').toLowerCase() === 'warning' ? 'warning' : 'error',
          message: maskSecrets(command.data, [...run.secrets]),
          source: file ? { file, line: Number(prop.linenumber) || 1, column: Number(prop.columnnumber) || 1 } : undefined,
        });
        return;
      }
      case 'task.complete': {
        const result = (prop.result ?? 'Succeeded').toLowerCase();
        this.completed = {
          result: result === 'failed' ? 'failed' : result === 'succeededwithissues' ? 'succeededWithIssues' : result === 'skipped' ? 'skipped' : 'succeeded',
          message: command.data || undefined,
        };
        return;
      }
      case 'task.uploadsummary':
      case 'task.addattachment': {
        if (key === 'task.addattachment' && (prop.type ?? '').toLowerCase() !== 'distributedtask.core.summary') return;
        const source = command.data.trim();
        const name = prop.name ?? backend.p.basename(source);
        const dir = path.join(run.io.runDir, 'summaries', safe(job.id));
        this.pending.push(
          backend.readFile(backend.p.resolve(backend.paths.sources, source)).then((content) => {
            if (!content) return this.issue(stepId, 'warning', `Summary file not found: ${source}`);
            fs.mkdirSync(dir, { recursive: true });
            const file = path.join(dir, safe(backend.p.basename(source)));
            fs.writeFileSync(file, content);
            run.emit({ type: 'summary', jobId: job.id, stepId, name, path: file });
          }),
        );
        return;
      }
      case 'artifact.upload': {
        const name = prop.artifactname ?? prop.containerfolder ?? job.name;
        const source = backend.p.resolve(backend.paths.sources, command.data.trim());
        // Any process in the job can print this line, so the name decides nothing outside the run's artifacts folder.
        const dest = artifactPath(path.join(run.io.runDir, 'artifacts'), name);
        if (!dest) return this.issue(stepId, 'error', `artifact.upload was refused: ${artifactNameProblem(name) ?? `artifact name '${name}' is not allowed.`}`);
        this.pending.push(
          backend.copyOut(source, dest).then((copied) => {
            if (!copied) return this.issue(stepId, 'warning', `artifact.upload: path not found: ${source}`);
            run.emit({ type: 'artifact', jobId: job.id, name, path: dest, files: copied.files });
          }),
        );
        return;
      }
      case 'build.updatebuildnumber':
        run.buildNumber = command.data.trim();
        this.bag.set('Build.BuildNumber', run.buildNumber);
        run.emit({ type: 'buildNumber', value: run.buildNumber });
        return;
      case 'task.setprogress':
      case 'task.debug':
      case 'task.settaskvariable':
      case 'task.uploadfile':
      case 'task.setendpoint':
      case 'build.addbuildtag':
      case 'build.uploadlog':
      case 'release.updatereleasename':
        return; // accepted; nothing to do locally
      default:
        this.log(stepId, `##[warning]Logging command '${key}' is not supported locally and was ignored.`);
    }
  }
}
