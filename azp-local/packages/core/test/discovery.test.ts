// Finding pipelines by content, in the folders repositories actually keep them in.
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { discoverPipelines, loadConfig } from '../src';

const pipeline = 'trigger: none\npool:\n  vmImage: ubuntu-24.04\nsteps:\n  - script: echo hi\n';
let root: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'azpl-discovery-'));
  const write = (file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  write('build/azure-pipelines.yml', pipeline);
  write('bin/release.yml', pipeline);
  write('out/nightly.yaml', pipeline);
  write('build/templates/steps.yml', 'steps:\n  - script: echo from a template\n');
  write('build/main.yml', 'jobs:\n  - job: a\n    steps:\n      - template: templates/steps.yml\n');
  write('node_modules/some-package/azure-pipelines.yml', pipeline);
  write('.git/azure-pipelines.yml', pipeline);
  // A file named like a pipeline is one, even when too broken to look like it; other YAML is left alone.
  write('tools/azure-pipelines.yml', '# nothing here yet\n');
  write('tools/typo/azure-pipelines-ci.yaml', 'trigger: none\njob:\n  - job: a\n');
  write('tools/docker-compose.yml', 'services:\n  web:\n    image: nginx\n');
  write('tools/notes.yml', 'hello: world\n');
});

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe('discovery', () => {
  it('looks in build, bin and out, and still skips node_modules and .git', () => {
    const found = discoverPipelines(root, loadConfig(root));
    const relative = (files: string[]) => files.map((f) => path.relative(root, f).split(path.sep).join('/'));
    expect(relative(found.pipelines)).toEqual(['bin/release.yml', 'build/azure-pipelines.yml', 'build/main.yml', 'out/nightly.yaml', 'tools/azure-pipelines.yml', 'tools/typo/azure-pipelines-ci.yaml']);
    expect(relative(found.templates)).toEqual(['build/templates/steps.yml']);
  });
});
