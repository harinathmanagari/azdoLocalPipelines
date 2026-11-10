import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  LineSplitter,
  artifactNameProblem,
  artifactPath,
  listWorkspaceFiles,
  maskSecrets,
  parseCoverage,
  parseDockerHost,
  parseFormatCommand,
  parseJUnit,
  parseLoggingCommand,
  resolveNodeVersion,
} from '../src';

describe('artifact names', () => {
  const dir = path.resolve(os.tmpdir(), 'run', 'artifacts');

  it('accepts ordinary names', () => {
    for (const name of ['drop', 'web', 'my artifact', 'build-1.2.3', 'Test_Results', '.hidden']) {
      expect(artifactNameProblem(name)).toBeUndefined();
      expect(artifactPath(dir, name)).toBe(path.join(dir, name));
    }
  });

  it('refuses names that could leave the artifacts folder or alias another file', () => {
    const bad = ['', ' ', '.', '..', '../x', '../../../../home/u', 'a/b', 'a\\b', '..\\x', 'C:', 'C:\\x', '/etc', 'x.', 'x ', 'CON', 'nul.txt', 'a:b', 'a*b', 'a?b', 'a|b', 'a"b', 'a<b', 'a>b', 'a\nb', 'a\u0000b', 'x'.repeat(256)];
    for (const name of bad) {
      expect(artifactNameProblem(name), JSON.stringify(name)).toBeDefined();
      expect(artifactPath(dir, name), JSON.stringify(name)).toBeUndefined();
    }
  });
});

describe('logging commands', () => {
  it('parses area, action, properties and data', () => {
    expect(parseLoggingCommand('##vso[task.setvariable variable=appVersion;isOutput=true]1.2.3')).toEqual({
      area: 'task',
      action: 'setvariable',
      properties: { variable: 'appVersion', isoutput: 'true' },
      data: '1.2.3',
    });
  });

  it('finds a command anywhere in the line and decodes escapes', () => {
    const command = parseLoggingCommand("+ echo '##vso[task.logissue type=warning;sourcepath=src/a%3Bb.ts;linenumber=7]50%25 done%0Anext'")!;
    expect(command.properties).toEqual({ type: 'warning', sourcepath: 'src/a;b.ts', linenumber: '7' });
    expect(command.data).toBe("50% done\nnext'");
  });

  it('handles commands without properties, and ignores other text', () => {
    expect(parseLoggingCommand('##vso[task.prependpath]/opt/tool/bin')).toMatchObject({ area: 'task', action: 'prependpath', data: '/opt/tool/bin' });
    expect(parseLoggingCommand('plain output')).toBeUndefined();
    expect(parseLoggingCommand('##vso[broken')).toBeUndefined();
  });

  it('recognises formatting commands', () => {
    expect(parseFormatCommand('##[group]Files')).toEqual({ kind: 'group', text: 'Files' });
    expect(parseFormatCommand('##[error]Boom')).toEqual({ kind: 'error', text: 'Boom' });
    expect(parseFormatCommand('no command')).toBeUndefined();
  });
});

describe('secret masking', () => {
  it('masks every occurrence, longest secret first', () => {
    expect(maskSecrets('token=abc123 and abc123XYZ', ['abc123', 'abc123XYZ'])).toBe('token=*** and ***');
    expect(maskSecrets('nothing here', [])).toBe('nothing here');
  });
});

describe('LineSplitter', () => {
  it('joins chunks into lines and keeps the unfinished tail until flushed', () => {
    const lines: string[] = [];
    const splitter = new LineSplitter((line) => lines.push(line));
    splitter.push('one\ntw');
    splitter.push(Buffer.from('o\r\nthr'));
    expect(lines).toEqual(['one', 'two']);
    splitter.flush();
    expect(lines).toEqual(['one', 'two', 'thr']);
  });
});

