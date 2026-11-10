// Reading what the publishing tasks point at: JUnit test results and Cobertura or
// lcov coverage. The run summary and the Testing view are drawn from these.
import { XMLParser } from 'fast-xml-parser';
import type { CoverageSummary, TestCase, TestSummary } from '@azp-local/core';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  parseAttributeValue: false,
  parseTagValue: false,
  isArray: (name) => ['testsuite', 'testcase', 'package', 'class', 'line', 'failure', 'error'].includes(name),
});

type Xml = Record<string, unknown>;
const arr = (value: unknown): Xml[] => (Array.isArray(value) ? (value as Xml[]) : value ? [value as Xml] : []);
const attr = (node: Xml, name: string): string | undefined => (typeof node[`@${name}`] === 'string' ? (node[`@${name}`] as string) : undefined);
const looksLikeFile = (value: string | undefined) => !!value && /[\\/].*\.\w+$|^\S+\.(test|spec)\.\w+$/.test(value);

function textOf(node: Xml | string | undefined): string | undefined {
  if (node === undefined) return undefined;
  if (typeof node === 'string') return node;
  return typeof node['#text'] === 'string' ? (node['#text'] as string) : undefined;
}

export function parseJUnit(xml: string, title: string): TestSummary {
  const doc = parser.parse(xml) as Xml;
  const suites: Xml[] = [];
  const collect = (node: Xml | undefined) => {
    for (const suite of arr(node?.testsuite)) {
      suites.push(suite);
      collect(suite); // nested suites
    }
  };
  collect(doc.testsuites as Xml | undefined);
  collect(doc);

  const cases: TestCase[] = [];
  for (const suite of suites) {
    const suiteName = attr(suite, 'name') ?? '';
    for (const tc of arr(suite.testcase)) {
      const failure = (arr(tc.failure)[0] ?? arr(tc.error)[0]) as Xml | string | undefined;
      const skipped = tc.skipped !== undefined;
      const classname = attr(tc, 'classname');
      const file = attr(tc, 'file') ?? attr(suite, 'file') ?? (looksLikeFile(classname) ? classname : looksLikeFile(suiteName) ? suiteName : undefined);
      const line = Number(attr(tc, 'line'));
      const seconds = Number(attr(tc, 'time'));
      cases.push({
        suite: suiteName || classname || '',
        name: attr(tc, 'name') ?? '(unnamed)',
        outcome: failure !== undefined ? 'failed' : skipped ? 'skipped' : 'passed',
        durationMs: Number.isFinite(seconds) ? Math.round(seconds * 1000) : undefined,
        message: failure && typeof failure !== 'string' ? attr(failure, 'message') : undefined,
        details: textOf(failure),
        file,
        line: Number.isFinite(line) && line > 0 ? line : undefined,
      });
    }
  }
  const count = (outcome: TestCase['outcome']) => cases.filter((c) => c.outcome === outcome).length;
  return {
    title,
    total: cases.length,
    passed: count('passed'),
    failed: count('failed'),
    skipped: count('skipped'),
    durationMs: cases.reduce((sum, c) => sum + (c.durationMs ?? 0), 0),
    cases,
  };
}

export function mergeTests(title: string, parts: TestSummary[]): TestSummary {
  const cases = parts.flatMap((p) => p.cases);
  return {
    title,
    total: cases.length,
    passed: parts.reduce((n, p) => n + p.passed, 0),
    failed: parts.reduce((n, p) => n + p.failed, 0),
    skipped: parts.reduce((n, p) => n + p.skipped, 0),
    durationMs: parts.reduce((n, p) => n + p.durationMs, 0),
    cases,
  };
}

function parseCobertura(xml: string): CoverageSummary {
  const doc = parser.parse(xml) as Xml;
  const root = (doc.coverage ?? {}) as Xml;
  const files: CoverageSummary['files'] = [];
  let branchesCovered = 0;
  let branchesTotal = 0;
  for (const pkg of arr((root.packages as Xml | undefined)?.package)) {
    for (const cls of arr((pkg.classes as Xml | undefined)?.class)) {
      const lines = arr((cls.lines as Xml | undefined)?.line);
      for (const line of lines) {
        const m = /\((\d+)\/(\d+)\)/.exec(attr(line, 'condition-coverage') ?? '');
        if (m) {
          branchesCovered += Number(m[1]);
          branchesTotal += Number(m[2]);
        }
      }
      files.push({
        path: attr(cls, 'filename') ?? attr(cls, 'name') ?? '',
        linesTotal: lines.length,
        linesCovered: lines.filter((line) => Number(attr(line, 'hits')) > 0).length,
      });
    }
  }
  const declaredTotal = Number(attr(root, 'lines-valid'));
  const declaredCovered = Number(attr(root, 'lines-covered'));
  return {
    format: 'cobertura',
    linesTotal: Number.isFinite(declaredTotal) ? declaredTotal : files.reduce((n, f) => n + f.linesTotal, 0),
    linesCovered: Number.isFinite(declaredCovered) ? declaredCovered : files.reduce((n, f) => n + f.linesCovered, 0),
    branchesTotal: Number(attr(root, 'branches-valid')) || branchesTotal || undefined,
    branchesCovered: attr(root, 'branches-covered') !== undefined ? Number(attr(root, 'branches-covered')) : branchesTotal ? branchesCovered : undefined,
    files,
  };
}

function parseLcov(text: string): CoverageSummary {
  const files: CoverageSummary['files'] = [];
  let current: CoverageSummary['files'][number] | undefined;
  let branchesTotal = 0;
  let branchesCovered = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('SF:')) current = { path: line.slice(3), linesTotal: 0, linesCovered: 0 };
    else if (line.startsWith('LF:') && current) current.linesTotal = Number(line.slice(3));
    else if (line.startsWith('LH:') && current) current.linesCovered = Number(line.slice(3));
    else if (line.startsWith('BRF:')) branchesTotal += Number(line.slice(4));
    else if (line.startsWith('BRH:')) branchesCovered += Number(line.slice(4));
    else if (line === 'end_of_record' && current) {
      files.push(current);
      current = undefined;
    }
  }
  return {
    format: 'lcov',
    linesTotal: files.reduce((n, f) => n + f.linesTotal, 0),
    linesCovered: files.reduce((n, f) => n + f.linesCovered, 0),
    branchesTotal: branchesTotal || undefined,
    branchesCovered: branchesTotal ? branchesCovered : undefined,
    files,
  };
}

/** Recognises Cobertura XML and lcov by content. Returns undefined for anything else. */
export function parseCoverage(text: string): CoverageSummary | undefined {
  if (/<coverage[\s>]/.test(text)) return parseCobertura(text);
  if (/^SF:/m.test(text) && /^end_of_record/m.test(text)) return parseLcov(text);
  return undefined;
}
