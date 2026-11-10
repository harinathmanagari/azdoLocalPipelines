// The typed pipeline model and the engine contract. Everything the views draw and
// everything an engine runs is expressed in these types.

/** Where a node was written. `via` is the template include chain, innermost first. */
export interface SourceRef {
  file: string;
  line: number;
  column: number;
  via?: SourceRef;
}

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  source?: SourceRef;
  code?: string;
}

/** Source text of a condition. The default is `succeeded()`. */
export type Expr = string;
export const DEFAULT_CONDITION: Expr = 'succeeded()';

export interface TriggerInfo {
  /** Human-readable entry points, drawn but never fired locally (D4). */
  ci?: string;
  pr?: string;
  schedules: { cron: string; displayName?: string }[];
}

export interface ParameterDecl {
  name: string;
  displayName?: string;
  type: string;
  default?: unknown;
  hasDefault: boolean;
  values?: unknown[];
  src: SourceRef;
}

export interface VariableDecl {
  name: string;
  value: string;
  isSecret?: boolean;
  readonly?: boolean;
  /** Set when the entry is a reference to a variable group rather than a value. */
  group?: string;
  src?: SourceRef;
}

export interface PoolSpec {
  /** hosted: vmImage label · named: self-hosted pool · server: agentless · none: nothing declared */
  kind: 'hosted' | 'named' | 'server' | 'none';
  vmImage?: string;
  name?: string;
  /** The label looked up in the config file's `images` map. */
  label: string;
}

export interface ContainerSpec {
  image: string;
  alias?: string;
  env?: Record<string, string>;
  ports?: string[];
  volumes?: string[];
  options?: string;
}

export type TaskTier = 1 | 2 | 3;

export type StepRun =
  | { kind: 'script'; shell: 'default' | 'bash' | 'pwsh' | 'powershell'; script: string }
  | {
      kind: 'task';
      name: string;
      version: string;
      inputs: Record<string, string>;
      tier: TaskTier;
      tierReason: string;
      /** What .azp-local.yml says to do with this task, if anything. */
      override?: TaskOverride;
    }
  | { kind: 'checkout'; repository: string; fetchDepth?: number }
  /** source: `current`, `none` or a pipeline resource alias. An empty artifact means all of them. */
  | { kind: 'download'; source: string; artifact: string; path?: string; patterns?: string }
  | { kind: 'publish'; artifact: string; path: string };

export interface Step {
  id: string;
  /** The `name:` of the step, used as the prefix of its output variables. */
  refName?: string;
  displayName: string;
  run: StepRun;
  condition: Expr;
  continueOnError: boolean;
  enabled: boolean;
  env: Record<string, string>;
  workingDirectory?: string;
  failOnStderr?: boolean;
  timeoutInMinutes?: number;
  retryCount?: number;
  /** True for steps the agent adds by itself (implicit checkout, artifact download). */
  implicit?: boolean;
  src: SourceRef;
}

export interface Job {
  /** Unique in the pipeline: `<stage>.<name>` or `<stage>.<name>.<matrix leg>`. */
  id: string;
  /** The name written in the YAML; what `dependsOn` refers to. */
  name: string;
  stageId: string;
  displayName: string;
  kind: 'job' | 'deployment';
  dependsOn: string[];
  condition: Expr;
  pool: PoolSpec;
  container?: ContainerSpec;
  matrixLeg?: { name: string; variables: Record<string, string> };
  maxParallel?: number;
  services: Record<string, ContainerSpec>;
  variables: VariableDecl[];
  steps: Step[];
  timeoutInMinutes?: number;
  continueOnError?: boolean;
  /** Deployment jobs: shown, not enforced. */
  environment?: string;
  src: SourceRef;
}

export interface Stage {
  id: string;
  displayName: string;
  /** True when the YAML had no `stages:` and this stage only wraps its jobs. */
  implicit: boolean;
  dependsOn: string[];
  condition: Expr;
  variables: VariableDecl[];
  jobs: Job[];
  src: SourceRef;
}

export interface Pipeline {
  name?: string;
  file: string;
  triggers: TriggerInfo;
  parameters: ParameterDecl[];
  /** Parameter values this expansion used. */
  parameterValues: Record<string, unknown>;
  variables: VariableDecl[];
  stages: Stage[];
  /** Every file read while expanding: the pipeline itself and its templates. */
  files: string[];
  diagnostics: Diagnostic[];
}

// ---------------------------------------------------------------------------
// Engine contract
// ---------------------------------------------------------------------------

