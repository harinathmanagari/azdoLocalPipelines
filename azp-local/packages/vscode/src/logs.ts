// Step logs as read-only virtual documents: native text, so themes, search, folding
// and screen readers work. `##[group]` sections fold; file references become links.
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { RunController } from './runs';

export const LOG_SCHEME = 'azp-log';

export function logUri(runId: string, jobId: string, stepId: string, title: string): vscode.Uri {
  const name = title.replace(/[\\/:*?"<>|#%]/g, '-').slice(0, 80) || stepId;
  return vscode.Uri.from({ scheme: LOG_SCHEME, path: `/${runId}/${name}.log`, query: new URLSearchParams({ run: runId, job: jobId, step: stepId }).toString() });
}

function parse(uri: vscode.Uri): { run: string; job: string; step: string } {
  const query = new URLSearchParams(uri.query);
  return { run: query.get('run') ?? '', job: query.get('job') ?? '', step: query.get('step') ?? '' };
}

export class LogProvider implements vscode.TextDocumentContentProvider, vscode.FoldingRangeProvider, vscode.DocumentLinkProvider {
  private readonly changed = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this.changed.event;
  private readonly pending = new Map<string, NodeJS.Timeout>();

  constructor(private readonly runs: RunController) {
    runs.onDidLog(({ runId, jobId, stepId }) => {
      for (const doc of vscode.workspace.textDocuments) {
        if (doc.uri.scheme !== LOG_SCHEME) continue;
        const target = parse(doc.uri);
        if (target.run !== runId || target.job !== jobId || target.step !== stepId) continue;
        const key = doc.uri.toString();
        if (this.pending.has(key)) continue;
        // Output can arrive line by line; refresh an open log a few times a second at most.
        this.pending.set(
          key,
          setTimeout(() => {
            this.pending.delete(key);
            this.changed.fire(doc.uri);
          }, 250),
        );
      }
    });
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    const { run, job, step } = parse(uri);
    return this.runs.logText(job, step, run) || 'No output was recorded for this step.\n';
  }

  provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
    const ranges: vscode.FoldingRange[] = [];
    const open: number[] = [];
    for (let i = 0; i < document.lineCount; i++) {
      const text = document.lineAt(i).text;
      if (text.includes('##[group]')) open.push(i);
      else if (text.includes('##[endgroup]') && open.length > 0) ranges.push(new vscode.FoldingRange(open.pop()!, i, vscode.FoldingRangeKind.Region));
    }
    return ranges;
  }

  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const root = this.runs.shown?.folder.root;
    if (!root) return [];
    const links: vscode.DocumentLink[] = [];
    const pattern = /((?:[A-Za-z]:)?[\w@.\\/-]+\.[A-Za-z]\w{0,5})(?::(\d+))(?::(\d+))?/g;
    const exists = new Map<string, string | undefined>();
    const resolve = (reported: string): string | undefined => {
      if (exists.has(reported)) return exists.get(reported);
      // A path inside the job (/__w/1/s/src/a.ts, C:\...\1\s\src\a.ts) maps back to the workspace.
      const inside = /(?:^|[\\/])1[\\/]s[\\/](.+)$/.exec(reported);
      const candidates = [inside ? path.join(root, inside[1]) : undefined, path.isAbsolute(reported) ? reported : path.join(root, reported)];
      const found = candidates.find((c): c is string => !!c && fs.existsSync(c) && fs.statSync(c).isFile());
      exists.set(reported, found);
      return found;
    };
    const lines = Math.min(document.lineCount, 5000);
    for (let i = 0; i < lines; i++) {
      const text = document.lineAt(i).text;
      if (!text.includes(':')) continue;
      pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text))) {
        const file = resolve(m[1]);
        if (!file) continue;
        const target = vscode.Uri.file(file).with({ fragment: `L${m[2]}${m[3] ? `,${m[3]}` : ''}` });
        const link = new vscode.DocumentLink(new vscode.Range(i, m.index, i, m.index + m[0].length), target);
        link.tooltip = 'Open in the workspace';
        links.push(link);
      }
    }
    return links;
  }

  async show(runId: string, jobId: string, stepId: string, title: string, follow: boolean): Promise<void> {
    const uri = logUri(runId, jobId, stepId, title);
    let document = await vscode.workspace.openTextDocument(uri);
    if (document.languageId !== 'azp-log') document = await vscode.languages.setTextDocumentLanguage(document, 'azp-log');
    this.changed.fire(uri);
    const editor = await vscode.window.showTextDocument(document, { preview: true, viewColumn: vscode.ViewColumn.Active });
    if (follow) {
      const end = new vscode.Position(Math.max(0, document.lineCount - 1), 0);
      editor.revealRange(new vscode.Range(end, end));
    }
  }

  dispose(): void {
    this.pending.forEach((timer) => clearTimeout(timer));
    this.changed.dispose();
  }
}
