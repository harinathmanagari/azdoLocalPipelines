// The Azure Pipelines expression language: one evaluator for `${{ }}`, `$[ ]` and
// `condition:`. They differ only in which named values and status functions the
// caller makes available. A construct outside the supported set raises ExprError;
// nothing is passed through silently.
import type { SourceRef } from './types';
import type { PNode } from './yaml';

export class ExprError extends Error {}

/** A value that cannot be known locally, for example a variable-group secret that was not supplied (D3). */
export class Unknown {
  constructor(readonly reason: string) {}
}

export class Version {
  constructor(readonly parts: number[]) {}
  toString(): string {
    return this.parts.join('.');
  }
}

/** A dictionary whose entries are computed on lookup, used for variable bags. */
export class Resolver {
  constructor(readonly get: (key: string) => Value) {}
}

export type Value = null | boolean | number | string | Value[] | { [key: string]: Value } | Unknown | Version | Resolver;

/** Arrays and objects that came from YAML carry their positioned node, so inserting them keeps source lines. */
export const PNODE = Symbol('azp.pnode');

type Ast =
  | { t: 'lit'; v: Value }
  | { t: 'name'; name: string }
  | { t: 'call'; name: string; args: Ast[] }
  | { t: 'prop'; obj: Ast; name: string }
  | { t: 'index'; obj: Ast; index: Ast }
  | { t: 'star'; obj: Ast };

export interface EvalContext {
  /** Named values such as `parameters` and `variables`. Looked up case-insensitively. */
  named: Record<string, Value>;
  /** Extra functions, normally the status functions for the level being evaluated. */
  functions?: Record<string, (args: Value[]) => Value>;
  counter?: (prefix: string, seed: number) => number;
}

// --- lexer -------------------------------------------------------------------

type Token = { k: 'punct'; v: string } | { k: 'str'; v: string } | { k: 'num'; v: number } | { k: 'ver'; v: Version } | { k: 'id'; v: string };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
    } else if ('()[],*'.includes(c)) {
      tokens.push({ k: 'punct', v: c });
      i++;
    } else if (c === "'") {
      let out = '';
      i++;
      for (;;) {
        if (i >= src.length) throw new ExprError(`Unterminated string in expression: ${src}`);
        if (src[i] === "'") {
          if (src[i + 1] === "'") {
            out += "'";
            i += 2;
            continue;
          }
          i++;
          break;
        }
        out += src[i++];
      }
      tokens.push({ k: 'str', v: out });
    } else if (/[0-9]/.test(c) || ((c === '-' || c === '+') && /[0-9.]/.test(src[i + 1] ?? ''))) {
      const m = /^[-+]?[0-9]*\.?[0-9]+(?:\.[0-9]+)*(?:[eE][-+]?[0-9]+)?/.exec(src.slice(i));
      if (!m) throw new ExprError(`Unexpected number in expression: ${src.slice(i)}`);
      const raw = m[0];
      const dots = raw.split('.').length - 1;
      if (dots >= 2) tokens.push({ k: 'ver', v: new Version(raw.split('.').map(Number)) });
      else tokens.push({ k: 'num', v: Number(raw) });
      i += raw.length;
    } else if (c === '.') {
      tokens.push({ k: 'punct', v: '.' });
      i++;
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(src.slice(i))!;
      tokens.push({ k: 'id', v: m[0] });
      i += m[0].length;
    } else {
      throw new ExprError(`Unexpected symbol '${c}' in expression: ${src}`);
    }
  }
  return tokens;
}

// --- parser ------------------------------------------------------------------

