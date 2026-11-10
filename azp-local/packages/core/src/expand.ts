// Template pass: `${{ }}` expressions, `${{ if }}` / `${{ each }}` / `${{ insert }}`,
// `template:` includes for stages, jobs, steps and variables, and `extends:`.
// The result is one positioned tree, the local equivalent of the Preview API's finalYaml.
import * as path from 'node:path';
import { ExprError, evaluate, isObject, pnodeToValue, toBool, toStr, valueToPNode, type EvalContext, type Value } from './expressions';
import type { Diagnostic, ParameterDecl, SourceRef } from './types';
import { get, getText, isPMap, isPSeq, loadYaml, withVia, type PEntry, type PMap, type PNode, type PScalar, type PSeq } from './yaml';

export interface ExpandOptions {
  workspaceRoot: string;
  /** Returns the text of a file, or undefined when it does not exist. The editor's unsaved text can be served here. */
  readFile(absPath: string): string | undefined;
  /** `resources.repositories` alias -> local folder. */
  repositories?: Record<string, string>;
  /** Values for the pipeline's own parameters; defaults are used for the rest. */
  parameters?: Record<string, unknown>;
  /** Variables known before the run is planned: predefined ones and config-file overrides. */
  variables?: Record<string, string>;
}

export interface ExpandResult {
  root: PMap | null;
  diagnostics: Diagnostic[];
  files: string[];
  parameters: ParameterDecl[];
  parameterValues: Record<string, unknown>;
}

type Section = 'stages' | 'jobs' | 'steps' | 'variables';
type Directive =
  | { kind: 'if' | 'elseif'; expr: string }
  | { kind: 'else' }
  | { kind: 'insert' }
  | { kind: 'each'; variable: string; expr: string };

interface Scope {
  named: Record<string, Value>;
}

interface FileRef {
  path: string;
  /** Root of the repository the file belongs to; `/absolute` template paths resolve against it. */
  repoRoot: string;
}

const MAX_DEPTH = 50;
const LIFECYCLE_HOOKS = ['preDeploy', 'deploy', 'routeTraffic', 'postRouteTraffic'];

/** Splits text into literal and `${{ expression }}` parts, skipping `}}` inside quoted strings. */
export function splitExpressions(text: string): ({ lit: string } | { expr: string })[] {
  const parts: ({ lit: string } | { expr: string })[] = [];
  let i = 0;
  let lit = '';
  while (i < text.length) {
    if (text.startsWith('${{', i)) {
      let j = i + 3;
      let quoted = false;
      while (j < text.length) {
        if (text[j] === "'") quoted = !quoted;
        else if (!quoted && text.startsWith('}}', j)) break;
        j++;
      }
      if (j >= text.length) break; // unterminated: treat the rest as literal
      if (lit) parts.push({ lit });
      lit = '';
      parts.push({ expr: text.slice(i + 3, j).trim() });
      i = j + 2;
    } else {
      lit += text[i++];
    }
  }
  lit += text.slice(i);
  if (lit) parts.push({ lit });
  return parts;
}

function parseDirective(keyText: string): Directive | undefined {
  const parts = splitExpressions(keyText.trim());
  if (parts.length !== 1 || !('expr' in parts[0])) return undefined;
  const body = parts[0].expr;
  let m: RegExpExecArray | null;
  if ((m = /^(if|elseif)\s+([\s\S]+)$/i.exec(body))) return { kind: m[1].toLowerCase() as 'if' | 'elseif', expr: m[2] };
  if (/^else$/i.test(body)) return { kind: 'else' };
  if (/^insert$/i.test(body)) return { kind: 'insert' };
  if ((m = /^each\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([\s\S]+)$/i.exec(body))) return { kind: 'each', variable: m[1], expr: m[2] };
  return undefined;
}

class Expander {
  readonly diagnostics: Diagnostic[] = [];
  readonly files = new Set<string>();
  private readonly stack: string[] = [];

  constructor(private readonly opts: ExpandOptions) {}

  error(message: string, source: SourceRef | undefined, code = 'expand'): void {
    this.diagnostics.push({ severity: 'error', message, source, code });
  }

