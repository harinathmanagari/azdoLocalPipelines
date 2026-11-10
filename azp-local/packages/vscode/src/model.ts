// The extension's picture of the workspace: which files are pipelines, their
// expanded model and graph, the config file and the run store of each folder.
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  CONFIG_FILE,
  RunStore,
  buildGraph,
  discoverPipelines,
  loadConfig,
  loadPipeline,
  type GraphModel,
  type Job,
  type LoadedPipeline,
  type LocalConfig,
  type Pipeline,
  type SourceRef,
  type Stage,
  type Step,
} from '@azp-local/core';

export interface RunInputs {
  parameters: Record<string, unknown>;
  variables: Record<string, string>;
}

export interface PipelineEntry {
  folder: FolderState;
  file: string;
  loaded: LoadedPipeline;
  graph: GraphModel;
}

export interface FolderState {
  root: string;
  name: string;
  config: LocalConfig;
  store: RunStore;
  pipelines: Map<string, PipelineEntry>;
  templates: string[];
}

export const samePath = (a: string, b: string) => path.normalize(a).toLowerCase() === path.normalize(b).toLowerCase();

export class WorkspaceModel implements vscode.Disposable {
  readonly folders: FolderState[] = [];
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChange = this.changed.event;
  private readonly disposables: vscode.Disposable[] = [];
  private timer?: NodeJS.Timeout;

  constructor(private readonly context: vscode.ExtensionContext) {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{yml,yaml}');
    this.disposables.push(
      watcher,
      watcher.onDidCreate(() => this.schedule()),
      watcher.onDidDelete(() => this.schedule()),
      watcher.onDidChange(() => this.schedule()),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.schedule(0)),
      vscode.workspace.onDidChangeTextDocument((event) => {
        // Unsaved edits to a pipeline, one of its templates or the config file redraw everything.
        if (event.contentChanges.length > 0 && this.concerns(event.document.uri.fsPath)) this.schedule(400);
      }),
    );
    this.refresh();
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.changed.dispose();
    this.disposables.forEach((d) => d.dispose());
  }

  private concerns(file: string): boolean {
    if (path.basename(file) === CONFIG_FILE) return true;
    return this.folders.some((folder) => [...folder.pipelines.values()].some((entry) => entry.loaded.pipeline.files.some((f) => samePath(f, file))));
  }

  schedule(delay = 250): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.refresh(), delay);
  }

  /** File text as the editor has it, unsaved changes included. */
  readFile = (file: string): string | undefined => {
    const open = vscode.workspace.textDocuments.find((doc) => doc.uri.scheme === 'file' && samePath(doc.uri.fsPath, file));
    if (open) return open.getText();
    try {
      return fs.readFileSync(file, 'utf8');
    } catch {
      return undefined;
    }
  };

  inputs(file: string): RunInputs {
    return this.context.workspaceState.get<RunInputs>(`azpLocal.inputs:${file.toLowerCase()}`) ?? { parameters: {}, variables: {} };
  }

  async setInputs(file: string, inputs: RunInputs): Promise<void> {
    await this.context.workspaceState.update(`azpLocal.inputs:${file.toLowerCase()}`, inputs);
    this.refresh();
  }

  private storeRoot(folder: vscode.WorkspaceFolder): string {
    const base = this.context.storageUri?.fsPath ?? this.context.globalStorageUri.fsPath;
    return path.join(base, folder.name.replace(/[^A-Za-z0-9._-]/g, '_'));
  }

  load(folder: FolderState, file: string): PipelineEntry {
    const inputs = this.inputs(file);
    const loaded = loadPipeline(file, {
      workspaceRoot: folder.root,
      readFile: this.readFile,
      config: folder.config,
      parameters: inputs.parameters,
      variables: inputs.variables,
    });
    return { folder, file, loaded, graph: buildGraph(loaded.pipeline, loaded.staticVariables, folder.config) };
  }

  refresh(): void {
    const next: FolderState[] = [];
    for (const wf of vscode.workspace.workspaceFolders ?? []) {
      if (wf.uri.scheme !== 'file') continue;
      const root = wf.uri.fsPath;
      const config = loadConfig(root, this.readFile);
      const previous = this.folders.find((f) => samePath(f.root, root));
      const folder: FolderState = {
        root,
        name: wf.name,
        config,
        store: previous?.store ?? new RunStore(this.storeRoot(wf)),
        pipelines: new Map(),
        templates: [],
      };
      const found = discoverPipelines(root, config, this.readFile);
      folder.templates = found.templates;
      for (const file of found.pipelines) {
        try {
          folder.pipelines.set(file, this.load(folder, file));
        } catch (err) {
          console.error(`azp-local: could not load ${file}`, err);
        }
      }
      next.push(folder);
    }
    this.folders.splice(0, this.folders.length, ...next);
    this.changed.fire();
  }

  entries(): PipelineEntry[] {
    return this.folders.flatMap((folder) => [...folder.pipelines.values()]);
  }

  entry(file: string | undefined): PipelineEntry | undefined {
    return file ? this.entries().find((e) => samePath(e.file, file)) : undefined;
  }

  /** The pipelines a file belongs to: itself when it is one, otherwise those that read it as a template. */
  pipelinesOf(file: string | undefined): PipelineEntry[] {
    if (!file) return [];
    const own = this.entry(file);
    return own ? [own] : this.entries().filter((e) => e.loaded.pipeline.files.some((f) => samePath(f, file)));
  }

  folderOf(file: string): FolderState | undefined {
    return this.folders.find((folder) => !path.relative(folder.root, file).startsWith('..'));
  }

  private activeFile(): string | undefined {
    const active = vscode.window.activeTextEditor?.document.uri;
    return active?.scheme === 'file' ? active.fsPath : undefined;
  }

  /** The pipeline the user most likely means: the active editor's (or the one its template belongs to), or the only one. */
  current(): PipelineEntry | undefined {
    const fromEditor = this.pipelinesOf(this.activeFile());
    if (fromEditor.length === 1) return fromEditor[0];
    const all = this.entries();
    return all.length === 1 ? all[0] : undefined;
  }

  /** The pipeline `file` belongs to, else the one the user most likely means; asks when that is not clear. */
  async pick(placeHolder: string, file?: string): Promise<PipelineEntry | undefined> {
    const named = this.pipelinesOf(file);
    if (named.length === 1) return named[0];
    const current = named.length ? undefined : this.current();
    if (current) return current;
    // A template that several pipelines use offers only those.
    const users = named.length ? named : this.pipelinesOf(this.activeFile());
    const all = users.length > 1 ? users : this.entries();
    if (all.length === 0) {
      void vscode.window.showInformationMessage('No Azure Pipelines file was found in this workspace.');
      return undefined;
    }
    const picked = await vscode.window.showQuickPick(
      all.map((entry) => ({ label: path.relative(entry.folder.root, entry.file), description: entry.folder.name, entry })),
      { placeHolder },
    );
    return picked?.entry;
  }
}

