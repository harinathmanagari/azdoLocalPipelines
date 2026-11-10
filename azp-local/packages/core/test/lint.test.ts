// What the model reports about a file that is wrong: errors stop the graph from being
// drawn, so each one must be a real error; warnings only point things out.
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasPipelineName, loadPipeline, suggest } from '../src';

const root = path.resolve('/virtual-workspace');
const at = (file: string) => path.join(root, file);

/** Loads `azure-pipelines.yml` from in-memory files and returns what was reported, as `severity code line`. */
function check(yaml: string, extra: Record<string, string> = {}) {
  const files = new Map<string, string>([[at('azure-pipelines.yml'), yaml], ...Object.entries(extra).map(([f, t]) => [at(f), t] as [string, string])]);
  const loaded = loadPipeline('azure-pipelines.yml', { workspaceRoot: root, readFile: (f) => files.get(path.normalize(f)) });
  const all = loaded.pipeline.diagnostics;
  return {
    all,
    errors: all.filter((d) => d.severity === 'error'),
    warnings: all.filter((d) => d.severity === 'warning'),
    find: (code: string) => all.filter((d) => d.code === code),
    messages: all.map((d) => `${d.severity} ${d.code} ${d.source?.file ? path.basename(d.source.file) : ''}:${d.source?.line}`),
  };
}

const job = (name: string, extra = '', steps = '      - script: echo hi\n') => `  - job: ${name}\n${extra}    steps:\n${steps}`;

describe('duplicate keys', () => {
  it('reports the second use of a key, on its own line', () => {
    const r = check('jobs:\n  - job: a\n    steps:\n      - script: echo one\n        script: echo two\n');
    expect(r.find('yaml-duplicate-key').map((d) => [d.source?.line, d.message])).toEqual([[5, "Duplicate key 'script': it is already set on line 4."]]);
    expect(r.errors).toHaveLength(1);
  });

  it('lets ${{ if }} and ${{ each }} keys repeat', () => {
    const r = check(
      "parameters:\n  - name: x\n    type: boolean\n    default: true\njobs:\n  - job: a\n    steps:\n      - ${{ if eq(parameters.x, true) }}:\n        - script: one\n      - ${{ if eq(parameters.x, false) }}:\n        - script: two\n    variables:\n      ${{ if eq(parameters.x, true) }}:\n        A: '1'\n      ${{ if eq(parameters.x, false) }}:\n        A: '2'\n",
    );
    expect(r.find('yaml-duplicate-key')).toEqual([]);
  });
});

describe('dependency loops', () => {
  it('reports jobs that wait for each other, once, with the path around the loop', () => {
    const r = check(`jobs:\n${job('a', '    dependsOn: b\n')}${job('b', '    dependsOn: a\n')}`);
    expect(r.find('dependency-cycle').map((d) => [d.severity, d.source?.line, d.message])).toEqual([['error', 2, 'Jobs depend on each other in a loop: a → b → a.']]);
  });

  it('reports a job that depends on itself and a loop of stages', () => {
    expect(check(`jobs:\n${job('a', '    dependsOn: a\n')}`).find('dependency-cycle')[0].message).toBe("Job 'a' depends on itself.");
    const indent = (text: string) => text.replace(/^(?=.)/gm, '    ');
    const stages = check(`stages:\n  - stage: A\n    dependsOn: B\n    jobs:\n${indent(job('x'))}  - stage: B\n    dependsOn: A\n    jobs:\n${indent(job('y'))}`);
    expect(stages.find('dependency-cycle')[0].message).toBe('Stages depend on each other in a loop: A → B → A.');
  });

  it('accepts a chain, a diamond and the legs of a matrix', () => {
    const diamond = check(`jobs:\n${job('a')}${job('b', '    dependsOn: a\n')}${job('c', '    dependsOn: a\n')}${job('d', '    dependsOn: [b, c]\n')}`);
    expect(diamond.find('dependency-cycle')).toEqual([]);
    const matrix = check(`jobs:\n${job('t', '    strategy:\n      matrix:\n        one: { v: "1" }\n        two: { v: "2" }\n')}${job('after', '    dependsOn: t\n')}`);
    expect(matrix.find('dependency-cycle')).toEqual([]);
  });
});

describe('conditions', () => {
  it('reports one that cannot be read, on the condition line', () => {
    const r = check(`jobs:\n  - job: a\n    condition: and(succeeded(\n    steps:\n      - script: echo hi\n`);
    expect(r.find('condition').map((d) => [d.severity, d.source?.line, d.message])).toEqual([['error', 3, "Invalid condition 'and(succeeded(': Unexpected end of the condition."]]);
  });

  it('checks stage and step conditions too, and names the symbol it stopped at', () => {
    const r = check(`stages:\n  - stage: s\n    condition: eq(variables.x, 'a') && true\n    jobs:\n      - job: a\n        steps:\n          - script: x\n            condition: eq('open)\n`);
    expect(r.find('condition').map((d) => d.source?.line)).toEqual([3, 8]);
    expect(r.find('condition')[0].message).toContain("Unexpected symbol '&'");
  });

  it('accepts the conditions pipelines really use', () => {
    const conditions = [
      'succeeded()',
      'always()',
      'succeededOrFailed()',
      "and(succeeded(), ne(variables['Build.Reason'], 'PullRequest'))",
      "and(succeeded(), startsWith(variables['Build.SourceBranch'], 'refs/heads/release/'))",
      "eq(dependencies.build.outputs['pack.version'], '1.2.3')",
      "eq(stageDependencies.A.b.outputs['s.x'], 'it''s')",
      "not(in(variables.env, 'dev', 'test'))",
      "or(eq(variables.n, 3), gt(variables.n, -1.5))",
      'false',
    ];
    for (const condition of conditions) {
      const r = check(`jobs:\n  - job: a\n    condition: "${condition.replace(/"/g, '\\"')}"\n    steps:\n      - script: echo hi\n`);
      expect(r.find('condition'), condition).toEqual([]);
    }
  });
});