  load(file: string, site: SourceRef | undefined): PMap | null {
    const text = this.opts.readFile(file);
    if (text === undefined) {
      this.error(`File not found: ${path.relative(this.opts.workspaceRoot, file) || file}`, site, 'template-not-found');
      return null;
    }
    this.files.add(file);
    const { root, diagnostics } = loadYaml(text, file);
    // A problem found while reading a template says where that template was included from, as every other line of it does.
    this.diagnostics.push(...diagnostics.map((d) => (site && d.source ? { ...d, source: { ...d.source, via: site } } : d)));
    if (root === null) return { kind: 'map', entries: [], src: { file, line: 1, column: 1 } };
    if (!isPMap(root)) {
      this.error('A pipeline or template file must be a mapping at the top level.', root.src);
      return null;
    }
    return root;
  }

  // --- parameters ------------------------------------------------------------

  bindParameters(
    tree: PMap,
    passed: Record<string, Value>,
    site: SourceRef,
    isRoot: boolean,
  ): { decls: ParameterDecl[]; values: Record<string, Value> } {
    const declNode = get(tree, 'parameters');
    const decls: ParameterDecl[] = [];
    const values: Record<string, Value> = {};

    if (isPSeq(declNode)) {
      const known = new Set<string>();
      for (const item of declNode.items) {
        const name = getText(item, 'name');
        if (!name) {
          this.error('A parameter needs a name.', item.src);
          continue;
        }
        known.add(name);
        const type = getText(item, 'type') ?? 'string';
        const defaultNode = get(item, 'default');
        const allowed = get(item, 'values');
        const decl: ParameterDecl = {
          name,
          type,
          displayName: getText(item, 'displayName'),
          hasDefault: defaultNode !== undefined,
          default: defaultNode ? stripValue(pnodeToValue(defaultNode)) : undefined,
          values: isPSeq(allowed) ? allowed.items.map((v) => stripValue(pnodeToValue(v))) : undefined,
          src: item.src,
        };
        decls.push(decl);

        let value: Value;
        if (Object.prototype.hasOwnProperty.call(passed, name)) {
          value = passed[name];
        } else if (defaultNode) {
          value = type === 'string' && defaultNode.kind === 'scalar' ? defaultNode.text : pnodeToValue(defaultNode);
        } else {
          this.error(
            isRoot
              ? `Parameter '${name}' has no default. Give it a value in .azp-local.yml under 'parameters:' or when starting the run.`
              : `A value for the '${name}' parameter must be provided.`,
            isRoot ? item.src : site,
            'parameter-missing',
          );
          value = type === 'boolean' ? false : type === 'number' ? 0 : '';
        }
        value = this.castParameter(name, type, value, site);
        if (decl.values && !decl.values.some((v) => String(v).toLowerCase() === (typeof value === 'object' ? '' : String(value)).toLowerCase())) {
          this.error(`'${String(value)}' is not an allowed value for parameter '${name}' (${decl.values.join(', ')}).`, site, 'parameter-value');
        }
        values[name] = value;
      }
      for (const name of Object.keys(passed)) {
        if (!known.has(name)) this.error(`Unexpected parameter '${name}'.`, isRoot ? declNode.src : site, 'parameter-unexpected');
      }
    } else if (isPMap(declNode)) {
      for (const entry of declNode.entries) {
        values[entry.key.text] = pnodeToValue(entry.value);
        decls.push({ name: entry.key.text, type: 'object', hasDefault: true, default: stripValue(values[entry.key.text]), src: entry.key.src });
      }
      Object.assign(values, passed);
    } else {
      Object.assign(values, passed);
    }
    return { decls, values };
  }

  private castParameter(name: string, type: string, value: Value, site: SourceRef): Value {
    const isScalarValue = value === null || typeof value !== 'object';
    switch (type.toLowerCase()) {
      case 'string':
        if (!isScalarValue) {
          this.error(`Parameter '${name}' expects a string.`, site, 'parameter-type');
          return '';
        }
        // A literal written in YAML keeps its text ("true", "22"), unlike the result of an expression.
        return typeof value === 'boolean' ? String(value) : toStr(value);
      case 'boolean': {
        if (typeof value === 'boolean') return value;
        const text = isScalarValue ? toStr(value).toLowerCase() : '';
        if (text === 'true' || text === 'false') return text === 'true';
        this.error(`Parameter '${name}' expects true or false.`, site, 'parameter-type');
        return false;
      }
      case 'number': {
        const n = isScalarValue ? Number(toStr(value)) : NaN;
        if (Number.isNaN(n)) {
          this.error(`Parameter '${name}' expects a number.`, site, 'parameter-type');
          return 0;
        }
        return n;
      }
      default:
        return value;
    }
  }

