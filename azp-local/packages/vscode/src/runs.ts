// Starts runs, follows their events and keeps the state the views draw. A run opened
// from history goes through the same RunView, so it looks like a live one.
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  RunView,
  createPlan,
  describeSelection,
  formatBuildNumber,
  formatDuration,
  resultLabel,
  startRun,
  type IsolationRisk,
  type JobResult,
  type Pipeline,
  type RunEvent,
  type RunMeta,
  type RunSession,
  type Selection,
  type TestSummary,
} from '@azp-local/core';
import { LocalEngine } from '@azp-local/engine-local';
import { samePath, type FolderState, type PipelineEntry, type WorkspaceModel } from './model';

export interface ShownRun {
  folder: FolderState;
  runId: string;
  /** The model as it was when the run started; the file may have changed since. */
  pipeline: Pipeline;
  view: RunView;
  /** Live log lines by `job/step`. Runs opened from history read the store instead. */
  logs: Map<string, string[]>;
  live: boolean;
  selection: string;
  session?: RunSession;
}

export const logKey = (jobId: string, stepId: string) => `${jobId}/${stepId}`;
export const formatLogLine = (at: number, line: string) => `${new Date(at).toISOString()} ${line}`;

export class RunController implements vscode.Disposable {
  shown?: ShownRun;
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChange = this.changed.event;
  private readonly logged = new vscode.EventEmitter<{ runId: string; jobId: string; stepId: string }>();
  readonly onDidLog = this.logged.event;
  private readonly finished = new vscode.EventEmitter<ShownRun>();
  readonly onDidFinish = this.finished.event;
  private readonly status: vscode.StatusBarItem;
  private readonly tests: vscode.TestController;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly model: WorkspaceModel,
  ) {
    this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
    this.status.command = 'azpLocal.cancel';
    this.tests = vscode.tests.createTestController('azpLocal.results', 'Pipelines (local)');
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    void this.shown?.session?.cancel();
    this.status.dispose();
    this.tests.dispose();
    this.changed.dispose();
    this.logged.dispose();
    this.finished.dispose();
  }

  get running(): boolean {
    return !!this.shown?.live;
  }

  /** The run to draw for a pipeline file, when there is one. */
  for(file: string): ShownRun | undefined {
    return this.shown && samePath(this.shown.pipeline.file, file) ? this.shown : undefined;
  }

  private notify(): void {
    // Events arrive in bursts; one redraw per burst is enough.
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.changed.fire();
    }, 120);
  }

  private secretKey(folder: FolderState, name: string, group?: string): string {
    return `azpLocal:${folder.root.toLowerCase()}:${group ?? ''}/${name}`;
  }

  async getSecret(folder: FolderState, name: string, group?: string): Promise<string | undefined> {
    const key = this.secretKey(folder, name, group);
    const stored = await this.context.secrets.get(key);
    if (stored !== undefined) return stored;
    const value = await vscode.window.showInputBox({
      title: `Secret '${name}'${group ? ` of variable group '${group}'` : ''}`,
      prompt: 'Kept in the operating system keychain, never in the workspace. Leave empty to run without it.',
      password: true,
      ignoreFocusOut: true,
    });
    if (!value) return undefined;
    await this.context.secrets.store(key, value);
    return value;
  }

  async manageSecrets(): Promise<void> {
    const items = this.model.folders.flatMap((folder) =>
      Object.entries(folder.config.variableGroups).flatMap(([group, values]) =>
        Object.entries(values)
          .filter(([, v]) => v.secret)
          .map(([name]) => ({ label: name, description: `${group}${this.model.folders.length > 1 ? ` (${folder.name})` : ''}`, folder, group, name })),
      ),
    );
    if (items.length === 0) {
      void vscode.window.showInformationMessage("No secrets are declared. Add one in .azp-local.yml: variableGroups: { my-group: { apiKey: { secret: true } } }");
      return;
    }
    const withState = await Promise.all(
      items.map(async (item) => ({ ...item, detail: (await this.context.secrets.get(this.secretKey(item.folder, item.name, item.group))) === undefined ? 'not set' : 'set' })),
    );
    const picked = await vscode.window.showQuickPick(withState, { placeHolder: 'Choose a secret to set or clear' });
    if (!picked) return;
    const key = this.secretKey(picked.folder, picked.name, picked.group);
    const value = await vscode.window.showInputBox({ title: `Secret '${picked.name}'`, prompt: 'New value. Leave empty to clear the stored value.', password: true, ignoreFocusOut: true });
    if (value === undefined) return;
    if (value === '') await this.context.secrets.delete(key);
    else await this.context.secrets.store(key, value);
    void vscode.window.showInformationMessage(value === '' ? `Secret '${picked.name}' cleared.` : `Secret '${picked.name}' stored in the keychain.`);
  }

  /**
   * Asks before a run that .azp-local.yml lets out of its container or gives host files.
   * The answer is kept in VS Code's own storage, never in the repository, and only for
   * exactly these settings: a change to any of them asks again.
   */
  private async approveIsolation(folder: FolderState, risks: IsolationRisk[], fingerprint: string): Promise<boolean> {
    const key = `azpLocal.isolationApproved:${folder.root.toLowerCase()}`;
    if (this.context.globalState.get<string>(key) === fingerprint) return true;
    const always = 'Allow for this repository';
    const once = 'Allow this run';
    const choice = await vscode.window.showWarningMessage(
      `.azp-local.yml in ${folder.name} weakens the isolation of this run`,
      {
        modal: true,
        detail: [
          ...risks.map((r) => `• ${r.message}`),
          '',
          'This file is part of the repository, so anyone who can change the repository can change these settings. Allow them only if you wrote them or have checked them.',
          `"${always}" is remembered until any of these settings change.`,
        ].join('\n'),
      },
      always,
      once,
    );
    if (choice === always) await this.context.globalState.update(key, fingerprint);
    return choice === always || choice === once;
  }

  async start(entry: PipelineEntry, selection: Selection, listener?: (event: RunEvent) => void): Promise<JobResult | undefined> {
    if (!vscode.workspace.isTrusted) {
      void vscode.window.showWarningMessage('Running a pipeline executes code from this repository. Trust the workspace first; the graph stays available without it.');
      return undefined;
    }
    if (this.running) {
      const choice = await vscode.window.showWarningMessage('A local run is already in progress.', 'Cancel it');
      if (choice) await this.cancel();
      return undefined;
    }
    // Plan from what the editor shows now, unsaved changes included.
    const fresh = this.model.load(entry.folder, entry.file);
    const { pipeline } = fresh.loaded;
    const errors = pipeline.diagnostics.filter((d) => d.severity === 'error');
    if (errors.length > 0) {
      void vscode.window.showErrorMessage(`The pipeline has ${errors.length} error(s), so nothing was run. First: ${errors[0].message}`);
      return undefined;
    }

    const { folder } = entry;
    const store = folder.store;
    const settings = vscode.workspace.getConfiguration('azpLocal');
    const inputs = this.model.inputs(entry.file);
    const buildId = store.nextBuildId();
    const buildNumber = formatBuildNumber(pipeline.name, new Date(), buildId, (base) => store.revision(base), fresh.loaded.staticVariables);
    const plan = createPlan(pipeline, selection, { history: store, variables: inputs.variables, buildId, buildNumber });
    if (!plan.jobs.some((j) => j.action === 'run')) {
      void vscode.window.showInformationMessage('Nothing to run: every job in that selection already passed.');
      return undefined;
    }

    const engine = new LocalEngine({
      imagesDir: this.context.asAbsolutePath(path.join('dist', 'images')),
      cacheDir: store.cacheDir,
      homeDir: this.context.globalStorageUri.fsPath,
      dockerHost: settings.get<string>('dockerHost') || undefined,
      maxParallelJobs: settings.get<number>('maxParallelJobs', 2),
      keepContainersOnFailure: settings.get<boolean>('keepContainersOnFailure', false),
      matchHostedHardware: settings.get<boolean>('matchHostedHardware', false),
      counter: (prefix, seed) => store.counter(prefix, seed),
    });

    const view = new RunView(plan.jobs.map((j) => ({ jobId: j.job.id, action: j.action })));
    const shown: ShownRun = { folder, runId: '', pipeline, view, logs: new Map(), live: true, selection: describeSelection(pipeline, selection) };
    const session = startRun({
      engine,
      plan,
      store,
      workspaceRoot: folder.root,
      config: folder.config,
      hooks: {
        getSecret: (name, group) => this.getSecret(folder, name, group),
        confirm: async (message) => (await vscode.window.showWarningMessage(message, { modal: true }, 'Run it')) === 'Run it',
        approveIsolation: (risks, fingerprint) => this.approveIsolation(folder, risks, fingerprint),
      },
      onEvent: (event) => {
        this.onEvent(shown, event);
        listener?.(event);
      },
    });
    shown.runId = session.runId;
    shown.session = session;
    this.shown = shown;
    void vscode.commands.executeCommand('setContext', 'azpLocal.running', true);
    this.status.text = `$(sync~spin) Pipeline ${shown.selection}`;
    this.status.tooltip = 'A local pipeline run is in progress. Click to cancel.';
    this.status.show();
    this.changed.fire();

    const outcome = await session.done;
    shown.live = false;
    void vscode.commands.executeCommand('setContext', 'azpLocal.running', false);
    this.status.hide();
    this.changed.fire();
    this.finished.fire(shown);
    void this.announce(shown, outcome);
    return outcome.result;
  }

  private onEvent(shown: ShownRun, event: RunEvent): void {
    shown.view.apply(event);
    if (event.type === 'log') {
      const key = logKey(event.jobId, event.stepId);
      const lines = shown.logs.get(key) ?? [];
      lines.push(formatLogLine(event.at, event.line));
      shown.logs.set(key, lines);
      this.logged.fire({ runId: shown.runId, jobId: event.jobId, stepId: event.stepId });
      return;
    }
    if (event.type === 'tests') this.reportTests(shown, event.summary);
    this.notify();
  }

  private async announce(shown: ShownRun, outcome: { result: JobResult; gaps: string[] }): Promise<void> {
    const took = shown.view.startedAt && shown.view.finishedAt ? ` in ${formatDuration(shown.view.finishedAt - shown.view.startedAt)}` : '';
    const text = `Local run of ${shown.selection}: ${resultLabel(outcome.result)}${took}.`;
    const actions = ['Show graph'];
    const failed = [...shown.view.jobs.values()].flatMap((job) => job.steps.filter((s) => s.state === 'failed').map((step) => ({ job, step })))[0];
    if (failed) actions.push('Open failed step');
    let choice: string | undefined;
    if (outcome.result === 'failed') choice = await vscode.window.showErrorMessage(text, ...actions);
    else if (outcome.result === 'succeededWithGaps') {
      choice = await vscode.window.showWarningMessage(`${text} ${outcome.gaps.length} step(s) or job(s) did not run as they would on Azure DevOps.`, ...actions);
    } else choice = await vscode.window.showInformationMessage(text, ...actions);
    if (choice === 'Show graph') void vscode.commands.executeCommand('azpLocal.showGraph', shown.pipeline.file);
    if (choice === 'Open failed step' && failed) void vscode.commands.executeCommand('azpLocal.openLog', { jobId: failed.job.id, stepId: failed.step.id });
  }

  async cancel(): Promise<void> {
    if (!this.shown?.session || !this.shown.live) return;
    this.status.text = '$(debug-stop) Canceling pipeline run';
    await this.shown.session.cancel();
  }

  /** Shows a past run: its graph state and logs are restored from the run store. */
  open(folder: FolderState, meta: RunMeta): ShownRun | undefined {
    if (this.running) {
      void vscode.window.showInformationMessage('A run is in progress; open past runs when it has finished.');
      return undefined;
    }
    const pipeline = folder.store.readPipeline(meta.runId);
    if (!pipeline) {
      void vscode.window.showWarningMessage(`Run ${meta.runId} can no longer be read from the run store.`);
      return undefined;
    }
    const view = new RunView(folder.store.readPlan(meta.runId).map((p) => ({ jobId: p.jobId, action: p.action })));
    for (const event of folder.store.readEvents(meta.runId)) view.apply(event);
    this.shown = { folder, runId: meta.runId, pipeline, view, logs: new Map(), live: false, selection: describeSelection(pipeline, meta.selection) };
    this.changed.fire();
    return this.shown;
  }

  forget(runId: string): void {
    if (this.shown?.runId === runId && !this.shown.live) {
      this.shown = undefined;
      this.changed.fire();
    }
  }

  logText(jobId: string, stepId: string, runId = this.shown?.runId): string {
    const shown = this.shown;
    if (shown && shown.runId === runId) {
      const live = shown.logs.get(logKey(jobId, stepId));
      if (live) return `${live.join('\n')}\n`;
      return shown.folder.store.readStepLog(shown.runId, jobId, stepId);
    }
    for (const folder of this.model.folders) {
      const text = runId ? folder.store.readStepLog(runId, jobId, stepId) : '';
      if (text) return text;
    }
    return '';
  }

  /** Published JUnit results also go to VS Code's Testing view, linked to source where the file is known. */
  private reportTests(shown: ShownRun, summary: TestSummary): void {
    const run = this.tests.createTestRun(new vscode.TestRunRequest(), `${summary.title} (${shown.runId})`, false);
    for (const testCase of summary.cases) {
      const fileName = testCase.file ?? testCase.suite ?? 'tests';
      const abs = testCase.file ? path.resolve(shown.folder.root, testCase.file) : undefined;
      const uri = abs && fs.existsSync(abs) ? vscode.Uri.file(abs) : undefined;
      const groupId = `${summary.title}::${fileName}`;
      let group = this.tests.items.get(groupId);
      if (!group) {
        group = this.tests.createTestItem(groupId, `${fileName}`, uri);
        group.description = summary.title;
        this.tests.items.add(group);
      }
      const id = `${groupId}::${testCase.name}`;
      let item = group.children.get(id);
      if (!item) {
        item = this.tests.createTestItem(id, testCase.name, uri);
        group.children.add(item);
      }
      if (testCase.outcome === 'passed') run.passed(item, testCase.durationMs);
      else if (testCase.outcome === 'skipped') run.skipped(item);
      else {
        const message = new vscode.TestMessage([testCase.message, testCase.details].filter(Boolean).join('\n\n') || 'Failed');
        const where = uri && /:(\d+):(\d+)\)?\s*$/m.exec(testCase.details ?? '');
        if (uri && where) message.location = new vscode.Location(uri, new vscode.Position(Number(where[1]) - 1, Number(where[2]) - 1));
        run.failed(item, message, testCase.durationMs);
      }
    }
    run.end();
  }
}