export function parseExpression(src: string): Ast {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const isPunct = (v: string) => peek()?.k === 'punct' && peek().v === v;
  const expect = (v: string) => {
    if (!isPunct(v)) throw new ExprError(`Expected '${v}' in expression: ${src}`);
    pos++;
  };

  const primary = (): Ast => {
    const tok = tokens[pos++];
    if (!tok) throw new ExprError(`Unexpected end of expression: ${src}`);
    if (tok.k === 'str' || tok.k === 'num' || tok.k === 'ver') return { t: 'lit', v: tok.v };
    if (tok.k === 'id') {
      if (isPunct('(')) {
        pos++;
        const args: Ast[] = [];
        if (!isPunct(')')) {
          for (;;) {
            args.push(expr());
            if (isPunct(',')) pos++;
            else break;
          }
        }
        expect(')');
        return { t: 'call', name: tok.v, args };
      }
      const lower = tok.v.toLowerCase();
      if (lower === 'true') return { t: 'lit', v: true };
      if (lower === 'false') return { t: 'lit', v: false };
      if (lower === 'null') return { t: 'lit', v: null };
      return { t: 'name', name: tok.v };
    }
    throw new ExprError(`Unexpected '${tok.v}' in expression: ${src}`);
  };

  const expr = (): Ast => {
    let node = primary();
    for (;;) {
      if (isPunct('.')) {
        pos++;
        const tok = tokens[pos++];
        if (tok?.k === 'punct' && tok.v === '*') node = { t: 'star', obj: node };
        else if (tok?.k === 'id') node = { t: 'prop', obj: node, name: tok.v };
        else if (tok?.k === 'num') node = { t: 'prop', obj: node, name: String(tok.v) };
        else throw new ExprError(`Expected a property name after '.' in expression: ${src}`);
      } else if (isPunct('[')) {
        pos++;
        const index = expr();
        expect(']');
        node = { t: 'index', obj: node, index };
      } else {
        return node;
      }
    }
  };

  const ast = expr();
  if (pos < tokens.length) throw new ExprError(`Unexpected '${tokens[pos].v}' in expression: ${src}`);
  return ast;
}

// --- conversions -------------------------------------------------------------

export function isObject(v: Value): v is { [key: string]: Value } {
  return (
    typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Unknown) && !(v instanceof Version) && !(v instanceof Resolver)
  );
}

export function typeName(v: Value): string {
  if (v === null) return 'Null';
  if (Array.isArray(v)) return 'Array';
  if (v instanceof Version) return 'Version';
  if (v instanceof Unknown) return 'Unknown';
  if (v instanceof Resolver) return 'Object';
  if (isObject(v)) return 'Object';
  return typeof v === 'string' ? 'String' : typeof v === 'number' ? 'Number' : 'Boolean';
}