  // --- expression pass ---------------------------------------------------------

  private evalExpr(expr: string, scope: Scope, src: SourceRef): Value {
    try {
      return evaluate(expr, scope as EvalContext);
    } catch (err) {
      if (err instanceof ExprError) {
        this.error(`${err.message} (in \${{ ${expr} }})`, src, 'expression');
        return null;
      }
      throw err;
    }
  }

  expandNode(node: PNode, scope: Scope): PNode {
    if (node.kind === 'map') return this.expandMap(node, scope);
    if (node.kind === 'seq') return this.expandSeq(node, scope);
    return this.expandScalar(node, scope);
  }

  private expandScalar(node: PScalar, scope: Scope): PNode {
    if (typeof node.value !== 'string' || !node.text.includes('${{')) return node;
    const parts = splitExpressions(node.text);
    if (parts.length === 1 && 'expr' in parts[0]) {
      return valueToPNode(this.evalExpr(parts[0].expr, scope, node.src), node.src);
    }
    let out = '';
    for (const part of parts) {
      if ('lit' in part) {
        out += part.lit;
        continue;
      }
      const value = this.evalExpr(part.expr, scope, node.src);
      try {
        out += toStr(value);
      } catch (err) {
        this.error(`${(err as Error).message} (in \${{ ${part.expr} }})`, node.src, 'expression');
      }
    }
    return { kind: 'scalar', value: out, text: out, src: node.src };
  }

  private bindings(d: Extract<Directive, { kind: 'each' }>, scope: Scope, src: SourceRef): Scope[] {
    const collection = this.evalExpr(d.expr, scope, src);
    const bind = (value: Value): Scope => ({ named: { ...scope.named, [d.variable]: value } });
    if (Array.isArray(collection)) return collection.map(bind);
    if (isObject(collection)) return Object.keys(collection).map((key) => bind({ key, value: collection[key] }));
    if (collection !== null) this.error(`\${{ each }} needs a sequence or a mapping, got '${String(collection)}'.`, src, 'expression');
    return [];
  }

  private expandMap(map: PMap, scope: Scope): PMap {
    const out: PEntry[] = [];
    const put = (entry: PEntry) => {
      const index = out.findIndex((e) => e.key.text === entry.key.text);
      if (index >= 0) out[index] = entry;
      else out.push(entry);
    };
    const merge = (value: PNode, src: SourceRef) => {
      if (value.kind === 'map') value.entries.forEach(put);
      else if (!(value.kind === 'scalar' && value.value === null)) this.error('A mapping was expected inside this template expression.', src);
    };
    // open: an `if` was seen and no branch has been taken yet.
    let chain: 'none' | 'open' | 'closed' = 'none';

    for (const entry of map.entries) {
      const d = parseDirective(entry.key.text);
      const src = entry.key.src;
      if (!d) {
        chain = 'none';
        const key = this.expandScalar(entry.key, scope);
        if (key.kind !== 'scalar') {
          this.error('A mapping key must expand to text.', src);
          continue;
        }
        put({ key, value: this.expandNode(entry.value, scope) });
        continue;
      }
      switch (d.kind) {
        case 'if': {
          const taken = toBool(this.evalExpr(d.expr, scope, src));
          chain = taken ? 'closed' : 'open';
          if (taken) merge(this.expandNode(entry.value, scope), src);
          break;
        }
        case 'elseif':
          if (chain === 'none') this.error('${{ elseif }} must follow ${{ if }}.', src);
          else if (chain === 'open' && toBool(this.evalExpr(d.expr, scope, src))) {
            chain = 'closed';
            merge(this.expandNode(entry.value, scope), src);
          }
          break;
        case 'else':
          if (chain === 'none') this.error('${{ else }} must follow ${{ if }}.', src);
          else if (chain === 'open') merge(this.expandNode(entry.value, scope), src);
          chain = 'none';
          break;
        case 'each':
          chain = 'none';
          for (const inner of this.bindings(d, scope, src)) merge(this.expandNode(entry.value, inner), src);
          break;
        case 'insert':
          chain = 'none';
          merge(this.expandNode(entry.value, scope), src);
          break;
      }
    }
    return { kind: 'map', entries: out, src: map.src };
  }

