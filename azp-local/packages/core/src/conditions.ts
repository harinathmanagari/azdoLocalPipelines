// Runtime pass: conditions and `$[ ]` expressions, evaluated as the run proceeds
// from the results and output variables of what has already finished.
import { ExprError, Resolver, Unknown, evaluate, toBool, toStr, type EvalContext, type Value } from './expressions';
import { DEFAULT_CONDITION, type Job, type JobResult, type Pipeline, type Stage } from './types';

export type Status = 'Succeeded' | 'SucceededWithIssues' | 'Failed' | 'Canceled' | 'Skipped';

export function statusOf(result: JobResult): Status {
  switch (result) {
    case 'succeeded':
      return 'Succeeded';
    case 'succeededWithIssues':
    case 'succeededWithGaps':
      return 'SucceededWithIssues';
    case 'failed':
      return 'Failed';
    case 'canceled':
      return 'Canceled';
    // A job that could not run locally did not succeed, so what depends on it does not run either.
    case 'skipped':
    case 'unsupported':
      return 'Skipped';
  }
}

const ok = (status: Status | undefined) => status === 'Succeeded' || status === 'SucceededWithIssues';

export function aggregate(statuses: Status[]): Status {
  if (statuses.length === 0) return 'Succeeded';
  if (statuses.includes('Failed')) return 'Failed';
  if (statuses.includes('Canceled')) return 'Canceled';
  if (statuses.every((s) => s === 'Skipped')) return 'Skipped';
  if (statuses.includes('SucceededWithIssues')) return 'SucceededWithIssues';
  return 'Succeeded';
}

export interface JobOutcome {
  result: JobResult;
  outputs: Record<string, string>;
}

/** Results so far in a run. Engines update it; conditions read it. */
export class RunState {
  readonly jobs = new Map<string, JobOutcome>();
  canceled = false;

  constructor(readonly pipeline: Pipeline) {}

  private legs(stageId: string, jobName: string): Job[] {
    const stage = this.pipeline.stages.find((s) => s.id === stageId);
    return stage ? stage.jobs.filter((j) => j.name === jobName) : [];
  }

  /** Status of a job name, combined over its matrix legs. Undefined until every leg has a result. */
  jobStatus(stageId: string, jobName: string): Status | undefined {
    const states = this.legs(stageId, jobName).map((j) => this.jobs.get(j.id));
    if (states.length === 0 || states.some((s) => !s)) return undefined;
    return aggregate(states.map((s) => statusOf(s!.result)));
  }

  stageStatus(stageId: string): Status | undefined {
    const stage = this.pipeline.stages.find((s) => s.id === stageId);
    if (!stage) return undefined;
    const states = stage.jobs.map((j) => this.jobs.get(j.id));
    if (states.some((s) => !s)) return undefined;
    return aggregate(states.map((s) => statusOf(s!.result)));
  }

  /** Output variables of a job name: `step.var`, or `leg.step.var` for a matrix. */
  jobOutputs(stageId: string, jobName: string): { [key: string]: Value } {
    const out: { [key: string]: Value } = {};
    for (const job of this.legs(stageId, jobName)) {
      for (const [key, value] of Object.entries(this.jobs.get(job.id)?.outputs ?? {})) {
        out[job.matrixLeg ? `${job.matrixLeg.name}.${key}` : key] = value;
        if (job.kind === 'deployment') out[`${job.name}.${key}`] = value;
      }
    }
    return out;
  }
}

/** The `variables` context. `missing` decides what an undefined variable reads as. */
export function variablesContext(get: (name: string) => string | Unknown | undefined, missing: 'null' | 'unknown' = 'null'): Resolver {
  return new Resolver((name) => {
    const value = get(name);
    if (value === undefined) return missing === 'null' ? null : new Unknown(`variable '${name}' is not known before the run`);
    return value;
  });
}

function transitiveDeps(stage: Stage, job: Job): string[] {
  const seen = new Set<string>();
  const visit = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    for (const dep of stage.jobs.find((j) => j.name === name)?.dependsOn ?? []) visit(dep);
  };
  job.dependsOn.forEach(visit);
  return [...seen];
}

function statusFunctions(resolve: (name: string) => Status | undefined, all: string[], canceled: boolean): EvalContext['functions'] {
  const pick = (args: Value[]) => (args.length ? args.map((a) => toStr(a)) : all).map(resolve);
  return {
    succeeded: (args) => pick(args).every(ok),
    failed: (args) => pick(args).some((s) => s === 'Failed'),
    succeededOrFailed: (args) => pick(args).every((s) => ok(s) || s === 'Failed'),
    always: () => true,
    canceled: () => canceled,
  };
}

