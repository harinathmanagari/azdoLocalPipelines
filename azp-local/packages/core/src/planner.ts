// Turns the model and a selection ("this job", "from this stage") into a plan: which
// jobs run, which reuse an earlier result, and which are left out.
import { statusOf } from './conditions';
import type { Job, JobRecord, Pipeline, PlannedJob, RunPlan, Selection, Stage } from './types';

export interface History {
  /** The most recent run in which this job actually executed and passed. */
  lastSuccessful(pipelineFile: string, jobId: string): JobRecord | undefined;
  /** The record of a job in one particular run. */
  fromRun(runId: string, jobId: string): JobRecord | undefined;
}

export interface PlanOptions {
  history?: History;
  variables?: Record<string, string>;
  buildId: number;
  buildNumber: string;
}

const passed = (record: JobRecord | undefined) => {
  const status = record && statusOf(record.result);
  return status === 'Succeeded' || status === 'SucceededWithIssues';
};

function upstreamStages(pipeline: Pipeline, stage: Stage, into = new Set<string>()): Set<string> {
  for (const dep of stage.dependsOn) {
    if (into.has(dep)) continue;
    into.add(dep);
    const upstream = pipeline.stages.find((s) => s.id === dep);
    if (upstream) upstreamStages(pipeline, upstream, into);
  }
  return into;
}

function downstreamStages(pipeline: Pipeline, stageId: string): Set<string> {
  const out = new Set<string>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const stage of pipeline.stages) {
      if (!out.has(stage.id) && stage.dependsOn.some((dep) => dep === stageId || out.has(dep))) {
        out.add(stage.id);
        grew = true;
      }
    }
  }
  return out;
}

/** Matches a job id, or the id without its matrix leg (meaning every leg). */
export function matchesJob(job: Job, wanted: string): boolean {
  return job.id === wanted || `${job.stageId}.${job.name}` === wanted;
}

export function createPlan(pipeline: Pipeline, selection: Selection, opts: PlanOptions): RunPlan {
  const all = pipeline.stages.flatMap((stage) => stage.jobs);
  const stageOf = (job: Job) => pipeline.stages.find((s) => s.id === job.stageId)!;
  const selected = new Set<string>();
  const reuse = new Map<string, JobRecord>();
  let untilStepId: string | undefined;

  switch (selection.kind) {
    case 'pipeline':
      all.forEach((job) => selected.add(job.id));
      break;
    case 'stage': {
      const stages = new Set([selection.stageId, ...(selection.andLater ? downstreamStages(pipeline, selection.stageId) : [])]);
      all.filter((job) => stages.has(job.stageId)).forEach((job) => selected.add(job.id));
      break;
    }
    case 'job':
      all.filter((job) => matchesJob(job, selection.jobId)).forEach((job) => selected.add(job.id));
      break;
    case 'step':
      all.filter((job) => matchesJob(job, selection.jobId)).forEach((job) => selected.add(job.id));
      untilStepId = selection.stepId;
      break;
    case 'failed':
      for (const job of all) {
        const record = opts.history?.fromRun(selection.runId, job.id);
        if (passed(record)) reuse.set(job.id, record!);
        else selected.add(job.id);
      }
      break;
  }

  // Everything the selection depends on: jobs it names in dependsOn, and every job of an upstream stage.
  const needed = new Set<string>();
  const visit = (job: Job) => {
    const stage = stageOf(job);
    for (const dep of job.dependsOn) {
      for (const other of stage.jobs.filter((j) => j.name === dep)) {
        if (!selected.has(other.id) && !needed.has(other.id)) {
          needed.add(other.id);
          visit(other);
        }
      }
    }
    for (const upstream of upstreamStages(pipeline, stage)) {
      for (const other of all.filter((j) => j.stageId === upstream)) {
        if (!selected.has(other.id) && !needed.has(other.id)) needed.add(other.id);
      }
    }
  };
  all.filter((job) => selected.has(job.id)).forEach(visit);

  const jobs: PlannedJob[] = all.map((job): PlannedJob => {
    if (selected.has(job.id)) {
      return { job, action: 'run', reason: selection.kind === 'failed' ? 'did not pass in the earlier run' : 'selected', untilStepId };
    }
    const kept = reuse.get(job.id);
    if (kept) return { job, action: 'reuse', reason: `passed in run ${kept.runId}`, reused: kept };
    if (needed.has(job.id)) {
      const record = opts.history?.lastSuccessful(pipeline.file, job.id);
      if (record) return { job, action: 'reuse', reason: `needed by the selection; result reused from run ${record.runId}`, reused: record };
      return { job, action: 'run', reason: 'needed by the selection; no earlier result to reuse' };
    }
    return { job, action: 'omit', reason: 'not selected' };
  });

  return { pipeline, selection, jobs, variables: opts.variables ?? {}, buildId: opts.buildId, buildNumber: opts.buildNumber };
}

