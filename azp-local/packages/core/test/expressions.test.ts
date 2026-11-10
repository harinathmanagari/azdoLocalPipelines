import { describe, expect, it } from 'vitest';
import { ExprError, Unknown, evaluate, splitExpressions, type EvalContext, type Value } from '../src';

const ctx: EvalContext = {
  named: {
    variables: { 'Build.SourceBranch': 'refs/heads/main', coverage: 'true', empty: '', count: '3' },
    parameters: {
      enabled: true,
      env: 'staging',
      list: ['a', 'b', 'c'],
      map: { one: 1, two: 2 },
      items: [{ name: 'x', size: 1 }, { name: 'y', size: 2 }],
    },
  },
};
const run = (expr: string, context: EvalContext = ctx): Value => evaluate(expr, context);

describe('literals and access', () => {
  it.each<[string, Value]>([
    ["'it''s'", "it's"],
    ['42', 42],
    ['-1.5', -1.5],
    ['true', true],
    ['False', false],
    ['null', null],
    ["variables['Build.SourceBranch']", 'refs/heads/main'],
    ['variables.coverage', 'true'],
    ['VARIABLES.COVERAGE', 'true'],
    ['variables.missing', null],
    ['parameters.list[1]', 'b'],
    ['parameters.map.two', 2],
    ["parameters.map['ONE']", 1],
    ['parameters.items[1].name', 'y'],
  ])('%s', (expr, expected) => expect(run(expr)).toEqual(expected));

  it('filters an array with .*', () => {
    expect(run('parameters.items.*.name')).toEqual(['x', 'y']);
  });
});

describe('comparison and casting', () => {
  it.each<[string, Value]>([
    ["eq('ABC', 'abc')", true],
    ["eq(variables.coverage, 'true')", true],
    ["eq(parameters.enabled, 'true')", true], // right side cast to boolean: non-empty string
    ["eq(1, '1')", true],
    ["eq(1, 'one')", false], // a failed cast is not equal, not an error
    ["eq('', null)", true],
    ["ne(variables.count, '3')", false],
    ["gt(variables.count, 2)", true],
    ['ge(2, 2)', true],
    ['lt(1.2.3, 1.10.0)', true],
    ["le('a', 'B')", true],
    ["in('b', 'a', 'b')", true],
    ["notIn('z', 'a', 'b')", true],
    ["xor(true, false)", true],
    ["not(variables.empty)", true],
  ])('%s', (expr, expected) => expect(run(expr)).toEqual(expected));

  it('raises on an ordering comparison that cannot be cast', () => {
    expect(() => run("gt(1, 'one')")).toThrow(ExprError);
  });
});

describe('functions', () => {
  it.each<[string, Value]>([
    ["and(true, eq(1, 1), 'x')", true],
    ["or(false, variables.empty)", false],
    ["contains('Hello World', 'WORLD')", true],
    ["containsValue(parameters.list, 'c')", true],
    ["containsValue(parameters.map, 2)", true],
    ["startsWith(variables['Build.SourceBranch'], 'refs/heads/')", true],
    ["endsWith('pipeline.yml', '.YML')", true],
    ["coalesce(variables.empty, variables.missing, 'fallback')", 'fallback'],
    ["format('{0}-{1}{{x}}', 'a', 2)", 'a-2{x}'],
    ["format('{0:yyyyMMdd}', '2026-10-11T08:00:00Z')", '20261011'],
    ["join(';', parameters.list)", 'a;b;c'],
    ["length(parameters.list)", 3],
    ["length('abcd')", 4],
    ["length(parameters.map)", 2],
    ["lower('AbC')", 'abc'],
    ["upper('AbC')", 'ABC'],
    ["replace('a-b-c', '-', '+')", 'a+b+c'],
    ["split('a,b', ',')", ['a', 'b']],
    ["trim('  x ')", 'x'],
    ["iif(eq(parameters.env, 'staging'), 'S', 'P')", 'S'],
    ["convertToJson(parameters.map)", '{\n  "one": 1,\n  "two": 2\n}'],
  ])('%s', (expr, expected) => expect(run(expr)).toEqual(expected));

  it('emulates counter() through the host', () => {
    let n = 100;
    expect(run("counter('rel', 100)", { ...ctx, counter: () => n++ })).toBe(100);
  });

  it('names an unsupported function instead of passing it through', () => {
    expect(() => run('frobnicate(1)')).toThrow(/Unrecognized function: 'frobnicate'/);
    expect(() => run('succeeded()')).toThrow(/not available/);
    expect(() => run('nope.value')).toThrow(/Unrecognized value: 'nope'/);
  });
});

describe('unknown values (D3)', () => {
  const unknown = new Unknown('variable group value not supplied');
  const withUnknown: EvalContext = { named: { variables: { token: unknown, known: 'yes' } } };

  it('propagates through functions', () => {
    expect(run("eq(variables.token, 'x')", withUnknown)).toBe(unknown);
    expect(run("format('{0}', variables.token)", withUnknown)).toBe(unknown);
  });

  it('lets a known operand decide and / or', () => {
    expect(run("and(false, eq(variables.token, 'x'))", withUnknown)).toBe(false);
    expect(run("or(eq(variables.known, 'yes'), variables.token)", withUnknown)).toBe(true);
    expect(run("and(true, variables.token)", withUnknown)).toBe(unknown);
  });
});

describe('splitExpressions', () => {
  it('separates literals from expressions', () => {
    expect(splitExpressions('a ${{ x }} b ${{ y }}')).toEqual([{ lit: 'a ' }, { expr: 'x' }, { lit: ' b ' }, { expr: 'y' }]);
  });
  it("does not end an expression at }} inside a string", () => {
    expect(splitExpressions("${{ format('{{0}}', 1) }}")).toEqual([{ expr: "format('{{0}}', 1)" }]);
  });
});
