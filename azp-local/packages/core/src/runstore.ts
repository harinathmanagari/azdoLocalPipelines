// Run store: each run's events and logs on disk, so past runs can be reopened and
// later runs can reuse the outputs of jobs that already passed.
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { History } from './planner';
import type { JobRecord, JobResult, Pipeline, RunEvent, RunPlan, Selection } from './types';

export interface RunMeta {
  runId: string;
  buildId: number;
  buildNumber: string;
  pipelineFile: string;
  pipelineName?: string;
  selection: Selection;
  engine: string;
  startedAt: number;
  finishedAt?: number;
  result?: JobResult;
  gaps?: string[];
}

interface StoreState {
  buildId: number;
  counters: Record<string, number>;
  revisions: Record<string, number>;
}

const safe = (name: string) => name.replace(/[^A-Za-z0-9._-]/g, '_');

export class RunStore implements History {
  constructor(readonly root: string) {}

  private get runsDir(): string {
    return path.join(this.root, 'runs');
  }

  /** Folder for Cache@2 entries, scoped to this store (one workspace). */
  get cacheDir(): string {
    return path.join(this.root, 'cache');
  }

  runDir(runId: string): string {
    return path.join(this.runsDir, safe(runId));
  }

  stepLogPath(runId: string, jobId: string, stepId: string): string {
    return path.join(this.runDir(runId), 'logs', safe(jobId), `${safe(stepId)}.log`);
  }

  // --- counters ----------------------------------------------------------------

  private readState(): StoreState {
    try {
      return { buildId: 0, counters: {}, revisions: {}, ...JSON.parse(fs.readFileSync(path.join(this.root, 'state.json'), 'utf8')) };
    } catch {
      return { buildId: 0, counters: {}, revisions: {} };
    }
  }

  private writeState(state: StoreState): void {
    fs.mkdirSync(this.root, { recursive: true });
    fs.writeFileSync(path.join(this.root, 'state.json'), JSON.stringify(state, null, 2));
  }

  nextBuildId(): number {
    const state = this.readState();
    state.buildId += 1;
    this.writeState(state);
    return state.buildId;
  }

  /** `counter(prefix, seed)`: starts at the seed and goes up by one each time it is evaluated for a prefix. */
  counter(prefix: string, seed: number): number {
    const state = this.readState();
    const next = prefix in state.counters ? state.counters[prefix] + 1 : seed;
    state.counters[prefix] = next;
    this.writeState(state);
    return next;
  }

  /** `$(Rev:r)`: one more than the last run whose build number had the same base. */
  revision(base: string): number {
    const state = this.readState();
    const next = (state.revisions[base] ?? 0) + 1;
    state.revisions[base] = next;
    this.writeState(state);
    return next;
  }

  // --- writing -----------------------------------------------------------------

