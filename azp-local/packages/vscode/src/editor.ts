// What the extension adds to the YAML editor: CodeLens above stages and jobs, and
// diagnostics for expansion errors, config errors and failed steps.
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Diagnostic, SourceRef } from '@azp-local/core';
import { samePath, templateUse, type WorkspaceModel } from './model';
import type { RunController } from './runs';

export class PipelineLenses implements vscode.CodeLensProvider {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.changed.event;

  constructor(private readonly model: WorkspaceModel) {
    model.onDidChange(() => this.changed.fire());
    vscode.workspace.onDidChangeConfiguration((event) => event.affectsConfiguration('azpLocal.codeLens') && this.changed.fire());
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!vscode.workspace.getConfiguration('azpLocal').get<boolean>('codeLens', true)) return [];
    const file = document.uri.fsPath;
    const lenses: vscode.CodeLens[] = [];
    const seen = new Set<string>();
    const at = (src: SourceRef) => new vscode.Range(Math.max(0, src.line - 1), 0, Math.max(0, src.line - 1), 0);
    const add = (src: SourceRef, key: string, title: string, command: string, args: unknown[], tooltip?: string) => {
      if (seen.has(`${src.line}:${key}`)) return;
      seen.add(`${src.line}:${key}`);
      lenses.push(new vscode.CodeLens(at(src), { title, command, arguments: args, tooltip }));
    };

    // A stage or job is offered where it is written, which may be a template rather than the pipeline file.
    const top = { file, line: 1, column: 1 };
    for (const entry of this.model.entries()) {
      // What is wrong, first: in the pipeline itself, or, in a template, what is wrong in that template.
      const errors = entry.loaded.pipeline.diagnostics.filter((d) => d.severity === 'error' && (samePath(entry.file, file) || (d.source && samePath(d.source.file, file)))).length;
      if (errors) {
        const name = path.basename(entry.file);
        add(top, `errors:${entry.file}`, `$(error) ${errors} error${errors === 1 ? '' : 's'}`, 'azpLocal.showGraph', [entry.file], `Show what to fix in ${name}; the graph appears once none are left`);
      }
      if (samePath(entry.file, file)) {
        add(top, 'run', '$(play) Run pipeline', 'azpLocal.run', [entry.file]);
        add(top, 'graph', '$(type-hierarchy-sub) Show graph', 'azpLocal.showGraph', [entry.file]);
        add(top, 'expand', 'Expand to final YAML', 'azpLocal.expand', [entry.file]);
      } else if (entry.loaded.pipeline.files.some((f) => samePath(f, file))) {
        // A template: say which pipeline reads it, and offer that pipeline's graph and run.
        const use = templateUse(entry.loaded.pipeline, file);
        const name = path.relative(entry.folder.root, entry.file).split(path.sep).join('/');
        const back = use.includedAt
          ? { command: 'azpLocal.goToSource', args: [use.includedAt], tooltip: 'Go to the line that includes this template' }
          : { command: 'vscode.open', args: [vscode.Uri.file(entry.file)], tooltip: `Open ${name}` };
        add(top, `template:${entry.file}`, `$(references) Template of ${name}`, back.command, back.args, back.tooltip);
        add(top, `graph:${entry.file}`, '$(type-hierarchy-sub) Show graph', 'azpLocal.showGraph', [entry.file, use.focus], `Graph of ${name}`);
        add(top, `run:${entry.file}`, '$(play) Run pipeline', 'azpLocal.run', [entry.file], `Run ${name}`);
      }
      for (const stage of entry.loaded.pipeline.stages) {
        if (!stage.implicit && samePath(stage.src.file, file)) {
          add(stage.src, `stage:${stage.id}`, '$(play) Run stage', 'azpLocal.runStage', [{ file: entry.file, stageId: stage.id }]);
          add(stage.src, `from:${stage.id}`, 'Run from here', 'azpLocal.runFromStage', [{ file: entry.file, stageId: stage.id }], 'Run this stage and every stage after it');
          add(stage.src, `graph:${stage.id}`, 'Show in graph', 'azpLocal.showGraph', [entry.file, stage.id]);
        }
        for (const job of stage.jobs) {
          if (!samePath(job.src.file, file) || (stage.implicit && job.src.line === 1)) continue;
          const base = `${stage.id}.${job.name}`;
          const legs = stage.jobs.filter((j) => j.name === job.name).length;
          add(job.src, `job:${base}`, legs > 1 ? `$(play) Run job (${legs} legs)` : '$(play) Run job', 'azpLocal.runJob', [{ file: entry.file, jobId: base }]);
          add(job.src, `graph:${base}`, 'Show in graph', 'azpLocal.showGraph', [entry.file, job.id]);
        }
      }
    }
    return lenses;
  }
}

