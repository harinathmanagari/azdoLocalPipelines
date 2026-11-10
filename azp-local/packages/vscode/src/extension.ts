// Azure Pipelines Local Runner: the VS Code shell over the core library and the
// local engine. Nothing here knows how to expand or run a pipeline; it only shows
// and starts things. Docker is contacted when a run starts or Doctor is asked for,
// so the graph works on a machine without it (D10).
import * as path from 'node:path';
import * as vscode from 'vscode';
import { analysePipelines, renderFindings, selectByName, toYamlText, type ParameterDecl, type Selection, type SourceRef } from '@azp-local/core';
import { checkDocker } from '@azp-local/engine-local';
import { Diagnostics, PipelineLenses } from './editor';
import { GraphPanels } from './graphPanel';
import { LOG_SCHEME, LogProvider } from './logs';
import { WorkspaceModel, findJob, findStep, reveal, samePath, templateUse, type PipelineEntry } from './model';
import { RunController } from './runs';
import { HistoryTree, PipelinesTree, type PipelineNode, type RunNode } from './tree';

const EXPANDED_SCHEME = 'azp-expanded';
const COMPANION = 'ms-azure-devops.azure-pipelines';

export interface ExtensionApi {
  model: WorkspaceModel;
  runs: RunController;
}

type EntryArg = PipelineNode | PipelineEntry | { file: string } | string | vscode.Uri | undefined;