  createRun(plan: RunPlan, engine: string): { runId: string; runDir: string } {
    const runId = `run-${String(plan.buildId).padStart(4, '0')}`;
    const dir = this.runDir(runId);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const meta: RunMeta = {
      runId,
      buildId: plan.buildId,
      buildNumber: plan.buildNumber,
      pipelineFile: plan.pipeline.file,
      pipelineName: plan.pipeline.name,
      selection: plan.selection,
      engine,
      startedAt: Date.now(),
    };
    fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify(meta, null, 2));
    fs.writeFileSync(path.join(dir, 'pipeline.json'), JSON.stringify(plan.pipeline));
    fs.writeFileSync(
      path.join(dir, 'plan.json'),
      JSON.stringify(plan.jobs.map((j) => ({ jobId: j.job.id, action: j.action, reason: j.reason, reusedFrom: j.reused?.runId }))),
    );
    fs.writeFileSync(path.join(dir, 'jobs.json'), '{}');
    return { runId, runDir: dir };
  }

  append(runId: string, event: RunEvent): void {
    const dir = this.runDir(runId);
    if (event.type === 'log') {
      const file = this.stepLogPath(runId, event.jobId, event.stepId);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, `${new Date(event.at).toISOString()} ${event.line}\n`);
      return; // log lines live in per-step files, not in the event list
    }
    fs.appendFileSync(path.join(dir, 'events.jsonl'), `${JSON.stringify(event)}\n`);
    if (event.type === 'job.finished') {
      const records = this.readJobs(runId);
      // A reused job keeps pointing at the run where it actually executed.
      const origin = this.readPlan(runId).find((p) => p.jobId === event.jobId)?.reusedFrom ?? runId;
      records[event.jobId] = { runId: origin, jobId: event.jobId, result: event.result, outputs: event.outputs ?? {} };
      fs.writeFileSync(path.join(dir, 'jobs.json'), JSON.stringify(records, null, 2));
    } else if (event.type === 'buildNumber') {
      this.updateMeta(runId, { buildNumber: event.value });
    } else if (event.type === 'run.finished') {
      this.updateMeta(runId, { finishedAt: event.at, result: event.result, gaps: event.gaps });
    }
  }

  private updateMeta(runId: string, patch: Partial<RunMeta>): void {
    const meta = this.readMeta(runId);
    if (meta) fs.writeFileSync(path.join(this.runDir(runId), 'run.json'), JSON.stringify({ ...meta, ...patch }, null, 2));
  }

  // --- reading -----------------------------------------------------------------

  readMeta(runId: string): RunMeta | undefined {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.runDir(runId), 'run.json'), 'utf8')) as RunMeta;
    } catch {
      return undefined;
    }
  }

  readPipeline(runId: string): Pipeline | undefined {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.runDir(runId), 'pipeline.json'), 'utf8')) as Pipeline;
    } catch {
      return undefined;
    }
  }

  readPlan(runId: string): { jobId: string; action: 'run' | 'reuse' | 'omit'; reason: string; reusedFrom?: string }[] {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.runDir(runId), 'plan.json'), 'utf8'));
    } catch {
      return [];
    }
  }

  private readJobs(runId: string): Record<string, JobRecord> {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.runDir(runId), 'jobs.json'), 'utf8')) as Record<string, JobRecord>;
    } catch {
      return {};
    }
  }

  readEvents(runId: string): RunEvent[] {
    try {
      return fs
        .readFileSync(path.join(this.runDir(runId), 'events.jsonl'), 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as RunEvent);
    } catch {
      return [];
    }
  }

  readStepLog(runId: string, jobId: string, stepId: string): string {
    try {
      return fs.readFileSync(this.stepLogPath(runId, jobId, stepId), 'utf8');
    } catch {
      return '';
    }
  }

  /** Newest first. */
  listRuns(): RunMeta[] {
    let names: string[];
    try {
      names = fs.readdirSync(this.runsDir);
    } catch {
      return [];
    }
    return names
      .map((name) => this.readMeta(name))
      .filter((meta): meta is RunMeta => !!meta)
      .sort((a, b) => b.startedAt - a.startedAt);
  }

  lastSuccessful(pipelineFile: string, jobId: string): JobRecord | undefined {
    for (const meta of this.listRuns()) {
      if (path.resolve(meta.pipelineFile) !== path.resolve(pipelineFile)) continue;
      const record = this.readJobs(meta.runId)[jobId];
      // Only a run where the job really executed counts; reused records point elsewhere.
      if (record && record.runId === meta.runId && ['succeeded', 'succeededWithIssues', 'succeededWithGaps'].includes(record.result)) {
        return record;
      }
    }
    return undefined;
  }

  fromRun(runId: string, jobId: string): JobRecord | undefined {
    return this.readJobs(runId)[jobId];
  }

  deleteRun(runId: string): void {
    fs.rmSync(this.runDir(runId), { recursive: true, force: true });
  }

  /** Keeps the newest `keep` runs. Returns how many were removed. */
  prune(keep: number): number {
    const old = this.listRuns().slice(keep);
    old.forEach((meta) => this.deleteRun(meta.runId));
    return old.length;
  }

  sizeBytes(): number {
    const walk = (dir: string): number => {
      let total = 0;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return 0;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) total += walk(full);
        else {
          try {
            total += fs.statSync(full).size;
          } catch {
            /* removed while walking */
          }
        }
      }
      return total;
    };
    return walk(this.root);
  }
}
