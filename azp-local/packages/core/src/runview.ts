// Folds the event stream into the state the views draw. Both engines emit the same
// events, so a live run and a run reopened from the store look the same.
import type { CoverageSummary, JobResult, RunEvent, SourceRef, StepResult, TestSummary } from './types';

export type StepState = 'pending' | 'running' | StepResult;
export type JobState = 'pending' | 'running' | 'omitted' | JobResult;

export interface IssueView {
  severity: 'error' | 'warning';
  message: string;
  source?: SourceRef;
}

export interface StepView {
  id: string;
  /** Set for steps the engine adds itself, such as "Initialize job". */
  displayName?: string;
  state: StepState;
  startedAt?: number;
  finishedAt?: number;
  message?: string;
  issues: IssueView[];
}

export interface JobView {
  id: string;
  state: JobState;
  reused: boolean;
  image?: string;
  container?: string;
  startedAt?: number;
  finishedAt?: number;
  message?: string;
  steps: StepView[];
}

export class RunView {
  readonly jobs = new Map<string, JobView>();
  runId?: string;
  startedAt?: number;
  finishedAt?: number;
  result?: JobResult;
  gaps: string[] = [];
  buildNumber?: string;
  readonly tests: { jobId: string; summary: TestSummary }[] = [];
  readonly coverage: { jobId: string; summary: CoverageSummary }[] = [];
  readonly artifacts: { jobId: string; name: string; path: string; files: number }[] = [];
  readonly summaries: { jobId: string; name: string; path: string }[] = [];

  constructor(plan: { jobId: string; action: 'run' | 'reuse' | 'omit' }[] = []) {
    for (const entry of plan) {
      this.jobs.set(entry.jobId, { id: entry.jobId, state: entry.action === 'omit' ? 'omitted' : 'pending', reused: entry.action === 'reuse', steps: [] });
    }
  }

  get running(): boolean {
    return this.startedAt !== undefined && this.finishedAt === undefined;
  }

  job(jobId: string): JobView {
    let job = this.jobs.get(jobId);
    if (!job) {
      job = { id: jobId, state: 'pending', reused: false, steps: [] };
      this.jobs.set(jobId, job);
    }
    return job;
  }

  step(jobId: string, stepId: string): StepView {
    const job = this.job(jobId);
    let step = job.steps.find((s) => s.id === stepId);
    if (!step) {
      step = { id: stepId, state: 'pending', issues: [] };
      job.steps.push(step);
    }
    return step;
  }

  apply(event: RunEvent): void {
    switch (event.type) {
      case 'run.started':
        this.runId = event.runId;
        this.startedAt = event.at;
        break;
      case 'job.started': {
        const job = this.job(event.jobId);
        job.state = 'running';
        job.image = event.image;
        job.startedAt = event.at;
        break;
      }
      case 'step.started': {
        const step = this.step(event.jobId, event.stepId);
        step.state = 'running';
        step.startedAt = event.at;
        if (event.displayName) step.displayName = event.displayName;
        break;
      }
      case 'issue':
        this.step(event.jobId, event.stepId).issues.push({ severity: event.severity, message: event.message, source: event.source });
        break;
      case 'step.finished': {
        const step = this.step(event.jobId, event.stepId);
        step.state = event.result;
        step.finishedAt = event.at;
        step.message = event.message;
        break;
      }
      case 'job.finished': {
        const job = this.job(event.jobId);
        job.state = event.result;
        job.finishedAt = event.at;
        job.message = event.message;
        job.container = event.container;
        break;
      }
      case 'artifact':
        this.artifacts.push({ jobId: event.jobId, name: event.name, path: event.path, files: event.files });
        break;
      case 'summary':
        this.summaries.push({ jobId: event.jobId, name: event.name, path: event.path });
        break;
      case 'tests':
        this.tests.push({ jobId: event.jobId, summary: event.summary });
        break;
      case 'coverage':
        this.coverage.push({ jobId: event.jobId, summary: event.summary });
        break;
      case 'buildNumber':
        this.buildNumber = event.value;
        break;
      case 'run.finished':
        this.finishedAt = event.at;
        this.result = event.result;
        this.gaps = event.gaps;
        break;
      case 'log':
      case 'variable.set':
        break;
    }
  }
}

export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms < 0) return '';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function resultLabel(result: JobState | StepState): string {
  switch (result) {
    case 'succeeded':
      return 'succeeded';
    case 'succeededWithIssues':
      return 'succeeded with issues';
    case 'succeededWithGaps':
      return 'succeeded with gaps';
    case 'failed':
      return 'failed';
    case 'canceled':
      return 'canceled';
    case 'skipped':
      return 'skipped';
    case 'unsupported':
      return 'not run locally';
    case 'running':
      return 'running';
    case 'omitted':
      return 'not selected';
    default:
      return 'pending';
  }
}