export function activate(context: vscode.ExtensionContext): ExtensionApi {
  const model = new WorkspaceModel(context);
  const runs = new RunController(context, model);
  const logs = new LogProvider(runs);
  const pipelinesTree = new PipelinesTree(model, runs);
  const historyTree = new HistoryTree(model, runs);
  const output = vscode.window.createOutputChannel('Pipelines (local)');

  const fileOf = (arg: EntryArg): string | undefined => {
    if (!arg) return undefined;
    if (typeof arg === 'string') return arg;
    if (arg instanceof vscode.Uri) return arg.fsPath;
    if ('entry' in arg) return arg.entry.file;
    return arg.file;
  };
  // A template file resolves to the pipeline that reads it.
  const resolveEntry = (arg: EntryArg, placeHolder: string): Promise<PipelineEntry | undefined> => model.pick(placeHolder, fileOf(arg));
  const run = (entry: PipelineEntry | undefined, selection: Selection) => {
    if (entry) void runs.start(entry, selection);
  };

  const openLog = async (jobId: string, stepId: string) => {
    const shown = runs.shown;
    if (!shown) return;
    const job = findJob(shown.pipeline, jobId);
    const stepName = findStep(shown.pipeline, jobId, stepId)?.displayName ?? shown.view.jobs.get(jobId)?.steps.find((s) => s.id === stepId)?.displayName ?? stepId;
    const live = shown.live && shown.view.jobs.get(jobId)?.steps.find((s) => s.id === stepId)?.state === 'running';
    await logs.show(shown.runId, jobId, stepId, `${job?.displayName ?? jobId} - ${stepName}`, live);
  };

  const openShell = (jobId: string) => {
    const command = runs.shown?.view.jobs.get(jobId)?.container;
    if (!command) {
      void vscode.window.showInformationMessage("No container was kept for that job. Turn on 'azpLocal.keepContainersOnFailure' and run it again; a failed job then keeps its container.");
      return;
    }
    // An interactive shell needs a terminal, so this one place uses the docker command rather than the API.
    const terminal = vscode.window.createTerminal({ name: `Job ${findJob(runs.shown!.pipeline, jobId)?.displayName ?? jobId}` });
    terminal.show();
    terminal.sendText(command);
  };

  const panels = new GraphPanels(context, model, runs, {
    run: (entry, selection) => run(entry, selection),
    openLog: (jobId, stepId) => void openLog(jobId, stepId),
    reveal: (src: SourceRef) => void reveal(src),
    openShell,
  });

  const expandedChanged = new vscode.EventEmitter<vscode.Uri>();
  const expandedProvider: vscode.TextDocumentContentProvider = {
    onDidChange: expandedChanged.event,
    provideTextDocumentContent(uri) {
      const file = new URLSearchParams(uri.query).get('file') ?? '';
      const entry = model.entry(file);
      if (!entry?.loaded.expanded) return '# This pipeline could not be expanded. See the Problems view.\n';
      const errors = entry.loaded.pipeline.diagnostics.filter((d) => d.severity === 'error').length;
      return [
        `# ${path.relative(entry.folder.root, entry.file)} after template expansion, computed locally.`,
        '# Azure DevOps computes its own (finalYaml); the two can differ where the local expander',
        '# does not cover a construct. Such constructs are reported as errors rather than guessed.',
        ...(errors ? [`# ${errors} error(s) were reported; this output is incomplete.`] : []),
        '',
        toYamlText(entry.loaded.expanded),
      ].join('\n');
    },
  };
  model.onDidChange(() => {
    for (const doc of vscode.workspace.textDocuments) if (doc.uri.scheme === EXPANDED_SCHEME) expandedChanged.fire(doc.uri);
  });

  // True for a pipeline file and for a template one of them reads.
  const updateEditorContext = () => {
    const doc = vscode.window.activeTextEditor?.document;
    void vscode.commands.executeCommand('setContext', 'azpLocal.isPipelineEditor', !!doc && doc.uri.scheme === 'file' && model.pipelinesOf(doc.uri.fsPath).length > 0);
  };
  updateEditorContext();

  const setInputs = async (entry: PipelineEntry) => {
    for (;;) {
      const inputs = model.inputs(entry.file);
      const current = model.entry(entry.file) ?? entry;
      const params = current.loaded.pipeline.parameters;
      const values = current.loaded.pipeline.parameterValues;
      type Item = vscode.QuickPickItem & { param?: ParameterDecl; variable?: string; action?: 'addVariable' | 'reset' };
      const show = (value: unknown) => (typeof value === 'object' ? JSON.stringify(value) : String(value));
      const items: Item[] = [
        ...params.map((param) => ({
          label: `$(symbol-parameter) ${param.name}`,
          description: show(values[param.name]),
          detail: `${param.displayName ?? 'Parameter'} · ${param.type}${param.name in inputs.parameters ? ' · set for local runs' : param.name in entry.folder.config.parameters ? ' · from .azp-local.yml' : ' · default'}`,
          param,
        })),
        ...Object.entries(inputs.variables).map(([name, value]) => ({ label: `$(symbol-variable) ${name}`, description: value, detail: 'Variable · set for local runs', variable: name })),
        { label: '$(add) Set a variable…', detail: 'For example Build.Reason = PullRequest, or Build.SourceBranch = refs/heads/feature/x', action: 'addVariable' },
        { label: '$(discard) Reset to defaults', detail: 'Forget every value set here', action: 'reset' },
      ];
      const picked = await vscode.window.showQuickPick(items, { title: `Parameters and variables for ${path.basename(entry.file)}`, placeHolder: 'Choose a value to change. Esc when done.', matchOnDescription: true });
      if (!picked) return;
      if (picked.action === 'reset') {
        await model.setInputs(entry.file, { parameters: {}, variables: {} });
        continue;
      }
      if (picked.action === 'addVariable' || picked.variable) {
        const name = picked.variable ?? (await vscode.window.showInputBox({ title: 'Variable name', placeHolder: 'Build.Reason' }));
        if (!name) continue;
        const value = await vscode.window.showInputBox({ title: `Value of ${name}`, value: inputs.variables[name] ?? '', prompt: 'Leave empty to remove the override.' });
        if (value === undefined) continue;
        const variables = { ...inputs.variables };
        if (value === '') delete variables[name];
        else variables[name] = value;
        await model.setInputs(entry.file, { ...inputs, variables });
        continue;
      }
      const param = picked.param!;
      let next: unknown;
      if (param.type === 'boolean') {
        next = (await vscode.window.showQuickPick(['true', 'false'], { title: param.displayName ?? param.name }))?.toString();
        if (next !== undefined) next = next === 'true';
      } else if (param.values?.length) {
        next = await vscode.window.showQuickPick(param.values.map(String), { title: param.displayName ?? param.name });
      } else {
        const text = await vscode.window.showInputBox({
          title: param.displayName ?? param.name,
          value: show(values[param.name] ?? ''),
          prompt: ['string', 'number'].includes(param.type) ? `Type: ${param.type}` : `Type: ${param.type}. Enter JSON.`,
          validateInput: (value) => {
            if (param.type === 'number' && Number.isNaN(Number(value))) return 'Enter a number.';
            if (!['string', 'number'].includes(param.type)) {
              try {
                JSON.parse(value);
              } catch {
                return 'Enter valid JSON, for example ["a", "b"] or {"key": "value"}.';
              }
            }
            return undefined;
          },
        });
        if (text !== undefined) next = param.type === 'string' ? text : param.type === 'number' ? Number(text) : JSON.parse(text);
      }
      if (next !== undefined) await model.setInputs(entry.file, { ...inputs, parameters: { ...inputs.parameters, [param.name]: next } });
    }
  };

  const doctor = async () => {
    output.clear();
    output.show(true);
    output.appendLine('Doctor: checking Docker, images, disk and what the pipelines need decided…\n');
    for (const folder of model.folders) {
      const pipelines = [...folder.pipelines.values()].map((entry) => entry.loaded.pipeline);
      output.appendLine(`Workspace ${folder.root}`);
      output.appendLine(pipelines.length ? `Pipelines: ${pipelines.map((p) => path.relative(folder.root, p.file)).join(', ')}` : 'No pipeline files were found.');
      if (folder.templates.length) output.appendLine(`Templates: ${folder.templates.map((t) => path.relative(folder.root, t)).join(', ')}`);
      output.appendLine('');
      const findings = [
        ...(await checkDocker(pipelines, folder.config, { dockerHost: vscode.workspace.getConfiguration('azpLocal').get<string>('dockerHost') || undefined, storeDir: folder.store.root })),
        ...analysePipelines(pipelines, folder.config),
      ];
      findings.push({ level: 'info', area: 'Disk', message: `Run store: ${(folder.store.sizeBytes() / 1024 ** 2).toFixed(1)} MB in ${folder.store.listRuns().length} run(s) at ${folder.store.root}` });
      if (!vscode.workspace.isTrusted) findings.push({ level: 'warning', area: 'Security', message: 'The workspace is not trusted: the graph is drawn but nothing can be run.' });
      output.appendLine(renderFindings(findings));
      output.appendLine('');
    }
  };

  const register = (command: string, handler: (...args: never[]) => unknown) => context.subscriptions.push(vscode.commands.registerCommand(command, handler as (...args: unknown[]) => unknown));

  register('azpLocal.showGraph', async (arg: EntryArg, focus?: string) => {
    const entry = await resolveEntry(arg, 'Show the graph of which pipeline?');
    if (!entry) return;
    // Asked from a template: focus what the template puts into the pipeline.
    const file = fileOf(arg) ?? vscode.window.activeTextEditor?.document.uri.fsPath;
    const fromTemplate = file && !samePath(file, entry.file) ? templateUse(entry.loaded.pipeline, file).focus : undefined;
    panels.show(entry, typeof focus === 'string' ? focus : fromTemplate);
  });
  register('azpLocal.expand', async (arg: EntryArg) => {
    const entry = await resolveEntry(arg, 'Expand which pipeline?');
    if (!entry) return;
    const name = `${path.basename(entry.file).replace(/\.ya?ml$/i, '')}.final.yml`;
    const uri = vscode.Uri.from({ scheme: EXPANDED_SCHEME, path: `/${name}`, query: new URLSearchParams({ file: entry.file }).toString() });
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.languages.setTextDocumentLanguage(doc, 'yaml');
    await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
  });
  register('azpLocal.run', async (arg: EntryArg) => run(await resolveEntry(arg, 'Run which pipeline?'), { kind: 'pipeline' }));
  register('azpLocal.runStage', (arg: PipelineNode | { file: string; stageId: string }) => {
    if ('kind' in arg) return arg.kind === 'stage' && run(arg.entry, { kind: 'stage', stageId: arg.stage.id });
    return run(model.entry(arg.file), { kind: 'stage', stageId: arg.stageId });
  });
  register('azpLocal.runFromStage', (arg: PipelineNode | { file: string; stageId: string }) => {
    if ('kind' in arg) return arg.kind === 'stage' && run(arg.entry, { kind: 'stage', stageId: arg.stage.id, andLater: true });
    return run(model.entry(arg.file), { kind: 'stage', stageId: arg.stageId, andLater: true });
  });
  register('azpLocal.runJob', (arg: PipelineNode | { file: string; jobId: string }) => {
    if ('kind' in arg) return arg.kind === 'job' && run(arg.entry, { kind: 'job', jobId: arg.job.id });
    return run(model.entry(arg.file), { kind: 'job', jobId: arg.jobId });
  });
  register('azpLocal.runStep', (arg: PipelineNode) => {
    if (arg?.kind === 'step' && !('synthetic' in arg.step)) run(arg.entry, { kind: 'step', jobId: arg.job.id, stepId: arg.step.id });
  });
  register('azpLocal.rerunFailed', async (arg: RunNode | EntryArg) => {
    if (arg && typeof arg === 'object' && 'meta' in arg) {
      const entry = model.entry(arg.meta.pipelineFile);
      if (!entry) return void vscode.window.showWarningMessage(`${arg.meta.pipelineFile} is no longer a pipeline in this workspace.`);
      return run(entry, { kind: 'failed', runId: arg.meta.runId });
    }
    const entry = (runs.shown && model.entry(runs.shown.pipeline.file)) ?? (await resolveEntry(arg as EntryArg, 'Re-run the failed jobs of which pipeline?'));
    if (!entry) return;
    const last = runs.for(entry.file)?.runId ?? entry.folder.store.listRuns().find((r) => samePath(r.pipelineFile, entry.file))?.runId;
    if (!last) return void vscode.window.showInformationMessage('There is no earlier local run of this pipeline.');
    run(entry, { kind: 'failed', runId: last });
  });
  register('azpLocal.cancel', () => runs.cancel());
  register('azpLocal.openShell', (arg: PipelineNode | { jobId: string }) => openShell('kind' in arg ? (arg.kind === 'job' ? arg.job.id : '') : arg.jobId));
  register('azpLocal.setInputs', async (arg: EntryArg) => {
    const entry = await resolveEntry(arg, 'Set parameters and variables for which pipeline?');
    if (entry) await setInputs(entry);
  });
  register('azpLocal.manageSecrets', () => runs.manageSecrets());
  register('azpLocal.doctor', doctor);
  register('azpLocal.refresh', () => {
    model.refresh();
    historyTree.refresh();
  });
  register('azpLocal.openLog', (arg: PipelineNode | { jobId: string; stepId: string }) => {
    if ('kind' in arg) return arg.kind === 'step' ? openLog(arg.job.id, arg.step.id) : undefined;
    return openLog(arg.jobId, arg.stepId);
  });
  register('azpLocal.goToSource', (arg: PipelineNode | SourceRef) => {
    if (!('kind' in arg)) return reveal(arg);
    if (arg.kind === 'stage') return reveal(arg.stage.src);
    if (arg.kind === 'job') return reveal(arg.job.src);
    if (arg.kind === 'step' && !('synthetic' in arg.step)) return reveal(arg.step.src);
    return undefined;
  });
  register('azpLocal.openRun', (node: RunNode) => {
    const shown = runs.open(node.folder, node.meta);
    const entry = shown && model.entry(shown.pipeline.file);
    if (entry) panels.show(entry);
  });
  register('azpLocal.deleteRun', (node: RunNode) => {
    node.folder.store.deleteRun(node.meta.runId);
    runs.forget(node.meta.runId);
    historyTree.refresh();
  });
  register('azpLocal.clearRuns', async () => {
    if (runs.running) return void vscode.window.showInformationMessage('A run is in progress; delete runs when it has finished.');
    const count = model.folders.reduce((n, folder) => n + folder.store.listRuns().length, 0);
    if (count === 0) return;
    const choice = await vscode.window.showWarningMessage(`Delete ${count} local run(s), with their logs and artifacts? Later runs will have no earlier results to reuse.`, { modal: true }, 'Delete');
    if (choice !== 'Delete') return;
    for (const folder of model.folders) for (const meta of folder.store.listRuns()) folder.store.deleteRun(meta.runId);
    if (runs.shown) runs.forget(runs.shown.runId);
    historyTree.refresh();
  });

  // A local run as a VS Code task: bindable to a key, usable as a preLaunchTask.
  const taskFor = (definition: vscode.TaskDefinition, scope: vscode.WorkspaceFolder | vscode.TaskScope, name: string): vscode.Task =>
    new vscode.Task(
      definition,
      scope,
      name,
      'azp-local',
      new vscode.CustomExecution(async (resolved): Promise<vscode.Pseudoterminal> => {
        const write = new vscode.EventEmitter<string>();
        const close = new vscode.EventEmitter<number>();
        return {
          onDidWrite: write.event,
          onDidClose: close.event,
          close: () => void runs.cancel(),
          open: async () => {
            const say = (text: string) => write.fire(`${text.replace(/\r?\n/g, '\r\n')}\r\n`);
            try {
              const folder = typeof scope === 'object' ? model.folders.find((f) => samePath(f.root, scope.uri.fsPath)) : model.folders[0];
              const wanted = typeof resolved.pipeline === 'string' && folder ? path.resolve(folder.root, resolved.pipeline) : undefined;
              const entry = wanted ? model.entry(wanted) : folder && folder.pipelines.size === 1 ? [...folder.pipelines.values()][0] : model.current();
              if (!entry) throw new Error("No pipeline to run. Set 'pipeline' in the task to the file to run.");
              const selection = selectByName(entry.loaded.pipeline, { stage: resolved.stage, job: resolved.job });
              const names = new Map(entry.loaded.pipeline.stages.flatMap((s) => s.jobs).map((j) => [j.id, j.displayName]));
              const result = await runs.start(entry, selection, (event) => {
                if (event.type === 'log') say(`${names.get(event.jobId) ?? event.jobId} | ${event.line}`);
                else if (event.type === 'step.finished') say(`${names.get(event.jobId) ?? event.jobId} > ${event.stepId}: ${event.result}${event.message ? ` (${event.message})` : ''}`);
                else if (event.type === 'job.finished') say(`${names.get(event.jobId) ?? event.jobId}: job ${event.result}`);
                else if (event.type === 'run.finished') {
                  say(`\nResult: ${event.result}`);
                  for (const gap of event.gaps) say(`  did not run as on Azure DevOps: ${gap}`);
                }
              });
              close.fire(result === 'succeeded' || result === 'succeededWithIssues' || result === 'skipped' ? 0 : result === 'succeededWithGaps' ? 3 : 1);
            } catch (err) {
              say((err as Error).message);
              close.fire(1);
            }
          },
        };
      }),
    );

  context.subscriptions.push(
    model,
    runs,
    logs,
    panels,
    output,
    expandedChanged,
    new Diagnostics(model, runs),
    vscode.window.registerTreeDataProvider('azpLocal.pipelines', pipelinesTree),
    vscode.window.registerTreeDataProvider('azpLocal.history', historyTree),
    vscode.workspace.registerTextDocumentContentProvider(LOG_SCHEME, logs),
    vscode.workspace.registerTextDocumentContentProvider(EXPANDED_SCHEME, expandedProvider),
    vscode.languages.registerFoldingRangeProvider({ scheme: LOG_SCHEME }, logs),
    vscode.languages.registerDocumentLinkProvider({ scheme: LOG_SCHEME }, logs),
    vscode.languages.registerCodeLensProvider([{ scheme: 'file', pattern: '**/*.{yml,yaml}' }], new PipelineLenses(model)),
    vscode.window.onDidChangeActiveTextEditor(updateEditorContext),
    model.onDidChange(updateEditorContext),
    vscode.tasks.registerTaskProvider('azp-local', {
      provideTasks: () =>
        model.folders.flatMap((folder) => {
          const scope = vscode.workspace.workspaceFolders?.find((wf) => samePath(wf.uri.fsPath, folder.root)) ?? vscode.TaskScope.Workspace;
          return [...folder.pipelines.values()].map((entry) => {
            const relative = path.relative(folder.root, entry.file).split(path.sep).join('/');
            return taskFor({ type: 'azp-local', pipeline: relative }, scope, `Run ${relative}`);
          });
        }),
      resolveTask: (task) => taskFor(task.definition, task.scope ?? vscode.TaskScope.Workspace, task.name),
    }),
  );

  // D8: this extension complements Microsoft's (syntax, schema, IntelliSense); suggest it once.
  if (model.entries().length > 0 && !vscode.extensions.getExtension(COMPANION) && !context.globalState.get<boolean>('azpLocal.suggestedCompanion')) {
    void context.globalState.update('azpLocal.suggestedCompanion', true);
    void vscode.window
      .showInformationMessage('Pipelines (local) draws and runs pipelines. For YAML IntelliSense and schema validation, Microsoft’s Azure Pipelines extension is a good companion.', 'Show it')
      .then((choice) => choice && vscode.commands.executeCommand('extension.open', COMPANION));
  }

  return { model, runs };
}

export function deactivate(): void {
  /* subscriptions dispose the model, the run controller and the views */
}