function toVerdict(value: Value): boolean | Unknown {
  return value instanceof Unknown ? value : toBool(value);
}

function stageDependencies(stage: Stage, state: RunState): { [key: string]: Value } {
  const out: { [key: string]: Value } = {};
  for (const dep of stage.dependsOn) {
    const upstream = state.pipeline.stages.find((s) => s.id === dep);
    if (!upstream) continue;
    const entry: { [key: string]: Value } = { result: state.stageStatus(dep) ?? null };
    const flat: { [key: string]: Value } = {};
    for (const name of new Set(upstream.jobs.map((j) => j.name))) {
      const outputs = state.jobOutputs(dep, name);
      entry[name] = { result: state.jobStatus(dep, name) ?? null, outputs };
      for (const [key, value] of Object.entries(outputs)) flat[`${name}.${key}`] = value;
    }
    entry.outputs = flat;
    out[dep] = entry;
  }
  return out;
}

/** Named values for a job: `dependencies` (jobs of its stage) and `stageDependencies` (earlier stages). */
export function jobContext(stage: Stage, job: Job, state: RunState): { dependencies: Value; stageDependencies: Value } {
  const dependencies: { [key: string]: Value } = {};
  for (const dep of job.dependsOn) {
    dependencies[dep] = { result: state.jobStatus(stage.id, dep) ?? null, outputs: state.jobOutputs(stage.id, dep) };
  }
  return { dependencies, stageDependencies: stageDependencies(stage, state) };
}

export function evalStageCondition(stage: Stage, state: RunState, variables: Resolver): boolean | Unknown {
  return toVerdict(
    evaluate(stage.condition || DEFAULT_CONDITION, {
      named: { variables, dependencies: stageDependencies(stage, state) },
      functions: statusFunctions((name) => state.stageStatus(name), stage.dependsOn, state.canceled),
    }),
  );
}

export function evalJobCondition(stage: Stage, job: Job, state: RunState, variables: Resolver): boolean | Unknown {
  return toVerdict(
    evaluate(job.condition || DEFAULT_CONDITION, {
      named: { variables, ...jobContext(stage, job, state) },
      functions: statusFunctions((name) => state.jobStatus(stage.id, name), transitiveDeps(stage, job), state.canceled),
    }),
  );
}

/** A step's condition sees the status of its own job so far. */
export function evalStepCondition(condition: string, jobStatus: Status, variables: Resolver, canceled: boolean): boolean | Unknown {
  return toVerdict(
    evaluate(condition || DEFAULT_CONDITION, {
      named: { variables },
      functions: {
        succeeded: () => ok(jobStatus) && !canceled,
        failed: () => jobStatus === 'Failed',
        succeededOrFailed: () => !canceled,
        always: () => true,
        canceled: () => canceled,
      },
    }),
  );
}

export type ConditionPreview = 'runs' | 'skipped' | 'depends';

/**
 * What a condition will do, judged before the run from the variables known now.
 * Anything that depends on how the run goes reads as "depends".
 */
export function previewCondition(condition: string, known: (name: string) => string | undefined): ConditionPreview {
  const later = () => new Unknown('decided during the run');
  try {
    const value = evaluate(condition || DEFAULT_CONDITION, {
      named: {
        variables: variablesContext(known, 'unknown'),
        dependencies: new Resolver(later),
        stageDependencies: new Resolver(later),
      },
      functions: {
        succeeded: (args) => (args.length ? later() : true),
        succeededOrFailed: (args) => (args.length ? later() : true),
        always: () => true,
        failed: later,
        canceled: later,
      },
    });
    if (value instanceof Unknown) return 'depends';
    return toBool(value) ? 'runs' : 'skipped';
  } catch (err) {
    if (err instanceof ExprError) return 'depends';
    throw err;
  }
}

/** Evaluates the `$[ expression ]` form of a variable value. Other text is returned unchanged. */
export function evalRuntimeValue(text: string, ctx: EvalContext): string | Unknown {
  const m = /^\s*\$\[([\s\S]*)\]\s*$/.exec(text);
  if (!m) return text;
  const value = evaluate(m[1].trim(), ctx);
  return value instanceof Unknown ? value : toStr(value);
}