export class Diagnostics implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection('azp-local');

  constructor(
    private readonly model: WorkspaceModel,
    private readonly runs: RunController,
  ) {
    model.onDidChange(() => this.update());
    runs.onDidChange(() => this.update());
    this.update();
  }

  dispose(): void {
    this.collection.dispose();
  }

  private update(): void {
    const byFile = new Map<string, vscode.Diagnostic[]>();
    const push = (src: SourceRef | undefined, message: string, severity: vscode.DiagnosticSeverity, code?: string) => {
      if (!src?.file) return;
      const line = Math.max(0, src.line - 1);
      const diagnostic = new vscode.Diagnostic(new vscode.Range(line, Math.max(0, src.column - 1), line, 1000), message, severity);
      diagnostic.source = 'Pipelines (local)';
      diagnostic.code = code;
      // The include chain: where the template that holds this line was pulled in.
      const related: vscode.DiagnosticRelatedInformation[] = [];
      for (let via = src.via; via; via = via.via) {
        related.push(new vscode.DiagnosticRelatedInformation(new vscode.Location(vscode.Uri.file(via.file), new vscode.Position(Math.max(0, via.line - 1), 0)), 'included from here'));
      }
      if (related.length) diagnostic.relatedInformation = related;
      const key = vscode.Uri.file(src.file).toString();
      byFile.set(key, [...(byFile.get(key) ?? []), diagnostic]);
    };
    const fromModel = (d: Diagnostic) =>
      push(d.source, d.message, d.severity === 'error' ? vscode.DiagnosticSeverity.Error : d.severity === 'warning' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information, d.code);

    for (const folder of this.model.folders) folder.config.diagnostics.forEach(fromModel);
    for (const entry of this.model.entries()) entry.loaded.pipeline.diagnostics.forEach(fromModel);

    // A failed step puts a squiggle on the line that defines it; issues with a source go where they point.
    const run = this.runs.shown;
    if (run && !run.live) {
      const jobs = run.pipeline.stages.flatMap((s) => s.jobs);
      for (const jobView of run.view.jobs.values()) {
        const job = jobs.find((j) => j.id === jobView.id);
        for (const stepView of jobView.steps) {
          const step = job?.steps.find((s) => s.id === stepView.id);
          if (step && stepView.state === 'failed') {
            push(step.src, `Step '${step.displayName}' failed in local run ${run.runId}${stepView.message ? `: ${stepView.message}` : '.'}`, vscode.DiagnosticSeverity.Error, 'step-failed');
          } else if (step && stepView.state === 'unsupported') {
            push(step.src, `Step '${step.displayName}' did not run locally${stepView.message ? `: ${stepView.message}` : '.'}`, vscode.DiagnosticSeverity.Information, 'step-unsupported');
          }
          for (const issue of stepView.issues) {
            if (issue.source) push(issue.source, issue.message, issue.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning, 'step-issue');
          }
        }
      }
    }

    this.collection.clear();
    for (const [uri, diagnostics] of byFile) this.collection.set(vscode.Uri.parse(uri), diagnostics);
  }
}
