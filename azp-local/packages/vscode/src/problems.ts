// What is wrong with a pipeline, as rows for the graph panel: its own findings, those of
// the templates it includes, and those of the config file. No vscode import, so it can be tested alone.
import * as path from 'node:path';
import type { Diagnostic, LocalConfig, Pipeline } from '@azp-local/core';
import type { Problem } from './webview/protocol';

const RANK = { error: 0, warning: 1, info: 2 } as const;

/** A path as the person knows it: relative to the workspace folder, with forward slashes. */
const shown = (root: string, file: string) => path.relative(root, file).split(path.sep).join('/') || path.basename(file);

function toProblem(root: string, d: Diagnostic): Problem {
  const { source } = d;
  if (!source?.file) return { severity: d.severity, message: d.message, code: d.code };
  const via = source.via;
  return {
    severity: d.severity,
    message: d.message,
    code: d.code,
    src: { file: source.file, line: source.line, column: source.column },
    file: shown(root, source.file),
    line: source.line,
    column: source.column,
    // Where the template holding this line was pulled in: the next place to look.
    includedFrom: via ? { file: shown(root, via.file), line: via.line, src: { file: via.file, line: via.line, column: via.column } } : undefined,
  };
}

/** Every finding about a pipeline, errors first, then in file and line order (the pipeline's own file leading). */
export function collectProblems(root: string, pipeline: Pipeline, config: LocalConfig): Problem[] {
  const own = shown(root, pipeline.file);
  const rows = [...config.diagnostics, ...pipeline.diagnostics].map((d) => toProblem(root, d));
  const fileRank = (p: Problem) => (p.file === own ? 0 : p.file ? 1 : 2);
  return rows.sort(
    (a, b) =>
      RANK[a.severity] - RANK[b.severity] ||
      fileRank(a) - fileRank(b) ||
      (a.file ?? '').localeCompare(b.file ?? '') ||
      (a.line ?? 0) - (b.line ?? 0) ||
      (a.column ?? 0) - (b.column ?? 0),
  );
}
