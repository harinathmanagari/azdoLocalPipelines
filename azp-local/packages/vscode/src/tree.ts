// Native tree views: every pipeline file with its stages, jobs and steps, and the
// list of past local runs. Status icons follow the run that is being shown.
import * as path from 'node:path';
import * as vscode from 'vscode';
import { formatDuration, resultLabel, type GraphJob, type GraphStage, type GraphStep, type JobState, type RunMeta, type StepState } from '@azp-local/core';
import type { FolderState, PipelineEntry, WorkspaceModel } from './model';
import type { RunController } from './runs';

export type PipelineNode =
  | { kind: 'pipeline'; entry: PipelineEntry }
  | { kind: 'stage'; entry: PipelineEntry; stage: GraphStage }
  | { kind: 'job'; entry: PipelineEntry; stage: GraphStage; job: GraphJob }
  | { kind: 'step'; entry: PipelineEntry; job: GraphJob; step: GraphStep | { id: string; displayName: string; synthetic: true } };

export function stateIcon(state: JobState | StepState | undefined): vscode.ThemeIcon {
  switch (state) {
    case 'running':
      return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('charts.blue'));
    case 'succeeded':
      return new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'));
    case 'succeededWithIssues':
      return new vscode.ThemeIcon('pass', new vscode.ThemeColor('charts.yellow'));
    case 'succeededWithGaps':
      return new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
    case 'failed':
      return new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
    case 'canceled':
      return new vscode.ThemeIcon('circle-slash', new vscode.ThemeColor('charts.purple'));
    case 'skipped':
      return new vscode.ThemeIcon('debug-step-over', new vscode.ThemeColor('disabledForeground'));
    case 'unsupported':
      return new vscode.ThemeIcon('question', new vscode.ThemeColor('charts.yellow'));
    case 'omitted':
      return new vscode.ThemeIcon('dash', new vscode.ThemeColor('disabledForeground'));
    case 'pending':
      return new vscode.ThemeIcon('clock', new vscode.ThemeColor('disabledForeground'));
    default:
      return new vscode.ThemeIcon('circle-outline');
  }
}

export class PipelinesTree implements vscode.TreeDataProvider<PipelineNode> {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changed.event;

  constructor(
    private readonly model: WorkspaceModel,
    private readonly runs: RunController,
  ) {
    model.onDidChange(() => this.changed.fire());
    runs.onDidChange(() => this.changed.fire());
  }

  getChildren(node?: PipelineNode): PipelineNode[] {
    if (!node) return this.model.entries().map((entry) => ({ kind: 'pipeline', entry }));
    switch (node.kind) {
      case 'pipeline': {
        const { stages } = node.entry.graph;
        // One implicit stage is not drawn; its jobs hang off the pipeline, as in the portal.
        if (stages.length === 1 && stages[0].implicit) return stages[0].jobs.map((job) => ({ kind: 'job', entry: node.entry, stage: stages[0], job }));
        return stages.map((stage) => ({ kind: 'stage', entry: node.entry, stage }));
      }
      case 'stage':
        return node.stage.jobs.map((job) => ({ kind: 'job', entry: node.entry, stage: node.stage, job }));
      case 'job': {
        const run = this.runs.for(node.entry.file)?.view.jobs.get(node.job.id);
        const known = new Set(node.job.steps.map((s) => s.id));
        const extra = (run?.steps ?? []).filter((s) => !known.has(s.id));
        const synthetic = (id: string) => extra.filter((s) => (id === 'init' ? s.id === '__init' : s.id !== '__init')).map((s) => ({ id: s.id, displayName: s.displayName ?? s.id, synthetic: true as const }));
        return [...synthetic('init'), ...node.job.steps, ...synthetic('post')].map((step) => ({ kind: 'step', entry: node.entry, job: node.job, step }));
      }
      default:
        return [];
    }
  }

