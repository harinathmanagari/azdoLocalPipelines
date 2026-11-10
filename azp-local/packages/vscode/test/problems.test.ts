// The rows the graph panel shows for a pipeline that has something wrong with it.
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig, loadPipeline } from '@azp-local/core';
import { collectProblems } from '../src/problems';

const root = path.resolve('/virtual-workspace');
const at = (file: string) => path.join(root, file);

const files = new Map<string, string>([
  [
    at('azure-pipelines.yml'),
    // line 4: a misspelled key (warning); line 8: a condition that cannot be read (error); the template is on line 9
    'trigger: none\njobs:\n  - job: a\n    displayname: A\n    steps:\n      - script: echo hi\n        condition: and(succeeded(\n      - template: ci/steps.yml\n',
  ],
  [at('ci/steps.yml'), 'steps:\n  - script: one\n    script: two\n'],
  [at('.azp-local.yml'), 'images: [broken\n'],
]);
const readFile = (f: string) => files.get(path.normalize(f));

describe('collectProblems', () => {
  const config = loadConfig(root, readFile);
  const { pipeline } = loadPipeline('azure-pipelines.yml', { workspaceRoot: root, readFile, config });
  const rows = collectProblems(root, pipeline, config);

  it('puts errors before warnings, and the pipeline file before its templates', () => {
    expect(rows.map((r) => [r.severity, r.file, r.line])).toEqual(expect.arrayContaining([['error', 'azure-pipelines.yml', 7]]));
    const severities = rows.map((r) => r.severity);
    expect(severities).toEqual([...severities].sort((a, b) => (a === 'error' ? 0 : 1) - (b === 'error' ? 0 : 1)));
    const errorFiles = rows.filter((r) => r.severity === 'error').map((r) => r.file);
    expect(errorFiles.indexOf('azure-pipelines.yml')).toBeLessThan(errorFiles.indexOf('ci/steps.yml'));
  });

  it('shows paths relative to the workspace folder, with forward slashes', () => {
    for (const row of rows) if (row.file) expect(row.file).not.toMatch(/\\|^[A-Za-z]:/);
    expect(rows.some((r) => r.file === 'ci/steps.yml')).toBe(true);
  });

  it('says where a template was included from, and how to open both places', () => {
    const inTemplate = rows.find((r) => r.file === 'ci/steps.yml' && r.code === 'yaml-duplicate-key')!;
    expect(inTemplate.line).toBe(3);
    expect(inTemplate.includedFrom).toMatchObject({ file: 'azure-pipelines.yml', line: 8 });
    expect(path.normalize(inTemplate.src!.file)).toBe(at('ci/steps.yml'));
    expect(path.normalize(inTemplate.includedFrom!.src.file)).toBe(at('azure-pipelines.yml'));
  });

  it('includes what is wrong with .azp-local.yml', () => {
    expect(rows.some((r) => r.file === '.azp-local.yml' && r.severity === 'error')).toBe(true);
  });

  it('keeps a finding that has no line, as a row without a place to open', () => {
    const bare = collectProblems(root, { ...pipeline, diagnostics: [{ severity: 'error', message: 'Something general.' }] }, { ...config, diagnostics: [] });
    expect(bare).toEqual([{ severity: 'error', message: 'Something general.', code: undefined }]);
  });
});
