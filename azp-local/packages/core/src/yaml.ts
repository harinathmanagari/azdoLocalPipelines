// YAML loading that keeps a source position on every node (D2). Template expansion
// works on these positioned nodes, so a step still knows its file and line after
// it has travelled through templates.
import { LineCounter, isAlias, isMap, isScalar, isSeq, parseDocument, stringify, type Node } from 'yaml';
import type { Diagnostic, SourceRef } from './types';

export interface PScalar {
  kind: 'scalar';
  /** Typed value as YAML reads it (string, number, boolean or null). */
  value: string | number | boolean | null;
  /** The text as written. Azure treats most scalars as strings, so `22` stays "22" and `true` stays "true". */
  text: string;
  src: SourceRef;
}
export interface PEntry {
  key: PScalar;
  value: PNode;
}
export interface PMap {
  kind: 'map';
  entries: PEntry[];
  src: SourceRef;
}
export interface PSeq {
  kind: 'seq';
  items: PNode[];
  src: SourceRef;
}
export type PNode = PScalar | PMap | PSeq;

export function loadYaml(text: string, file: string): { root: PNode | null; diagnostics: Diagnostic[] } {
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter, prettyErrors: false, uniqueKeys: false });
  const pos = (offset: number): SourceRef => {
    const p = lineCounter.linePos(offset);
    return { file, line: p.line, column: p.col };
  };
  const diagnostics: Diagnostic[] = [];
  for (const err of doc.errors) {
    diagnostics.push({ severity: 'error', message: err.message.split('\n')[0], source: pos(err.pos[0]), code: 'yaml' });
  }

  const convert = (node: Node | null | undefined, fallback: SourceRef): PNode => {
    if (node && isAlias(node)) node = node.resolve(doc) as Node | undefined;
    const src = node?.range ? pos(node.range[0]) : fallback;
    if (node && isMap(node)) {
      const entries: PEntry[] = [];
      const seen = new Map<string, SourceRef>();
      for (const pair of node.items) {
        const key = convert(pair.key as Node, src);
        if (key.kind !== 'scalar') {
          diagnostics.push({ severity: 'error', message: 'Mapping keys must be plain text.', source: key.src, code: 'yaml' });
          continue;
        }
        // `${{ if }}` and `${{ each }}` keys may repeat; every other key may appear once.
        if (!key.text.startsWith('${{')) {
          const first = seen.get(key.text);
          if (first) diagnostics.push({ severity: 'error', message: `Duplicate key '${key.text}': it is already set on line ${first.line}.`, source: key.src, code: 'yaml-duplicate-key' });
          else seen.set(key.text, key.src);
        }
        entries.push({ key, value: convert(pair.value as Node | null, key.src) });
      }
      return { kind: 'map', entries, src };
    }
    if (node && isSeq(node)) {
      return { kind: 'seq', items: node.items.map((item) => convert(item as Node, src)), src };
    }
    if (node && isScalar(node)) {
      const value = node.value;
      if (typeof value === 'string') return { kind: 'scalar', value, text: value, src };
      if (typeof value === 'number' || typeof value === 'boolean') {
        return { kind: 'scalar', value, text: typeof node.source === 'string' ? node.source : String(value), src };
      }
      if (typeof value === 'bigint') return { kind: 'scalar', value: Number(value), text: String(value), src };
      return { kind: 'scalar', value: null, text: '', src };
    }
    return { kind: 'scalar', value: null, text: '', src };
  };

  if (doc.contents === null) return { root: null, diagnostics };
  return { root: convert(doc.contents as Node, { file, line: 1, column: 1 }), diagnostics };
}

// --- small helpers for reading positioned nodes -----------------------------

export function isPMap(node: PNode | undefined): node is PMap {
  return node?.kind === 'map';
}
export function isPSeq(node: PNode | undefined): node is PSeq {
  return node?.kind === 'seq';
}
export function isPScalar(node: PNode | undefined): node is PScalar {
  return node?.kind === 'scalar';
}

/** Case-sensitive key lookup, as Azure Pipelines keys are. */
export function get(node: PNode | undefined, key: string): PNode | undefined {
  if (!isPMap(node)) return undefined;
  return node.entries.find((e) => e.key.text === key)?.value;
}

export function has(node: PNode | undefined, key: string): boolean {
  return get(node, key) !== undefined;
}

export function text(node: PNode | undefined): string | undefined {
  return isPScalar(node) ? node.text : undefined;
}

export function getText(node: PNode | undefined, key: string): string | undefined {
  return text(get(node, key));
}

export function scalar(value: string | number | boolean | null, src: SourceRef): PScalar {
  return { kind: 'scalar', value, text: value === null ? '' : String(value), src };
}

/** A copy of the tree with `via` appended to every node's include chain. */
export function withVia<T extends PNode>(node: T, via: SourceRef): T {
  const append = (src: SourceRef): SourceRef => ({ ...src, via: src.via ? append(src.via) : via });
  const walk = (n: PNode): PNode => {
    if (n.kind === 'map') {
      return { kind: 'map', src: append(n.src), entries: n.entries.map((e) => ({ key: walk(e.key) as PScalar, value: walk(e.value) })) };
    }
    if (n.kind === 'seq') return { kind: 'seq', src: append(n.src), items: n.items.map(walk) };
    return { ...n, src: append(n.src) };
  };
  return walk(node) as T;
}

export function toPlain(node: PNode | undefined): unknown {
  if (!node) return undefined;
  if (node.kind === 'map') {
    const out: Record<string, unknown> = {};
    for (const e of node.entries) out[e.key.text] = toPlain(e.value);
    return out;
  }
  if (node.kind === 'seq') return node.items.map(toPlain);
  return node.value;
}

/** Serialises an expanded tree back to YAML text (the local `finalYaml`). */
export function toYamlText(node: PNode): string {
  return stringify(toPlain(node), { lineWidth: 0, defaultStringType: 'PLAIN' });
}

export function describeSource(src: SourceRef | undefined): string {
  if (!src) return '';
  let out = `${src.file}:${src.line}:${src.column}`;
  if (src.via) out += ` (included from ${describeSource(src.via)})`;
  return out;
}