  getTreeItem(node: PipelineNode): vscode.TreeItem {
    const run = this.runs.for(node.entry.file);
    switch (node.kind) {
      case 'pipeline': {
        const { entry } = node;
        const item = new vscode.TreeItem(path.relative(entry.folder.root, entry.file), vscode.TreeItemCollapsibleState.Expanded);
        item.id = `p:${entry.file}`;
        item.contextValue = 'pipeline';
        item.resourceUri = vscode.Uri.file(entry.file);
        const { errors, warnings } = entry.graph;
        const parts = [this.model.folders.length > 1 ? entry.folder.name : '', run ? `${run.runId} ${run.live ? 'running' : resultLabel(run.view.result ?? 'pending')}` : ''];
        if (errors) parts.push(`${errors} error${errors === 1 ? '' : 's'}`);
        item.description = parts.filter(Boolean).join(' · ');
        item.iconPath = errors ? new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed')) : run ? stateIcon(run.live ? 'running' : run.view.result) : new vscode.ThemeIcon('rocket');
        item.tooltip = new vscode.MarkdownString(
          [`**${path.basename(entry.file)}**`, `CI trigger: ${entry.graph.triggers.ci}`, `PR trigger: ${entry.graph.triggers.pr}`, ...entry.graph.triggers.schedules.map((s) => `Schedule: \`${s.cron}\` ${s.displayName ?? ''}`), '_Triggers are shown for information; nothing fires locally._', warnings ? `${warnings} warning(s)` : ''].filter(Boolean).join('\n\n'),
        );
        return item;
      }
      case 'stage': {
        const { stage } = node;
        const states = stage.jobs.map((j) => run?.view.jobs.get(j.id)?.state).filter((s): s is JobState => !!s && s !== 'omitted');
        const item = new vscode.TreeItem(stage.displayName, vscode.TreeItemCollapsibleState.Expanded);
        item.id = `s:${node.entry.file}:${stage.id}`;
        item.contextValue = 'stage';
        item.iconPath = states.length ? stateIcon(combine(states)) : new vscode.ThemeIcon('layers');
        item.description = [stage.dependsOn.length ? `after ${stage.dependsOn.join(', ')}` : '', stage.condition ? `if… ${stage.preview}` : ''].filter(Boolean).join(' · ');
        item.tooltip = stage.condition ? `Condition: ${stage.condition}\nJudged before the run: ${stage.preview}` : undefined;
        return item;
      }
      case 'job': {
        const { job } = node;
        const state = run?.view.jobs.get(job.id);
        const item = new vscode.TreeItem(job.displayName, vscode.TreeItemCollapsibleState.Collapsed);
        item.id = `j:${node.entry.file}:${job.id}`;
        item.contextValue = state?.container ? 'jobKept' : 'job';
        item.iconPath = state ? stateIcon(state.state) : new vscode.ThemeIcon(job.kind === 'deployment' ? 'cloud-upload' : 'server-process');
        const took = state?.startedAt && state.finishedAt ? formatDuration(state.finishedAt - state.startedAt) : '';
        item.description = [state ? (state.reused ? 'reused' : resultLabel(state.state)) : job.targetLabel, took, job.tiers[3] ? `${job.tiers[3]}× tier 3` : ''].filter(Boolean).join(' · ');
        const lines = [`**${job.displayName}**`, `Pool \`${job.pool}\` → ${job.targetLabel}`];
        if (job.target.kind === 'unsupported') lines.push(`⚠ ${job.target.reason}`);
        if (job.target.kind === 'host') lines.push(`⚠ ${job.target.note}`);
        if (job.condition) lines.push(`Condition: \`${job.condition}\` → ${job.preview}`);
        if (job.environment) lines.push(`Environment \`${job.environment}\` (approvals and checks are shown, not enforced)`);
        if (state?.message) lines.push(state.message);
        if (state?.container) lines.push(`Kept for debugging: \`${state.container}\``);
        item.tooltip = new vscode.MarkdownString(lines.join('\n\n'));
        return item;
      }
      case 'step': {
        const { step, job } = node;
        const state = run?.view.jobs.get(job.id)?.steps.find((s) => s.id === step.id);
        const item = new vscode.TreeItem(step.displayName, vscode.TreeItemCollapsibleState.None);
        item.id = `t:${node.entry.file}:${job.id}:${step.id}`;
        const hasLog = !!state && state.state !== 'pending' && state.state !== 'skipped';
        const synthetic = 'synthetic' in step;
        item.contextValue = synthetic ? 'synthetic' : hasLog ? 'stepWithLog' : 'step';
        item.iconPath = state ? stateIcon(state.state) : new vscode.ThemeIcon(synthetic ? 'gear' : 'symbol-event');
        const took = state?.startedAt && state.finishedAt ? formatDuration(state.finishedAt - state.startedAt) : '';
        if (synthetic) {
          item.description = took;
        } else {
          const tier = step.kind.includes('@') && step.tier && step.tier > 1 ? `tier ${step.tier}` : '';
          item.description = [state ? '' : step.kind, tier, step.condition && !state ? `if… ${step.preview}` : '', took, !step.enabled ? 'disabled' : ''].filter(Boolean).join(' · ');
          const lines = [`**${step.displayName}** \`${step.kind}\``];
          if (step.tierNote && step.kind.includes('@')) lines.push(`Tier ${step.tier}: ${step.tierNote}`);
          if (step.override) lines.push(`Locally: ${step.override}`);
          if (step.condition) lines.push(`Condition: \`${step.condition}\` → ${step.preview}`);
          if (state?.message) lines.push(state.message);
          for (const issue of state?.issues ?? []) lines.push(`${issue.severity}: ${issue.message}`);
          item.tooltip = new vscode.MarkdownString(lines.join('\n\n'));
        }
        // With a run on screen a click opens the log; otherwise it goes to the YAML.
        item.command = hasLog
          ? { command: 'azpLocal.openLog', title: 'Open step log', arguments: [{ jobId: job.id, stepId: step.id }] }
          : synthetic
            ? undefined
            : { command: 'azpLocal.goToSource', title: 'Go to YAML', arguments: [node] };
        return item;
      }
    }
  }
}