  private expandSeq(seq: PSeq, scope: Scope): PSeq {
    const out: PNode[] = [];
    const splice = (value: PNode) => {
      if (value.kind === 'seq') out.push(...value.items);
      else if (!(value.kind === 'scalar' && value.value === null)) out.push(value);
    };
    let chain: 'none' | 'open' | 'closed' = 'none';

    for (const item of seq.items) {
      const only = item.kind === 'map' && item.entries.length === 1 ? item.entries[0] : undefined;
      const d = only ? parseDirective(only.key.text) : undefined;
      if (only && d && d.kind !== 'insert') {
        const src = only.key.src;
        switch (d.kind) {
          case 'if': {
            const taken = toBool(this.evalExpr(d.expr, scope, src));
            chain = taken ? 'closed' : 'open';
            if (taken) splice(this.expandNode(only.value, scope));
            break;
          }
          case 'elseif':
            if (chain === 'none') this.error('${{ elseif }} must follow ${{ if }}.', src);
            else if (chain === 'open' && toBool(this.evalExpr(d.expr, scope, src))) {
              chain = 'closed';
              splice(this.expandNode(only.value, scope));
            }
            break;
          case 'else':
            if (chain === 'none') this.error('${{ else }} must follow ${{ if }}.', src);
            else if (chain === 'open') splice(this.expandNode(only.value, scope));
            chain = 'none';
            break;
          case 'each':
            chain = 'none';
            for (const inner of this.bindings(d, scope, src)) splice(this.expandNode(only.value, inner));
            break;
        }
        continue;
      }
      chain = 'none';
      // `- ${{ parameters.steps }}` inserts the items of a list in place.
      if (item.kind === 'scalar' && typeof item.value === 'string') {
        const parts = splitExpressions(item.text);
        if (parts.length === 1 && 'expr' in parts[0]) {
          const value = this.evalExpr(parts[0].expr, scope, item.src);
          if (Array.isArray(value)) out.push(...value.map((v) => valueToPNode(v, item.src)));
          else out.push(valueToPNode(value, item.src));
          continue;
        }
      }
      out.push(this.expandNode(item, scope));
    }
    return { kind: 'seq', items: out, src: seq.src };
  }

  // --- files and includes ------------------------------------------------------

  private resolveTemplate(ref: string, from: FileRef, site: SourceRef): FileRef | undefined {
    let file = ref;
    let repoRoot = from.repoRoot;
    const at = ref.lastIndexOf('@');
    if (at > 0) {
      const alias = ref.slice(at + 1);
      file = ref.slice(0, at);
      if (alias !== 'self') {
        const mapped = this.opts.repositories?.[alias];
        if (!mapped) {
          this.error(
            `Repository alias '${alias}' is not mapped to a local folder. Add it under 'repositories:' in .azp-local.yml.`,
            site,
            'repository-unmapped',
          );
          return undefined;
        }
        repoRoot = path.resolve(this.opts.workspaceRoot, mapped);
      } else {
        repoRoot = this.opts.workspaceRoot;
      }
      return { path: path.join(repoRoot, file), repoRoot };
    }
    if (file.startsWith('/') || file.startsWith('\\')) return { path: path.join(repoRoot, file), repoRoot };
    return { path: path.resolve(path.dirname(from.path), file), repoRoot };
  }

  /** Expands one file: its variables first, then everything else, then the templates it includes. */
  expandFile(tree: PMap, file: FileRef, scope: Scope, depth: number): PMap {
    const local: Scope = { named: { ...scope.named, variables: { ...(scope.named.variables as { [key: string]: Value }) } } };
    const staticVars = local.named.variables as { [key: string]: Value };

    let variables: PNode | undefined;
    const variablesEntry = tree.entries.find((e) => e.key.text === 'variables');
    if (variablesEntry) {
      variables = this.resolveVariables(this.expandNode(variablesEntry.value, local), file, local, depth);
      for (const item of normaliseVariables(variables)) {
        const name = getText(item, 'name');
        const value = getText(item, 'value');
        if (name && value !== undefined) staticVars[name] = value;
      }
    }

    const rest: PMap = { kind: 'map', src: tree.src, entries: tree.entries.filter((e) => e.key.text !== 'parameters' && e.key.text !== 'variables') };
    const expanded = this.expandMap(rest, local);
    if (variables && variablesEntry) {
      // Keep `variables` where it was written so the expanded file reads like the source.
      const index = tree.entries.filter((e) => e.key.text !== 'parameters').indexOf(variablesEntry);
      expanded.entries.splice(Math.min(index, expanded.entries.length), 0, { key: variablesEntry.key, value: variables });
    }
    return this.resolveStructure(expanded, file, local, depth);
  }

