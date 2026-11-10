// Hosts the graph webview: one panel per pipeline file, fed by messages only.
import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Selection, SourceRef } from '@azp-local/core';
import { samePath, type PipelineEntry, type WorkspaceModel } from './model';
import { collectProblems } from './problems';
import type { RunController, ShownRun } from './runs';
import type { FromWebview, RunSnapshot, ToWebview } from './webview/protocol';

export function snapshot(run: ShownRun | undefined): RunSnapshot | undefined {
  if (!run) return undefined;
  const { view } = run;
  return {
    runId: run.runId,
    live: run.live,
    selection: run.selection,
    result: view.result,
    buildNumber: view.buildNumber,
    startedAt: view.startedAt,
    finishedAt: view.finishedAt,
    gaps: view.gaps,
    jobs: Object.fromEntries(
      [...view.jobs.values()].map((job) => [
        job.id,
        {
          state: job.state,
          reused: job.reused,
          image: job.image,
          message: job.message,
          container: job.container,
          startedAt: job.startedAt,
          finishedAt: job.finishedAt,
          steps: job.steps.map((step) => ({
            id: step.id,
            displayName: step.displayName,
            state: step.state,
            startedAt: step.startedAt,
            finishedAt: step.finishedAt,
            message: step.message,
            errors: step.issues.filter((i) => i.severity === 'error').length,
            warnings: step.issues.filter((i) => i.severity === 'warning').length,
          })),
        },
      ]),
    ),
    tests: view.tests.map(({ jobId, summary }) => ({
      jobId,
      title: summary.title,
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      skipped: summary.skipped,
      durationMs: summary.durationMs,
      failures: summary.cases.filter((c) => c.outcome === 'failed').map((c) => `${c.suite ? `${c.suite} > ` : ''}${c.name}`),
    })),
    coverage: view.coverage.map(({ jobId, summary }) => ({
      jobId,
      format: summary.format,
      linesCovered: summary.linesCovered,
      linesTotal: summary.linesTotal,
      branchesCovered: summary.branchesCovered,
      branchesTotal: summary.branchesTotal,
    })),
    artifacts: view.artifacts,
    summaries: view.summaries,
  };
}

export interface GraphActions {
  run(entry: PipelineEntry, selection: Selection): void;
  openLog(jobId: string, stepId: string): void;
  reveal(src: SourceRef): void;
  openShell(jobId: string): void;
}

export class GraphPanels implements vscode.Disposable {
  private readonly panels = new Map<string, vscode.WebviewPanel>();

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly model: WorkspaceModel,
    private readonly runs: RunController,
    private readonly actions: GraphActions,
  ) {
    model.onDidChange(() => this.refreshAll());
    runs.onDidChange(() => {
      for (const [file, panel] of this.panels) this.post(panel, { type: 'run', run: snapshot(this.runs.for(file)) });
    });
    vscode.workspace.onDidGrantWorkspaceTrust(() => this.refreshAll());
  }

  dispose(): void {
    this.panels.forEach((panel) => panel.dispose());
  }

  private post(panel: vscode.WebviewPanel, message: ToWebview): void {
    void panel.webview.postMessage(message);
  }

  private refreshAll(): void {
    for (const file of this.panels.keys()) this.sendModel(file);
  }

  private sendModel(file: string, focus?: string): void {
    const panel = this.panels.get(file.toLowerCase());
    const entry = this.model.entry(file);
    if (!panel || !entry) return;
    const run = this.runs.for(entry.file);
    this.post(panel, {
      type: 'model',
      graph: entry.graph,
      title: path.relative(entry.folder.root, entry.file),
      trusted: vscode.workspace.isTrusted,
      problems: collectProblems(entry.folder.root, entry.loaded.pipeline, entry.folder.config),
      run: snapshot(run),
      focus,
      // A finished run is drawn over the current file; say so when the two no longer match.
      stale: !!run && !run.live && JSON.stringify(run.pipeline.stages.map((s) => s.jobs.map((j) => j.id))) !== JSON.stringify(entry.loaded.pipeline.stages.map((s) => s.jobs.map((j) => j.id))),
    });
  }

  show(entry: PipelineEntry, focus?: string): void {
    const key = entry.file.toLowerCase();
    const existing = this.panels.get(key);
    if (existing) {
      existing.reveal(undefined, true);
      this.sendModel(entry.file, focus);
      return;
    }
    const media = vscode.Uri.joinPath(this.context.extensionUri, 'media');
    const panel = vscode.window.createWebviewPanel('azpLocal.graph', `Graph: ${path.basename(entry.file)}`, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [media],
    });
    panel.iconPath = vscode.Uri.joinPath(media, 'icon.svg');
    this.panels.set(key, panel);
    panel.onDidDispose(() => this.panels.delete(key));

    const nonce = crypto.randomBytes(16).toString('base64');
    const { webview } = panel;
    const css = webview.asWebviewUri(vscode.Uri.joinPath(media, 'graph.css'));
    const js = webview.asWebviewUri(vscode.Uri.joinPath(media, 'graph.js'));
    // No remote content, no inline script or style: the page is static and filled in through messages.
    webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${css}">
<title>Pipeline graph</title>
</head>
<body>
<div id="app"></div>
<script nonce="${nonce}" src="${js}"></script>
</body>
</html>`;

    webview.onDidReceiveMessage((message: FromWebview) => {
      const current = this.model.entry(entry.file);
      if (!current) return;
      switch (message.type) {
        case 'ready':
          return this.sendModel(entry.file, focus);
        case 'source':
          // Only files that belong to this pipeline (and its config file) can be opened from the graph.
          if (current.loaded.pipeline.files.some((f) => samePath(f, message.src.file)) || (current.folder.config.file && samePath(current.folder.config.file, message.src.file))) this.actions.reveal(message.src);
          return;
        case 'log':
          return this.actions.openLog(message.jobId, message.stepId);
        case 'run':
          return this.actions.run(current, message.selection);
        case 'cancel':
          return void this.runs.cancel();
        case 'shell':
          return this.actions.openShell(message.jobId);
        case 'reveal': {
          const target = path.resolve(message.path);
          if (path.relative(current.folder.store.root, target).startsWith('..')) return; // only inside the run store
          const uri = vscode.Uri.file(target);
          if (message.kind === 'summary') void vscode.commands.executeCommand('markdown.showPreview', uri);
          else void vscode.commands.executeCommand('revealFileInOS', uri);
          return;
        }
        case 'command': {
          const commands = { expand: 'azpLocal.expand', doctor: 'azpLocal.doctor', setInputs: 'azpLocal.setInputs', rerunFailed: 'azpLocal.rerunFailed' } as const;
          const command = commands[message.command];
          if (command) void vscode.commands.executeCommand(command, entry.file);
          return;
        }
      }
    });
  }
}
