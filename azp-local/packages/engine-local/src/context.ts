// What a step implementation is given to work with.
import type { Job, RunEvent, RunIO, RunPlan, Status, Step, StepResult, VariableBag } from '@azp-local/core';
import type { JobBackend } from './backend';

export interface StepOutcome {
  result: StepResult;
  message?: string;
  /** Set when the step did something other than what Azure DevOps would do; listed in the run's gaps. */
  gap?: string;
}

export interface ExecResult {
  code: number;
  /** True when the process wrote anything to standard error. */
  sawStderr: boolean;
}

export interface EngineSettings {
  /** Folder holding the Dockerfiles of the built-in agent images. */
  imagesDir: string;
  /** Cache@2 entries, scoped to the workspace. */
  cacheDir: string;
  /** Per-user folder: Node version index, host-mode tool cache. */
  homeDir: string;
  /** Root of host-mode scratch folders. Kept short because of Windows path limits. */
  hostScratchDir: string;
  dockerHost?: string;
  maxParallelJobs: number;
  keepContainersOnFailure: boolean;
  matchHostedHardware: boolean;
  platform: NodeJS.Platform;
  counter?: (prefix: string, seed: number) => number;
}

export interface StepContext {
  readonly job: Job;
  readonly step: Step;
  readonly backend: JobBackend;
  readonly vars: VariableBag;
  readonly io: RunIO;
  readonly plan: RunPlan;
  readonly settings: EngineSettings;
  readonly signal: AbortSignal;

  /** A task input after macro expansion. Names and aliases are matched without regard to case. */
  input(name: string, ...aliases: string[]): string | undefined;
  boolInput(name: string, fallback: boolean): boolean;
  /** Every input, expanded. */
  readonly inputs: Record<string, string>;
  expand(text: string): string;
  /** Resolves a path against the sources directory, in the backend's path syntax. */
  resolve(target: string, base?: string): string;

  log(line: string): void;
  warn(message: string): void;
  error(message: string): void;
  emit(event: RunEvent): void;

  /** Runs a process as part of this step: its output is logged and its logging commands are obeyed. */
  exec(cmd: string[], opts?: { cwd?: string; env?: Record<string, string>; verbatim?: boolean }): Promise<ExecResult>;
  setVariable(name: string, value: string, flags?: { isOutput?: boolean; isSecret?: boolean; isReadOnly?: boolean }): void;
  prependPath(dir: string): void;
  /** Registers work to run after the job's steps, in reverse order of registration (as `Post-job:` steps). */
  addPostStep(displayName: string, run: (ctx: StepContext) => Promise<StepOutcome>): void;
  jobStatus(): Status;
  /** Folder of this run's artifact, or of the run a reused job published it in. */
  findArtifact(name: string): string | undefined;
  listArtifacts(): string[];
}