describe('step names', () => {
  it('reports a name used twice in a job', () => {
    const r = check(`jobs:\n${job('a', '', '      - script: one\n        name: s\n      - script: two\n        name: s\n')}`);
    expect(r.find('duplicate-step-name').map((d) => [d.severity, d.source?.line])).toEqual([['error', 7]]);
  });

  it('allows the same name in different jobs', () => {
    const r = check(`jobs:\n${job('a', '', '      - script: one\n        name: s\n')}${job('b', '', '      - script: two\n        name: s\n')}`);
    expect(r.find('duplicate-step-name')).toEqual([]);
  });
});

describe('keys the pipeline has no use for', () => {
  it('warns about a misspelled key and says which one it looks like', () => {
    const r = check('trigers: none\njobs:\n  - job: a\n    displayname: Hello\n    dependOn: b\n    steps:\n      - script: echo hi\n        displayname: x\n');
    expect(r.warnings.map((d) => [d.source?.line, d.message])).toEqual([
      [1, "Unexpected key 'trigers' in a pipeline. Did you mean 'trigger'?"],
      [4, "Unexpected key 'displayname' in a job. Did you mean 'displayName'?"],
      [5, "Unexpected key 'dependOn' in a job. Did you mean 'dependsOn'?"],
      [8, "Unexpected key 'displayname' in a step. Did you mean 'displayName'?"],
    ]);
    expect(r.errors).toEqual([]);
  });

  it('warns once even when a template is used by several jobs', () => {
    const r = check(`jobs:\n${job('a', '', '      - template: t.yml\n')}${job('b', '', '      - template: t.yml\n')}`, { 't.yml': 'steps:\n  - script: echo hi\n    displayname: x\n' });
    expect(r.find('unknown-key').map((d) => d.source && path.basename(d.source.file) + ':' + d.source.line)).toEqual(['t.yml:3']);
  });

  it('names a misspelled step keyword in the error', () => {
    const r = check('jobs:\n  - job: a\n    steps:\n      - scrpit: echo hi\n');
    expect(r.errors.map((d) => d.message)).toEqual(["Unrecognised step. 'scrpit' looks like a misspelling of 'script'. Expected one of: script, bash, pwsh, powershell, checkout, download, publish, task."]);
  });

  it('does not warn about keys it knows, in stages, deployment jobs and hooks', () => {
    const r = check(
      "name: build\ntrigger: none\nresources:\n  containers: []\nstages:\n  - stage: s\n    displayName: S\n    jobs:\n      - deployment: d\n        environment: prod\n        strategy:\n          runOnce:\n            deploy:\n              steps:\n                - script: echo hi\n                  workingDirectory: src\n                  env: { A: b }\n                  retryCountOnTaskFailure: 2\n",
    );
    expect(r.all).toEqual([]);
  });

  it('says a job or stage with nothing to do does nothing, but leaves a server job alone', () => {
    const r = check('stages:\n  - stage: s\n    jobs:\n      - job: a\n        pool: { vmImage: ubuntu-24.04 }\n  - stage: empty\n');
    expect(r.find('job-no-steps').map((d) => [d.severity, d.source?.line])).toEqual([['warning', 4]]);
    expect(r.find('stage-no-jobs').map((d) => d.source?.line)).toEqual([6]);
    expect(check('jobs:\n  - job: gate\n    pool: server\n').find('job-no-steps')).toEqual([]);
  });

  it('leaves a pipeline with only warnings runnable', () => {
    const r = check('jobs:\n  - job: a\n    displayname: x\n    steps:\n      - script: echo hi\n');
    expect(r.warnings).toHaveLength(1);
    expect(r.errors).toEqual([]);
  });

  it('adds nothing after a syntax error, where the parser has only guessed', () => {
    const r = check('jobs:\n  - job: a\n    steps:\n      - script: echo hi\n     bad: indent\n');
    expect(r.messages.filter((m) => m.includes('unknown-key'))).toEqual([]);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe('suggest', () => {
  const known = ['displayName', 'dependsOn', 'steps', 'trigger'];
  it('finds a near miss and ignores an unrelated word', () => {
    expect(suggest('displayname', known)).toBe('displayName');
    expect(suggest('dependOn', known)).toBe('dependsOn');
    expect(suggest('step', known)).toBe('steps');
    expect(suggest('trigers', known)).toBe('trigger');
    expect(suggest('frobnicate', known)).toBeUndefined();
    expect(suggest('xyz', known)).toBeUndefined();
  });
});

describe('a file named like a pipeline', () => {
  it('knows the names', () => {
    for (const name of ['azure-pipelines.yml', 'azure-pipelines.yaml', '.azure-pipelines.yml', 'azure-pipelines-ci.yml', 'vsts-ci.yml']) expect(hasPipelineName(name), name).toBe(true);
    for (const name of ['ci.yml', 'azure-pipelines.json', 'my-azure-pipelines.yml', 'docker-compose.yml']) expect(hasPipelineName(name), name).toBe(false);
  });

  it('is reported as having nothing to run when it is empty or has no stages, jobs or steps', () => {
    const message = ["This file has no 'stages', 'jobs' or 'steps', so there is nothing to run."];
    expect(check('').errors.map((d) => d.message)).toEqual(message);
    expect(check('trigger: none\njob:\n  - job: a\n').errors.map((d) => d.message)).toEqual(message);
  });
});