export function toStr(v: Value): string {
  if (v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return String(v);
  if (v instanceof Version) return v.toString();
  if (v instanceof Unknown) return '';
  throw new ExprError(`Unable to convert from ${typeName(v)} to String.`);
}

export function toBool(v: Value): boolean {
  if (v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  return true;
}

function toNum(v: Value): number {
  if (v === null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') {
    if (v === '') return 0;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  throw new ExprError(`Unable to convert from ${typeName(v)} to Number.`);
}

function toVersion(v: Value): Version {
  if (v instanceof Version) return v;
  if (typeof v === 'string' && /^\d+(\.\d+){1,3}$/.test(v)) return new Version(v.split('.').map(Number));
  throw new ExprError(`Unable to convert from ${typeName(v)} to Version.`);
}

/** Compares after casting the right side to the type of the left, as Azure does. */
function compare(left: Value, right: Value): number {
  if (left === null) {
    if (right === null) return 0;
    left = typeof right === 'number' ? 0 : typeof right === 'boolean' ? false : '';
  }
  if (typeof left === 'number') return Math.sign(left - toNum(right));
  if (typeof left === 'boolean') return Number(left) - Number(toBool(right));
  if (typeof left === 'string') {
    const a = left.toUpperCase();
    const b = toStr(right).toUpperCase();
    return a < b ? -1 : a > b ? 1 : 0;
  }
  if (left instanceof Version) {
    const other = toVersion(right);
    for (let i = 0; i < Math.max(left.parts.length, other.parts.length); i++) {
      const d = (left.parts[i] ?? 0) - (other.parts[i] ?? 0);
      if (d !== 0) return Math.sign(d);
    }
    return 0;
  }
  throw new ExprError(`Cannot compare a value of type ${typeName(left)}.`);
}

function equal(left: Value, right: Value): boolean {
  if ((isObject(left) || Array.isArray(left)) && (isObject(right) || Array.isArray(right))) return left === right;
  try {
    return compare(left, right) === 0;
  } catch {
    return false;
  }
}

/** Property lookup. Azure's dictionaries are case-insensitive. */
export function lookup(obj: Value, key: string): Value {
  if (obj instanceof Unknown) return obj;
  if (obj instanceof Resolver) return obj.get(key);
  if (Array.isArray(obj)) {
    const index = Number(key);
    return Number.isInteger(index) && index >= 0 && index < obj.length ? obj[index] : null;
  }
  if (!isObject(obj)) return null;
  if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(obj)) if (k.toLowerCase() === lower) return obj[k];
  return null;
}

function formatDate(date: Date, spec: string): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return spec.replace(/yyyy|yy|MM|dd|HH|mm|ss|M|d|H|m|s/g, (token) => {
    switch (token) {
      case 'yyyy': return String(date.getUTCFullYear());
      case 'yy': return pad(date.getUTCFullYear() % 100);
      case 'MM': return pad(date.getUTCMonth() + 1);
      case 'M': return String(date.getUTCMonth() + 1);
      case 'dd': return pad(date.getUTCDate());
      case 'd': return String(date.getUTCDate());
      case 'HH': return pad(date.getUTCHours());
      case 'H': return String(date.getUTCHours());
      case 'mm': return pad(date.getUTCMinutes());
      case 'm': return String(date.getUTCMinutes());
      case 'ss': return pad(date.getUTCSeconds());
      default: return String(date.getUTCSeconds());
    }
  });
}

function format(args: Value[]): string {
  const template = toStr(args[0]);
  let out = '';
  for (let i = 0; i < template.length; i++) {
    const c = template[i];
    if (c === '{') {
      if (template[i + 1] === '{') {
        out += '{';
        i++;
        continue;
      }
      const end = template.indexOf('}', i);
      if (end < 0) throw new ExprError(`The format string is invalid: ${template}`);
      const [indexText, ...specParts] = template.slice(i + 1, end).split(':');
      const index = Number(indexText);
      if (!Number.isInteger(index) || index < 0 || index + 1 >= args.length) {
        throw new ExprError(`The format string references argument ${indexText}, which was not supplied.`);
      }
      const arg = args[index + 1];
      const spec = specParts.join(':');
      if (spec) {
        const date = new Date(toStr(arg));
        if (Number.isNaN(date.getTime())) throw new ExprError(`Format specifier '${spec}' needs a date, got '${toStr(arg)}'.`);
        out += formatDate(date, spec);
      } else {
        out += toStr(arg);
      }
      i = end;
    } else if (c === '}') {
      if (template[i + 1] === '}') i++;
      out += '}';
    } else {
      out += c;
    }
  }
  return out;
}

function strip(v: Value): unknown {
  if (Array.isArray(v)) return v.map(strip);
  if (v instanceof Version) return v.toString();
  if (v instanceof Unknown) return null;
  if (isObject(v)) return Object.fromEntries(Object.keys(v).map((k) => [k, strip(v[k])]));
  return v;
}

// --- functions ---------------------------------------------------------------

type Fn = { min: number; max: number; fn: (args: Value[], ctx: EvalContext) => Value };
const ci = (v: Value) => toStr(v).toUpperCase();

const FUNCTIONS: Record<string, Fn> = {
  eq: { min: 2, max: 2, fn: ([a, b]) => equal(a, b) },
  ne: { min: 2, max: 2, fn: ([a, b]) => !equal(a, b) },
  gt: { min: 2, max: 2, fn: ([a, b]) => compare(a, b) > 0 },
  ge: { min: 2, max: 2, fn: ([a, b]) => compare(a, b) >= 0 },
  lt: { min: 2, max: 2, fn: ([a, b]) => compare(a, b) < 0 },
  le: { min: 2, max: 2, fn: ([a, b]) => compare(a, b) <= 0 },
  not: { min: 1, max: 1, fn: ([a]) => !toBool(a) },
  xor: { min: 2, max: 2, fn: ([a, b]) => toBool(a) !== toBool(b) },
  in: { min: 1, max: Infinity, fn: ([needle, ...rest]) => rest.some((item) => equal(needle, item)) },
  notin: { min: 1, max: Infinity, fn: ([needle, ...rest]) => !rest.some((item) => equal(needle, item)) },
  contains: { min: 2, max: 2, fn: ([a, b]) => ci(a).includes(ci(b)) },
  containsvalue: {
    min: 2,
    max: 2,
    fn: ([collection, value]) => {
      const items = Array.isArray(collection) ? collection : isObject(collection) ? Object.values(collection) : [];
      return items.some((item) => !isObject(item) && !Array.isArray(item) && equal(item, value));
    },
  },
  startswith: { min: 2, max: 2, fn: ([a, b]) => ci(a).startsWith(ci(b)) },
  endswith: { min: 2, max: 2, fn: ([a, b]) => ci(a).endsWith(ci(b)) },
  coalesce: { min: 2, max: Infinity, fn: (args) => args.find((a) => a !== null && a !== '') ?? null },
  format: { min: 1, max: Infinity, fn: (args) => format(args) },
  join: {
    min: 2,
    max: 2,
    fn: ([sep, collection]) => (Array.isArray(collection) ? collection.map(toStr).join(toStr(sep)) : toStr(collection)),
  },
  length: {
    min: 1,
    max: 1,
    fn: ([a]) => (Array.isArray(a) ? a.length : isObject(a) ? Object.keys(a).length : toStr(a).length),
  },
  lower: { min: 1, max: 1, fn: ([a]) => toStr(a).toLowerCase() },
  upper: { min: 1, max: 1, fn: ([a]) => toStr(a).toUpperCase() },
  replace: { min: 3, max: 3, fn: ([a, b, c]) => (toStr(b) === '' ? toStr(a) : toStr(a).split(toStr(b)).join(toStr(c))) },
  split: { min: 2, max: 2, fn: ([a, b]) => toStr(a).split(toStr(b)) },
  trim: { min: 1, max: 1, fn: ([a]) => toStr(a).trim() },
  converttojson: { min: 1, max: 1, fn: ([a]) => JSON.stringify(strip(a), null, 2) },
  counter: {
    min: 0,
    max: 2,
    fn: ([prefix, seed], ctx) => {
      if (!ctx.counter) throw new ExprError('counter() is only available in a runtime expression.');
      return ctx.counter(toStr(prefix ?? ''), seed === undefined ? 0 : toNum(seed));
    },
  },
};

export const SUPPORTED_FUNCTIONS = [...Object.keys(FUNCTIONS), 'and', 'or', 'iif'];
export const STATUS_FUNCTIONS = ['succeeded', 'failed', 'succeededorfailed', 'always', 'canceled'];

// --- evaluator ---------------------------------------------------------------

/** Arrays produced by `.*`: an accessor after one applies to each element (`a.*.b`). */
const filtered = new WeakSet<Value[]>();

function access(obj: Value, key: string): Value {
  if (Array.isArray(obj) && filtered.has(obj)) {
    const items = obj.map((item) => lookup(item, key)).filter((item) => item !== null);
    filtered.add(items);
    return items;
  }
  return lookup(obj, key);
}

function evalNode(node: Ast, ctx: EvalContext): Value {
  switch (node.t) {
    case 'lit':
      return node.v;
    case 'name': {
      const lower = node.name.toLowerCase();
      for (const key of Object.keys(ctx.named)) if (key.toLowerCase() === lower) return ctx.named[key];
      throw new ExprError(`Unrecognized value: '${node.name}'.`);
    }
    case 'prop':
      return access(evalNode(node.obj, ctx), node.name);
    case 'index': {
      const obj = evalNode(node.obj, ctx);
      const index = evalNode(node.index, ctx);
      if (index instanceof Unknown) return index;
      return access(obj, toStr(index));
    }
    case 'star': {
      const obj = evalNode(node.obj, ctx);
      if (obj instanceof Unknown) return obj;
      const items = Array.isArray(obj) ? [...obj] : isObject(obj) ? Object.values(obj) : [];
      filtered.add(items);
      return items;
    }
    case 'call':
      return evalCall(node, ctx);
  }
}

function evalCall(node: Extract<Ast, { t: 'call' }>, ctx: EvalContext): Value {
  const name = node.name.toLowerCase();

  // and / or / iif are lazy so that a known operand can decide the result even when another is unknown.
  if (name === 'and' || name === 'or') {
    if (node.args.length < 2) throw new ExprError(`${node.name}() needs at least 2 arguments.`);
    let unknown: Unknown | undefined;
    for (const arg of node.args) {
      const value = evalNode(arg, ctx);
      if (value instanceof Unknown) unknown ??= value;
      else if (toBool(value) === (name === 'or')) return name === 'or';
    }
    return unknown ?? name === 'and';
  }
  if (name === 'iif') {
    if (node.args.length !== 3) throw new ExprError('iif() needs exactly 3 arguments.');
    const condition = evalNode(node.args[0], ctx);
    if (condition instanceof Unknown) return condition;
    return evalNode(node.args[toBool(condition) ? 1 : 2], ctx);
  }

  const args = node.args.map((arg) => evalNode(arg, ctx));
  const extra = ctx.functions && Object.keys(ctx.functions).find((key) => key.toLowerCase() === name);
  if (extra) return ctx.functions![extra](args);

  const fn = FUNCTIONS[name];
  if (!fn) {
    if (STATUS_FUNCTIONS.includes(name)) throw new ExprError(`${node.name}() is not available in this kind of expression.`);
    throw new ExprError(`Unrecognized function: '${node.name}'.`);
  }
  if (args.length < fn.min || args.length > fn.max) {
    throw new ExprError(`${node.name}() was called with ${args.length} argument(s).`);
  }
  const unknown = args.find((arg): arg is Unknown => arg instanceof Unknown);
  if (unknown) return unknown;
  return fn.fn(args, ctx);
}

const cache = new Map<string, Ast>();

export function evaluate(text: string, ctx: EvalContext): Value {
  let ast = cache.get(text);
  if (!ast) {
    ast = parseExpression(text);
    cache.set(text, ast);
  }
  return evalNode(ast, ctx);
}

// --- bridging values and positioned YAML -------------------------------------

export function pnodeToValue(node: PNode): Value {
  if (node.kind === 'scalar') {
    // A number whose text does not round-trip (1.10, 0x1F) is kept as the text that was written.
    if (typeof node.value === 'number' && String(node.value) !== node.text) return node.text;
    return node.value;
  }
  if (node.kind === 'seq') {
    const arr: Value[] = node.items.map(pnodeToValue);
    Object.defineProperty(arr, PNODE, { value: node, enumerable: false });
    return arr;
  }
  const obj: { [key: string]: Value } = {};
  for (const entry of node.entries) obj[entry.key.text] = pnodeToValue(entry.value);
  Object.defineProperty(obj, PNODE, { value: node, enumerable: false });
  return obj;
}

export function valueToPNode(value: Value, src: SourceRef): PNode {
  if (value !== null && typeof value === 'object') {
    const original = (value as unknown as Record<symbol, PNode | undefined>)[PNODE];
    if (original) return original;
    if (Array.isArray(value)) return { kind: 'seq', src, items: value.map((item) => valueToPNode(item, src)) };
    if (isObject(value)) {
      return {
        kind: 'map',
        src,
        entries: Object.keys(value).map((key) => ({
          key: { kind: 'scalar', value: key, text: key, src },
          value: valueToPNode(value[key], src),
        })),
      };
    }
  }
  if (value instanceof Unknown || value instanceof Resolver || value === null) return { kind: 'scalar', value: null, text: '', src };
  if (value instanceof Version) return { kind: 'scalar', value: value.toString(), text: value.toString(), src };
  const scalarValue = value as string | number | boolean;
  return { kind: 'scalar', value: scalarValue, text: toStr(scalarValue), src };
}