  private include(item: PMap, section: Section, from: FileRef, scope: Scope, depth: number): PNode[] {
    const ref = getText(item, 'template') ?? '';
    const target = this.resolveTemplate(ref, from, item.src);
    if (!target) return [];
    if (depth >= MAX_DEPTH || this.stack.includes(target.path)) {
      this.error(`Template '${ref}' includes itself.`, item.src, 'template-cycle');
      return [];
    }
    const loaded = this.load(target.path, item.src);
    if (!loaded) return [];
    const tree = withVia(loaded, item.src);

    const passed: Record<string, Value> = {};
    const params = get(item, 'parameters');
    if (isPMap(params)) for (const entry of params.entries) passed[entry.key.text] = pnodeToValue(entry.value);
    const { values } = this.bindParameters(tree, passed, item.src, false);

    this.stack.push(target.path);
    const expanded = this.expandFile(tree, target, { named: { parameters: values, variables: scope.named.variables } }, depth + 1);
    this.stack.pop();

    const body = get(expanded, section);
    if (section === 'variables') return body ? normaliseVariables(body) : [];
    if (!isPSeq(body)) {
      this.error(`Template '${ref}' has no '${section}:' list, which is what this position needs.`, item.src, 'template-section');
      return [];
    }
    return body.items;
  }

  private resolveVariables(node: PNode, file: FileRef, scope: Scope, depth: number): PNode {
    if (!isPSeq(node) || !node.items.some((item) => isPMap(item) && get(item, 'template'))) return node;
    const items: PNode[] = [];
    for (const item of node.items) {
      if (isPMap(item) && get(item, 'template')) items.push(...this.include(item, 'variables', file, scope, depth));
      else items.push(item);
    }
    return { kind: 'seq', items, src: node.src };
  }

  private resolveList(node: PNode, section: Exclude<Section, 'variables'>, file: FileRef, scope: Scope, depth: number): PNode {
    if (!isPSeq(node)) return node;
    const items: PNode[] = [];
    for (const item of node.items) {
      if (isPMap(item) && get(item, 'template')) {
        items.push(...this.include(item, section, file, scope, depth));
      } else if (isPMap(item) && section !== 'steps') {
        items.push(this.resolveContainer(item, file, scope, depth));
      } else {
        items.push(item);
      }
    }
    return { kind: 'seq', items, src: node.src };
  }

  /** A stage or a job: resolve the lists inside it. */
  private resolveContainer(node: PMap, file: FileRef, scope: Scope, depth: number): PMap {
    const mapEntry = (entry: PEntry): PEntry => {
      switch (entry.key.text) {
        case 'jobs':
          return { key: entry.key, value: this.resolveList(entry.value, 'jobs', file, scope, depth) };
        case 'steps':
          return { key: entry.key, value: this.resolveList(entry.value, 'steps', file, scope, depth) };
        case 'variables':
          return { key: entry.key, value: this.resolveVariables(entry.value, file, scope, depth) };
        case 'strategy':
          return { key: entry.key, value: this.resolveStrategy(entry.value, file, scope, depth) };
        default:
          return entry;
      }
    };
    return { kind: 'map', src: node.src, entries: node.entries.map(mapEntry) };
  }

  /** Deployment strategies carry steps inside lifecycle hooks. */
  private resolveStrategy(node: PNode, file: FileRef, scope: Scope, depth: number): PNode {
    if (!isPMap(node)) return node;
    const walk = (n: PNode): PNode => {
      if (!isPMap(n)) return n;
      return {
        kind: 'map',
        src: n.src,
        entries: n.entries.map((e) =>
          e.key.text === 'steps' ? { key: e.key, value: this.resolveList(e.value, 'steps', file, scope, depth) } : { key: e.key, value: walk(e.value) },
        ),
      };
    };
    return {
      kind: 'map',
      src: node.src,
      entries: node.entries.map((e) => (['runOnce', 'rolling', 'canary'].includes(e.key.text) ? { key: e.key, value: walk(e.value) } : e)),
    };
  }