export type StepResult = 'succeeded' | 'succeededWithIssues' | 'failed' | 'canceled' | 'skipped' | 'unsupported';
export type JobResult = StepResult | 'succeededWithGaps';

export interface TestCase {
  suite: string;
  name: string;
  outcome: 'passed' | 'failed' | 'skipped';
  durationMs?: number;
  message?: string;
  details?: string;
  file?: string;
  line?: number;
}

export interface TestSummary {
  title: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  cases: TestCase[];
}

export interface CoverageSummary {
  format: 'cobertura' | 'lcov';
  linesCovered: number;
  linesTotal: number;
  branchesCovered?: number;
  branchesTotal?: number;
  files: { path: string; linesCovered: number; linesTotal: number }[];
}

export type RunEvent =
  | { type: 'run.started'; runId: string; at: number }
  | { type: 'job.started'; jobId: string; image: string; at: number }
  | { type: 'step.started'; jobId: string; stepId: string; displayName?: string; at: number }
  | { type: 'log'; jobId: string; stepId: string; line: string; stream: 'out' | 'err'; at: number }
  | { type: 'issue'; jobId: string; stepId: string; severity: 'error' | 'warning'; message: string; source?: SourceRef }
  | { type: 'variable.set'; jobId: string; stepId: string; name: string; isOutput: boolean; isSecret: boolean }
  | { type: 'artifact'; jobId: string; name: string; path: string; files: number }
  | { type: 'summary'; jobId: string; stepId: string; name: string; path: string }
  | { type: 'tests'; jobId: string; stepId: string; summary: TestSummary }
  | { type: 'coverage'; jobId: string; stepId: string; summary: CoverageSummary }
  | { type: 'buildNumber'; value: string }
  | { type: 'step.finished'; jobId: string; stepId: string; result: StepResult; message?: string; at: number }
  | { type: 'job.finished'; jobId: string; result: JobResult; message?: string; outputs?: Record<string, string>; container?: string; at: number }
  | { type: 'run.finished'; result: JobResult; gaps: string[]; at: number };

export interface RunHandle {
  readonly events: AsyncIterable<RunEvent>;
  cancel(): Promise<void>;
}

export interface Engine {
  readonly id: 'local' | 'azure-devops' | string;
  start(plan: RunPlan, io: RunIO): RunHandle;
}

/** What an engine needs from its host: where to write, how to ask, where secrets come from. */
export interface RunIO {
  runId: string;
  /** Folder of this run in the run store; artifacts, summaries and test files go here. */
  runDir: string;
  workspaceRoot: string;
  config: LocalConfig;
  /** Returns a secret value, prompting if the host can. Undefined when it is not available. */
  getSecret(name: string, group?: string): Promise<string | undefined>;
  /** Ask before proceeding on something that cannot be known locally (D3). */
  confirm(message: string): Promise<boolean>;
  /** Folder of an earlier run, for artifacts and outputs of reused jobs. */
  resolveRunDir(runId: string): string;
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

export type Selection =
  | { kind: 'pipeline' }
  | { kind: 'stage'; stageId: string; andLater?: boolean }
  | { kind: 'job'; jobId: string }
  | { kind: 'step'; jobId: string; stepId: string }
  | { kind: 'failed'; runId: string };

export interface JobRecord {
  runId: string;
  jobId: string;
  result: JobResult;
  outputs: Record<string, string>;
}

export interface PlannedJob {
  job: Job;
  /** run: execute now · reuse: take result and outputs from an earlier run · omit: not part of this run */
  action: 'run' | 'reuse' | 'omit';
  reason: string;
  reused?: JobRecord;
  /** Stop after this step ("run step and those before it"). */
  untilStepId?: string;
}

export interface RunPlan {
  pipeline: Pipeline;
  selection: Selection;
  jobs: PlannedJob[];
  /** Variables supplied for this run: config file `variables`, then per-run overrides. */
  variables: Record<string, string>;
  buildId: number;
  buildNumber: string;
}

// ---------------------------------------------------------------------------
// .azp-local.yml
// ---------------------------------------------------------------------------

export type TaskOverride =
  | { action: 'skip' }
  | { action: 'fail' }
  | { action: 'script'; script: string }
  | { action: 'path'; path: string };

export interface LocalConfig {
  file?: string;
  pipelines: string[];
  images: Record<string, string>;
  repositories: Record<string, string>;
  parameters: Record<string, unknown>;
  variables: Record<string, string>;
  variableGroups: Record<string, Record<string, { value?: string; secret: boolean }>>;
  tasks: Record<string, TaskOverride>;
  workspace: 'copy' | 'mount';
  dockerSocket: boolean;
  diagnostics: Diagnostic[];
}
