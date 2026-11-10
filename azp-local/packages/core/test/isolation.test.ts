// What in .azp-local.yml weakens a run's isolation, and when an approval must be asked again.
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPlan, isolationFingerprint, isolationRisks, loadPipeline, parseConfig, type Selection } from '../src';

const root = path.resolve('/virtual-workspace');
const noHistory = { lastSuccessful: () => undefined, fromRun: () => undefined };

function risks(yaml: string, configText: string, selection: Selection = { kind: 'pipeline' }) {
  const config = parseConfig(configText, path.join(root, '.azp-local.yml'));
  const files = new Map([[path.join(root, 'azure-pipelines.yml'), yaml]]);
  const { pipeline } = loadPipeline('azure-pipelines.yml', { workspaceRoot: root, config, readFile: (f) => files.get(path.normalize(f)) });
  expect(pipeline.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const plan = createPlan(pipeline, selection, { history: noHistory, buildId: 1, buildNumber: '1' });
  return isolationRisks(plan, config, root, 'linux');
}

const two = `
jobs:
  - job: inContainer
    pool: { vmImage: ubuntu-latest }
    steps:
      - script: echo hi
  - job: onHost
    pool: mine
    steps:
      - checkout: tools
      - task: Deploy@1
`;

describe('isolation risks', () => {
  it('finds nothing in a plain pipeline with no config', () => {
    expect(risks(two, '')).toEqual([]);
  });

  it('flags host mode, the Docker socket, a mounted workspace and paths outside the repository', () => {
    const found = risks(
      two,
      `
images: { mine: host }
dockerSocket: true
workspace: mount
repositories: { tools: ../../home/me }
tasks: { Deploy@1: { script: /etc/secret.sh } }
`,
    );
    expect(found.map((r) => r.kind).sort()).toEqual(['dockerSocket', 'host', 'mount', 'outsidePath', 'outsidePath']);
    expect(found.find((r) => r.kind === 'host')?.message).toContain("Pool 'mine' is mapped to host");
  });

  it('leaves out paths inside the repository and jobs that do not run', () => {
    const config = `
images: { mine: host }
repositories: { tools: ./vendor/tools }
tasks: { Deploy@1: { script: ./ci/deploy-stub.sh } }
`;
    expect(risks(two, config)).toHaveLength(1);
    // Only the container job is selected: host mode does not apply to this run.
    expect(risks(two, config, { kind: 'job', jobId: '__default.inContainer' })).toEqual([]);
  });

  it('gives the same fingerprint for the same settings and a new one when any changes', () => {
    const base = 'images: { mine: host }\ndockerSocket: true\n';
    const a = isolationFingerprint(risks(two, base));
    expect(isolationFingerprint(risks(two, base))).toBe(a);
    expect(isolationFingerprint(risks(two, `${base}workspace: mount\n`))).not.toBe(a);
    expect(isolationFingerprint(risks(two, `${base}repositories: { tools: ../other }\n`))).not.toBe(a);
  });
});
