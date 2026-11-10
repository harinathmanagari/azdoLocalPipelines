// The picture of a pipeline, as plain data: stages in columns, jobs as cards, steps
// with their tier and a preview of their condition. The CLI prints it and the
// extension's webview draws it, so both show the same thing.
import * as path from 'node:path';
import { previewCondition, type ConditionPreview } from './conditions';
import { lookupCI } from './model';
import { describeTarget, resolveTarget, type JobTarget } from './targets';
import { DEFAULT_CONDITION, type Job, type LocalConfig, type Pipeline, type SourceRef, type Stage, type Step, type TaskTier } from './types';

export interface GraphStep {
  id: string;
  displayName: string;
  /** `script`, `bash`, `UseNode@1`, `checkout` and so on. */
  kind: string;
  tier?: TaskTier;
  tierNote?: string;
  /** What the config file does with the task, in words. */
  override?: string;
  condition?: string;
  preview?: ConditionPreview;
  enabled: boolean;
  implicit: boolean;
  src: SourceRef;
}

export interface GraphJob {
  id: string;
  name: string;
  displayName: string;
  kind: 'job' | 'deployment';
  leg?: string;
  /** Ids of the jobs this one waits for. */
  dependsOn: string[];
  condition?: string;
  preview?: ConditionPreview;
  pool: string;
  target: JobTarget;
  targetLabel: string;
  environment?: string;
  services: string[];
  tiers: Record<TaskTier, number>;
  steps: GraphStep[];
  src: SourceRef;
}

export interface GraphStage {
  id: string;
  displayName: string;
  implicit: boolean;
  /** 0 for stages with no dependencies; otherwise one more than the deepest dependency. */
  column: number;
  dependsOn: string[];
  condition?: string;
  preview?: ConditionPreview;
  jobs: GraphJob[];
  src: SourceRef;
}

export interface GraphModel {
  /** File name of the pipeline. */
  title: string;
  /** The `name:` of the pipeline, which is the format of its run (build) number. */
  runName?: string;
  file: string;
  triggers: Pipeline['triggers'];
  stages: GraphStage[];
  errors: number;
  warnings: number;
}

function stepKind(step: Step): string {
  switch (step.run.kind) {
    case 'script':
      return step.run.shell === 'default' ? 'script' : step.run.shell;
    case 'task':
      return step.run.version ? `${step.run.name}@${step.run.version}` : step.run.name;
    default:
      return step.run.kind;
  }
}

function overrideText(step: Step): string | undefined {
  if (step.run.kind !== 'task' || !step.run.override) return undefined;
  const o = step.run.override;
  switch (o.action) {
    case 'skip':
      return 'skipped by .azp-local.yml';
    case 'fail':
      return 'fails by .azp-local.yml';
    case 'script':
      return `replaced by ${o.script}`;
    case 'path':
      return `task code from ${o.path}`;
  }
}

/** Variables whose values are known before the run, for one job. */
export function knownVariables(pipeline: Pipeline, stage: Stage, job: Job, base: Record<string, string>, config: LocalConfig): Record<string, string> {
  const vars = { ...base };
  for (const decl of [...pipeline.variables, ...stage.variables, ...job.variables]) {
    if (decl.group) {
      for (const [name, entry] of Object.entries(config.variableGroups[decl.group] ?? {})) {
        if (!entry.secret && entry.value !== undefined) vars[name] = entry.value;
      }
    } else if (!decl.value.trimStart().startsWith('$[')) {
      vars[decl.name] = decl.value;
    }
  }
  Object.assign(vars, job.matrixLeg?.variables ?? {});
  return vars;
}