describe('test results and coverage', () => {
  it('reads JUnit XML as vitest writes it', () => {
    const summary = parseJUnit(
      `<?xml version="1.0"?>
      <testsuites tests="3" failures="1">
        <testsuite name="src/lib/stats.test.ts" tests="3">
          <testcase classname="src/lib/stats.test.ts" name="formats 0 seconds" time="0.002"/>
          <testcase classname="src/lib/stats.test.ts" name="averages" time="0.010">
            <failure message="expected 150 to be 151" type="AssertionError">AssertionError: expected 150 to be 151
 at src/lib/stats.test.ts:45:36</failure>
          </testcase>
          <testcase classname="src/lib/stats.test.ts" name="later"><skipped/></testcase>
        </testsuite>
      </testsuites>`,
      'Unit tests',
    );
    expect(summary).toMatchObject({ title: 'Unit tests', total: 3, passed: 1, failed: 1, skipped: 1, durationMs: 12 });
    expect(summary.cases[1]).toMatchObject({ outcome: 'failed', message: 'expected 150 to be 151', file: 'src/lib/stats.test.ts' });
  });

  it('reads Cobertura', () => {
    const summary = parseCoverage(
      `<coverage lines-valid="4" lines-covered="3" branches-valid="2" branches-covered="1">
        <packages><package name="lib"><classes>
          <class name="stats.ts" filename="src/lib/stats.ts"><lines>
            <line number="1" hits="2"/><line number="2" hits="0"/><line number="3" hits="1" branch="true" condition-coverage="50% (1/2)"/><line number="4" hits="5"/>
          </lines></class>
        </classes></package></packages>
      </coverage>`,
    )!;
    expect(summary).toMatchObject({ format: 'cobertura', linesTotal: 4, linesCovered: 3, branchesTotal: 2, branchesCovered: 1 });
    expect(summary.files).toEqual([{ path: 'src/lib/stats.ts', linesTotal: 4, linesCovered: 3 }]);
  });

  it('reads lcov, and declines anything else', () => {
    const summary = parseCoverage('TN:\nSF:src/a.ts\nLF:10\nLH:8\nBRF:4\nBRH:2\nend_of_record\nSF:src/b.ts\nLF:5\nLH:5\nend_of_record\n')!;
    expect(summary).toMatchObject({ format: 'lcov', linesTotal: 15, linesCovered: 13, branchesTotal: 4, branchesCovered: 2 });
    expect(parseCoverage('hello')).toBeUndefined();
  });
});

describe('Node version specs', () => {
  const available = [
    { version: '24.9.0', lts: false as const },
    { version: '22.20.0', lts: 'Jod' },
    { version: '22.3.1', lts: false as const },
    { version: '20.19.5', lts: 'Iron' },
    { version: '18.20.8', lts: 'Hydrogen' },
  ];
  it.each([
    ['22.x', '22.20.0'],
    ['22', '22.20.0'],
    ['22.3.x', '22.3.1'],
    ['v20.19.5', '20.19.5'],
    ['>=20', '24.9.0'],
    ['^20.1.0', '20.19.5'],
    ['~22.3', '22.3.1'],
    ['lts/*', '22.20.0'],
    ['lts/iron', '20.19.5'],
    ['latest', '24.9.0'],
    ['16.x', undefined],
    ['not-a-version', undefined],
  ])('%s -> %s', (spec, expected) => expect(resolveNodeVersion(spec, available)).toBe(expected));
});

describe('Docker endpoints', () => {
  it('understands npipe, unix and tcp addresses', () => {
    expect(parseDockerHost('npipe:////./pipe/docker_engine').socketPath).toBe('\\\\.\\pipe\\docker_engine');
    expect(parseDockerHost('unix:///var/run/docker.sock').socketPath).toBe('/var/run/docker.sock');
    expect(parseDockerHost('tcp://127.0.0.1:2375')).toMatchObject({ host: '127.0.0.1', port: 2375 });
  });
});

describe('workspace listing (D5)', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'azpl-ws-'));
  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

  it('leaves out what .gitignore ignores, at any depth, and never takes .git', async () => {
    const write = (rel: string, content = 'x') => {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), content);
    };
    write('.gitignore', 'node_modules/\n.env\n*.log\n');
    write('src/app.ts');
    write('src/.gitignore', 'generated/\n');
    write('src/generated/big.ts');
    write('src/debug.log');
    write('.env', 'TOKEN=1');
    write('node_modules/pkg/index.js');
    write('.git/config');
    write('run.sh', '#!/usr/bin/env bash\necho hi\n');

    const listing = await listWorkspaceFiles(root);
    expect(listing.source).toBe('gitignore');
    expect(listing.files.map((f) => f.rel).sort()).toEqual(['.gitignore', 'run.sh', 'src/.gitignore', 'src/app.ts']);
  });
});