function combine(states: JobState[]): JobState {
  for (const state of ['running', 'failed', 'canceled', 'succeededWithGaps', 'unsupported', 'succeededWithIssues'] as const) if (states.includes(state)) return state;
  if (states.every((s) => s === 'skipped')) return 'skipped';
  if (states.includes('pending')) return 'pending';
  return 'succeeded';
}

export interface RunNode {
  folder: FolderState;
  meta: RunMeta;
}

export class HistoryTree implements vscode.TreeDataProvider<RunNode> {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changed.event;

  constructor(
    private readonly model: WorkspaceModel,
    private readonly runs: RunController,
  ) {
    model.onDidChange(() => this.changed.fire());
    runs.onDidFinish(() => this.changed.fire());
    runs.onDidChange(() => this.changed.fire());
  }

  refresh(): void {
    this.changed.fire();
  }

  getChildren(node?: RunNode): RunNode[] {
    if (node) return [];
    return this.model.folders
      .flatMap((folder) => folder.store.listRuns().map((meta) => ({ folder, meta })))
      .sort((a, b) => b.meta.startedAt - a.meta.startedAt)
      .slice(0, 100);
  }

  getTreeItem(node: RunNode): vscode.TreeItem {
    const { meta, folder } = node;
    const selection =
      meta.selection.kind === 'pipeline'
        ? 'pipeline'
        : meta.selection.kind === 'stage'
          ? `stage ${meta.selection.stageId}${meta.selection.andLater ? ' onward' : ''}`
          : meta.selection.kind === 'job'
            ? `job ${meta.selection.jobId.split('.').slice(1).join('.')}`
            : meta.selection.kind === 'step'
              ? `to step ${meta.selection.stepId}`
              : 're-run of failed';
    const item = new vscode.TreeItem(`${meta.runId} · ${selection}`, vscode.TreeItemCollapsibleState.None);
    item.id = `${folder.root}:${meta.runId}`;
    item.contextValue = 'run';
    const live = this.runs.shown?.runId === meta.runId && this.runs.shown.live;
    item.iconPath = stateIcon(live ? 'running' : (meta.result ?? 'canceled'));
    const took = meta.finishedAt ? formatDuration(meta.finishedAt - meta.startedAt) : live ? 'running' : 'interrupted';
    item.description = `${path.relative(folder.root, meta.pipelineFile)} · ${took} · ${new Date(meta.startedAt).toLocaleString()}`;
    item.tooltip = new vscode.MarkdownString(
      [`**${meta.runId}** build \`${meta.buildNumber}\``, `Result: ${live ? 'running' : resultLabel(meta.result ?? 'canceled')}`, ...(meta.gaps ?? []).map((gap) => `- ${gap}`)].join('\n\n'),
    );
    item.command = { command: 'azpLocal.openRun', title: 'Open run', arguments: [node] };
    return item;
  }
}