/**
 * A selection from the names a person types: a stage, a job (`job` or `job.leg`),
 * or a step of a job (`job:step`, by id or display name). Throws with the valid names when one is unknown.
 */
export function selectByName(pipeline: Pipeline, names: { stage?: string; fromStage?: string; job?: string; step?: string }): Selection {
  const jobs = pipeline.stages.flatMap((s) => s.jobs);
  const jobId = (name: string): string => {
    if (jobs.some((j) => matchesJob(j, name))) return name;
    const [base, leg] = name.split('.');
    const match = jobs.find((j) => j.name.toLowerCase() === base.toLowerCase() && (!leg || j.matrixLeg?.name.toLowerCase() === leg.toLowerCase()));
    if (!match) throw new Error(`No job named '${name}'. Jobs: ${[...new Set(jobs.map((j) => j.name))].join(', ')}`);
    return leg ? match.id : `${match.stageId}.${match.name}`;
  };
  const stageId = (name: string): string => {
    const match = pipeline.stages.find((s) => s.id.toLowerCase() === name.toLowerCase());
    if (!match) throw new Error(`No stage named '${name}'. Stages: ${pipeline.stages.map((s) => s.id).join(', ')}`);
    return match.id;
  };
  if (names.step) {
    const [jobName, ...rest] = names.step.split(':');
    const id = jobId(jobName);
    const wanted = rest.join(':').toLowerCase();
    const job = jobs.find((j) => matchesJob(j, id))!;
    const step = job.steps.find((s) => s.id.toLowerCase() === wanted || s.displayName.toLowerCase() === wanted);
    if (!step) throw new Error(`No step '${rest.join(':')}' in job ${jobName}. Steps: ${job.steps.map((s) => `${s.id} (${s.displayName})`).join(', ')}`);
    return { kind: 'step', jobId: id, stepId: step.id };
  }
  if (names.job) return { kind: 'job', jobId: jobId(names.job) };
  if (names.stage) return { kind: 'stage', stageId: stageId(names.stage) };
  if (names.fromStage) return { kind: 'stage', stageId: stageId(names.fromStage), andLater: true };
  return { kind: 'pipeline' };
}

export function describeSelection(pipeline: Pipeline, selection: Selection): string {
  const jobName = (id: string) => pipeline.stages.flatMap((s) => s.jobs).find((j) => matchesJob(j, id))?.name ?? id;
  switch (selection.kind) {
    case 'pipeline':
      return 'whole pipeline';
    case 'stage':
      return selection.andLater ? `from stage ${selection.stageId}` : `stage ${selection.stageId}`;
    case 'job':
      return `job ${jobName(selection.jobId)}`;
    case 'step':
      return `job ${jobName(selection.jobId)} up to step ${selection.stepId}`;
    case 'failed':
      return `failed jobs of run ${selection.runId}`;
  }
}