  private resolveStructure(root: PMap, file: FileRef, scope: Scope, depth: number): PMap {
    let node = root;
    const ext = get(node, 'extends');
    if (isPMap(ext) && get(ext, 'template')) {
      const ref = getText(ext, 'template') ?? '';
      const target = this.resolveTemplate(ref, file, ext.src);
      const loaded = target && !this.stack.includes(target.path) && depth < MAX_DEPTH ? this.load(target.path, ext.src) : null;
      const entries = node.entries.filter((e) => e.key.text !== 'extends');
      if (target && loaded) {
        const tree = withVia(loaded, ext.src);
        const passed: Record<string, Value> = {};
        const params = get(ext, 'parameters');
        if (isPMap(params)) for (const entry of params.entries) passed[entry.key.text] = pnodeToValue(entry.value);
        const { values } = this.bindParameters(tree, passed, ext.src, false);
        this.stack.push(target.path);
        const base = this.expandFile(tree, target, { named: { parameters: values, variables: scope.named.variables } }, depth + 1);
        this.stack.pop();
        for (const entry of base.entries) {
          const index = entries.findIndex((e) => e.key.text === entry.key.text);
          if (index >= 0) entries[index] = entry;
          else entries.push(entry);
        }
        return { kind: 'map', src: node.src, entries };
      }
      node = { kind: 'map', src: node.src, entries };
    }
    return this.resolveContainer(
      {
        kind: 'map',
        src: node.src,
        entries: node.entries.map((e) =>
          e.key.text === 'stages' ? { key: e.key, value: this.resolveList(e.value, 'stages', file, scope, depth) } : e,
        ),
      },
      file,
      scope,
      depth,
    );
  }
}

/** Variables in list form (`- name: x`, `- group: g`), whichever form they were written in. */
export function normaliseVariables(node: PNode | undefined): PMap[] {
  if (isPSeq(node)) return node.items.filter(isPMap);
  if (isPMap(node)) {
    return node.entries.map((entry) => ({
      kind: 'map' as const,
      src: entry.key.src,
      entries: [
        { key: { kind: 'scalar' as const, value: 'name', text: 'name', src: entry.key.src }, value: entry.key },
        { key: { kind: 'scalar' as const, value: 'value', text: 'value', src: entry.key.src }, value: entry.value },
      ],
    }));
  }
  return [];
}

function stripValue(value: Value): unknown {
  if (Array.isArray(value)) return value.map(stripValue);
  if (value !== null && typeof value === 'object') {
    const obj = value as { [key: string]: Value };
    return Object.fromEntries(Object.keys(obj).map((k) => [k, stripValue(obj[k])]));
  }
  return value;
}

function toValue(input: unknown): Value {
  if (input === null || input === undefined) return null;
  if (Array.isArray(input)) return input.map(toValue);
  if (typeof input === 'object') return Object.fromEntries(Object.entries(input as object).map(([k, v]) => [k, toValue(v)]));
  if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') return input;
  return String(input);
}

export function expandPipeline(file: string, opts: ExpandOptions): ExpandResult {
  const expander = new Expander(opts);
  const tree = expander.load(file, undefined);
  if (!tree) return { root: null, diagnostics: expander.diagnostics, files: [...expander.files], parameters: [], parameterValues: {} };

  const passed: Record<string, Value> = {};
  for (const [name, value] of Object.entries(opts.parameters ?? {})) passed[name] = toValue(value);
  // Only parameters the file declares are passed on, so one config file can serve several pipelines.
  const declared = get(tree, 'parameters');
  const names = isPSeq(declared)
    ? new Set(declared.items.map((item) => getText(item, 'name')))
    : isPMap(declared)
      ? new Set(declared.entries.map((e) => e.key.text))
      : new Set<string>();
  for (const name of Object.keys(passed)) if (!names.has(name)) delete passed[name];

  const { decls, values } = expander.bindParameters(tree, passed, tree.src, true);
  const variables: { [key: string]: Value } = { ...(opts.variables ?? {}) };
  const root = expander.expandFile(tree, { path: file, repoRoot: opts.workspaceRoot }, { named: { parameters: values, variables } }, 0);
  return {
    root,
    diagnostics: expander.diagnostics,
    files: [...expander.files],
    parameters: decls,
    parameterValues: stripValue(values) as Record<string, unknown>,
  };
}