export function findStage(pipeline: Pipeline, stageId: string): Stage | undefined {
  return pipeline.stages.find((s) => s.id === stageId);
}

export function findJob(pipeline: Pipeline, jobId: string): Job | undefined {
  return pipeline.stages.flatMap((s) => s.jobs).find((j) => j.id === jobId);
}

export function findStep(pipeline: Pipeline, jobId: string, stepId: string): Step | undefined {
  return findJob(pipeline, jobId)?.steps.find((s) => s.id === stepId);
}

/**
 * What a template contributes to an expanded pipeline: the stage or job that holds the first
 * thing it defines (to focus in the graph), and the line that included it.
 */
export function templateUse(pipeline: Pipeline, file: string): { focus?: string; includedAt?: SourceRef } {
  const inFile = (src: SourceRef | undefined): src is SourceRef => !!src && samePath(src.file, file);
  for (const stage of pipeline.stages) {
    if (!stage.implicit && inFile(stage.src)) return { focus: stage.id, includedAt: stage.src.via };
    for (const job of stage.jobs) {
      const src = [job.src, ...job.steps.filter((s) => !s.implicit).map((s) => s.src), ...job.variables.map((v) => v.src)].find(inFile);
      if (src) return { focus: job.id, includedAt: src.via };
    }
    const variable = stage.variables.find((v) => inFile(v.src));
    if (variable) return { focus: stage.implicit ? undefined : stage.id, includedAt: variable.src!.via };
  }
  return { includedAt: pipeline.variables.find((v) => inFile(v.src))?.src?.via };
}

export function toLocation(src: SourceRef): vscode.Location {
  return new vscode.Location(vscode.Uri.file(src.file), new vscode.Position(Math.max(0, src.line - 1), Math.max(0, src.column - 1)));
}

export async function reveal(src: SourceRef): Promise<void> {
  const location = toLocation(src);
  const editor = await vscode.window.showTextDocument(location.uri, { preview: true, viewColumn: vscode.ViewColumn.One });
  editor.selection = new vscode.Selection(location.range.start, location.range.start);
  editor.revealRange(location.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}
