// D9: model, planner and engines are plain libraries. Only the extension may import
// `vscode`, so everything else can be tested and used in a terminal without it.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packages = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name === 'dist' ? [] : sources(full);
    return /\.(ts|mts|cts)$/.test(entry.name) ? [full] : [];
  });
}

describe('package boundaries', () => {
  it.each(['core', 'engine-local', 'cli'])('%s does not import vscode', (name) => {
    const offenders = sources(path.join(packages, name, 'src')).filter((file) => /from\s+['"]vscode['"]|require\(['"]vscode['"]\)/.test(fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('core does not depend on the engine', () => {
    const offenders = sources(path.join(packages, 'core', 'src')).filter((file) => /@azp-local\/engine-local/.test(fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