export function buildGraph(pipeline: Pipeline, base: Record<string, string>, config: LocalConfig, platform: NodeJS.Platform = process.platform): GraphModel {
  const columns = new Map<string, number>();
  const column = (stage: Stage, trail: string[] = []): number => {
    const cached = columns.get(stage.id);
    if (cached !== undefined) return cached;
    if (trail.includes(stage.id)) return 0; // dependency cycle: reported by the model, drawn flat
    const deps = stage.dependsOn.map((id) => pipeline.stages.find((s) => s.id === id)).filter((s): s is Stage => !!s);
    const value = deps.length ? Math.max(...deps.map((d) => column(d, [...trail, stage.id]))) + 1 : 0;
    columns.set(stage.id, value);
    return value;
  };

  const stages = pipeline.stages.map((stage): GraphStage => {
    const stageVars = knownVariables(pipeline, stage, { variables: [] } as unknown as Job, base, config);
    return {
      id: stage.id,
      displayName: stage.displayName,
      implicit: stage.implicit,
      column: column(stage),
      dependsOn: stage.dependsOn,
      condition: stage.condition !== DEFAULT_CONDITION ? stage.condition : undefined,
      preview: stage.condition !== DEFAULT_CONDITION ? previewCondition(stage.condition, (n) => lookupCI(stageVars, n)) : undefined,
      src: stage.src,
      jobs: stage.jobs.map((job): GraphJob => {
        const vars = knownVariables(pipeline, stage, job, base, config);
        const known = (name: string) => lookupCI(vars, name);
        const target = resolveTarget(job, config, platform);
        const tiers: Record<TaskTier, number> = { 1: 0, 2: 0, 3: 0 };
        const steps = job.steps.map((step): GraphStep => {
          const tier = step.run.kind === 'task' ? step.run.tier : 1;
          tiers[tier]++;
          return {
            id: step.id,
            displayName: step.displayName,
            kind: stepKind(step),
            tier,
            tierNote: step.run.kind === 'task' ? step.run.tierReason : undefined,
            override: overrideText(step),
            condition: step.condition !== DEFAULT_CONDITION ? step.condition : undefined,
            preview: step.condition !== DEFAULT_CONDITION ? previewCondition(step.condition, known) : undefined,
            enabled: step.enabled,
            implicit: !!step.implicit,
            src: step.src,
          };
        });
        return {
          id: job.id,
          name: job.name,
          displayName: job.displayName,
          kind: job.kind,
          leg: job.matrixLeg?.name,
          dependsOn: job.dependsOn.flatMap((dep) => stage.jobs.filter((j) => j.name === dep).map((j) => j.id)),
          condition: job.condition !== DEFAULT_CONDITION ? job.condition : undefined,
          preview: job.condition !== DEFAULT_CONDITION ? previewCondition(job.condition, known) : undefined,
          pool: job.pool.label || '(default pool)',
          target,
          targetLabel: describeTarget(target),
          environment: job.environment,
          services: Object.keys(job.services),
          tiers,
          steps,
          src: job.src,
        };
      }),
    };
  });

  return {
    title: path.basename(pipeline.file),
    runName: pipeline.name,
    file: pipeline.file,
    triggers: pipeline.triggers,
    stages,
    errors: pipeline.diagnostics.filter((d) => d.severity === 'error').length,
    warnings: pipeline.diagnostics.filter((d) => d.severity === 'warning').length,
  };
}

/** A text rendering of the graph for terminals. */
export function renderGraphText(graph: GraphModel): string {
  const lines: string[] = [];
  const badge = (condition?: string, preview?: ConditionPreview) => (condition ? `  [if ${condition} -> ${preview}]` : '');
  lines.push(`Pipeline ${graph.title}`);
  if (graph.runName) lines.push(`  Run name: ${graph.runName}`);
  lines.push(`  CI trigger: ${graph.triggers.ci ?? '-'}   PR trigger: ${graph.triggers.pr ?? '-'}`);
  for (const schedule of graph.triggers.schedules) lines.push(`  Schedule: ${schedule.cron}${schedule.displayName ? ` (${schedule.displayName})` : ''}`);
  lines.push('  Triggers are shown for information; nothing fires locally.');
  for (const stage of graph.stages) {
    if (!stage.implicit) {
      const after = stage.dependsOn.length ? `  (after ${stage.dependsOn.join(', ')})` : '';
      lines.push('', `Stage ${stage.displayName}${after}${badge(stage.condition, stage.preview)}`);
    } else {
      lines.push('');
    }
    for (const job of stage.jobs) {
      const after = job.dependsOn.length ? `  (after ${job.dependsOn.map((id) => id.split('.').slice(1).join('.')).join(', ')})` : '';
      lines.push(`  ${job.kind === 'deployment' ? 'Deployment' : 'Job'} ${job.displayName}  <${job.pool} -> ${job.targetLabel}>${after}${badge(job.condition, job.preview)}`);
      if (job.target.kind === 'unsupported') lines.push(`      ! ${job.target.reason}`);
      for (const step of job.steps) {
        const tier = step.kind.includes('@') ? ` (tier ${step.tier}${step.override ? `, ${step.override}` : ''})` : '';
        const off = step.enabled ? '' : '  [disabled]';
        lines.push(`      - ${step.displayName}  {${step.kind}}${tier}${off}${badge(step.condition, step.preview)}`);
      }
    }
  }
  return lines.join('\n');
}
