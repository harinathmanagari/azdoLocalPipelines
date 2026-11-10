// Checks on the expanded pipeline that the model does not need in order to draw it,
// but that a person fixing a file wants to hear about: a misspelled key, a job with no
// steps, jobs that wait for each other. Everything here is a warning unless it makes the
// pipeline impossible to run (a cycle), so a key this list has not heard of can never
// stop the graph from being drawn.
import { get, getText, isPMap, isPSeq, type PMap, type PNode } from './yaml';
import type { Diagnostic } from './types';

const COMMON_STEP = ['name', 'displayName', 'condition', 'continueOnError', 'enabled', 'env', 'timeoutInMinutes', 'retryCountOnTaskFailure', 'target'];
const STEP_BODY = [
  'script', 'bash', 'pwsh', 'powershell', 'task', 'checkout', 'download', 'publish',
  'inputs', 'workingDirectory', 'failOnStderr', 'errorActionPreference', 'ignoreLASTEXITCODE',
  'clean', 'fetchDepth', 'fetchTags', 'lfs', 'persistCredentials', 'submodules', 'path', 'sparseCheckoutDirectories', 'sparseCheckoutPatterns', 'fetchFilter',
  'artifact', 'patterns', 'properties',
];
const STEP_KEYS = [...COMMON_STEP, ...STEP_BODY];
// Steps that need the Azure DevOps server are not modelled here, so their keys are not checked.
const UNCHECKED_STEPS = ['downloadBuild', 'getPackage', 'reviewApp'];

const JOB_KEYS = [
  'job', 'deployment', 'displayName', 'dependsOn', 'condition', 'strategy', 'continueOnError', 'pool', 'workspace', 'container', 'services',
  'timeoutInMinutes', 'cancelTimeoutInMinutes', 'variables', 'steps', 'uses', 'templateContext', 'environment', 'lockBehavior',
];
const STAGE_KEYS = ['stage', 'displayName', 'dependsOn', 'condition', 'variables', 'jobs', 'pool', 'lockBehavior', 'trigger', 'isSkippable', 'templateContext'];
// A file with only `steps:` is a single job, so job keys are allowed at the top as well.
const ROOT_KEYS = [
  'name', 'appendCommitMessageToRunName', 'trigger', 'pr', 'schedules', 'resources', 'variables', 'parameters', 'stages', 'jobs', 'steps', 'extends',
  'lockBehavior', 'uses', 'templateContext', ...JOB_KEYS.filter((k) => k !== 'job' && k !== 'deployment'),
];

const HOOKS = ['preDeploy', 'deploy', 'routeTraffic', 'postRouteTraffic'];

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

/** The known name that `word` most likely meant, if it is close enough to be a slip of the keyboard. */
export function suggest(word: string, known: readonly string[]): string | undefined {
  const lower = word.toLowerCase();
  const exact = known.find((k) => k.toLowerCase() === lower);
  if (exact) return exact;
  const limit = word.length < 5 ? 1 : 2;
  let best: { name: string; d: number } | undefined;
  for (const name of known) {
    const d = distance(lower, name.toLowerCase());
    if (d <= limit && (!best || d < best.d)) best = { name, d };
  }
  return best?.name;
}

/** Findings for one mapping whose keys must come from `known`. */
function unknownKeys(node: PMap, known: readonly string[], where: string, out: Diagnostic[]): void {
  for (const { key } of node.entries) {
    if (key.text.startsWith('${{') || known.includes(key.text)) continue;
    const near = suggest(key.text, known);
    out.push({
      severity: 'warning',
      message: `Unexpected key '${key.text}' in ${where}.${near ? ` Did you mean '${near}'?` : ''}`,
      source: key.src,
      code: 'unknown-key',
    });
  }
}

function lintSteps(steps: PNode | undefined, out: Diagnostic[]): void {
  if (!isPSeq(steps)) return;
  for (const step of steps.items) {
    if (!isPMap(step) || UNCHECKED_STEPS.some((k) => step.entries.some((e) => e.key.text === k))) continue;
    unknownKeys(step, STEP_KEYS, 'a step', out);
  }
}

function lintJobs(jobs: PNode | undefined, out: Diagnostic[]): void {
  if (!isPSeq(jobs)) return;
  for (const job of jobs.items) {
    if (!isPMap(job)) continue;
    unknownKeys(job, JOB_KEYS, 'a job', out);
    if (job.entries.some((e) => e.key.text === 'deployment')) {
      const strategy = get(job, 'strategy');
      for (const kind of ['runOnce', 'rolling', 'canary']) {
        const body = get(strategy, kind);
        for (const hook of HOOKS) lintSteps(get(get(body, hook), 'steps'), out);
        for (const outcome of ['success', 'failure']) lintSteps(get(get(get(body, 'on'), outcome), 'steps'), out);
      }
    } else if (job.entries.some((e) => e.key.text === 'job')) {
      const steps = get(job, 'steps');
      if (steps === undefined || (isPSeq(steps) && steps.items.length === 0)) {
        // A server job (`pool: server`) can run tasks without steps of its own; every other job has nothing to do.
        if (getText(job, 'pool') !== 'server') {
          out.push({ severity: 'warning', message: `Job '${getText(job, 'job') ?? ''}' has no steps, so it does nothing.`, source: job.src, code: 'job-no-steps' });
        }
      }
      lintSteps(steps, out);
    }
  }
}

/** Warnings about the shape of an expanded pipeline. */
export function lintPipeline(root: PMap): Diagnostic[] {
  const out: Diagnostic[] = [];
  unknownKeys(root, ROOT_KEYS, 'a pipeline', out);
  const stages = get(root, 'stages');
  if (isPSeq(stages)) {
    for (const stage of stages.items) {
      if (!isPMap(stage)) continue;
      unknownKeys(stage, STAGE_KEYS, 'a stage', out);
      const jobs = get(stage, 'jobs');
      if (jobs === undefined || (isPSeq(jobs) && jobs.items.length === 0)) {
        out.push({ severity: 'warning', message: `Stage '${getText(stage, 'stage') ?? ''}' has no jobs, so it does nothing.`, source: stage.src, code: 'stage-no-jobs' });
      }
      lintJobs(jobs, out);
    }
  }
  lintJobs(get(root, 'jobs'), out);
  // A file with only `steps:` is one job.
  if (!isPSeq(stages) && !isPSeq(get(root, 'jobs'))) lintSteps(get(root, 'steps'), out);
  return out;
}

/**
 * Finds a loop among `edges` (node -> the nodes it waits for). Returns the path around the first
 * loop found, with the starting node repeated at the end, or undefined when there is none.
 */
export function findCycle(edges: ReadonlyMap<string, readonly string[]>): string[] | undefined {
  const state = new Map<string, 'open' | 'done'>();
  const stack: string[] = [];
  const visit = (node: string): string[] | undefined => {
    state.set(node, 'open');
    stack.push(node);
    for (const next of edges.get(node) ?? []) {
      if (!edges.has(next)) continue;
      if (state.get(next) === 'open') return [...stack.slice(stack.indexOf(next)), next];
      if (!state.has(next)) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    state.set(node, 'done');
    return undefined;
  };
  for (const node of edges.keys()) {
    if (state.has(node)) continue;
    const found = visit(node);
    if (found) return found;
  }
  return undefined;
}
