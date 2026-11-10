// What in .azp-local.yml weakens the isolation of a run. The file lives in the repository,
// so whoever can change the repository (a pull request, a dependency bump) can change it.
// Workspace trust alone is not enough: people trust a repository to read it. A run that
// would leave the container, or bring host files into it, needs the person's own approval,
// remembered outside the repository and asked again when any of these settings change.
import * as crypto from 'node:crypto';
import * as path from 'node:path';
import { resolveTarget } from './targets';
import type { LocalConfig, RunPlan } from './types';

export interface IsolationRisk {
  kind: 'host' | 'dockerSocket' | 'mount' | 'outsidePath';
  /** One sentence for the person deciding. */
  message: string;
  /** Stable text that identifies exactly what is allowed; part of the fingerprint. */
  detail: string;
}

const outside = (root: string, target: string) => {
  const rel = path.relative(path.resolve(root), path.resolve(root, target));
  return rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
};

/** The settings that weaken isolation for the jobs this plan will run. */
export function isolationRisks(plan: RunPlan, config: LocalConfig, workspaceRoot: string, platform: NodeJS.Platform = process.platform): IsolationRisk[] {
  const risks = new Map<string, IsolationRisk>();
  const add = (risk: IsolationRisk) => risks.set(risk.detail, risk);
  const jobs = plan.jobs.filter((pj) => pj.action === 'run').map((pj) => pj.job);
  let containerJobs = 0;

  for (const job of jobs) {
    const target = resolveTarget(job, config, platform);
    if (target.kind === 'container') containerJobs++;
    if (target.kind === 'host') {
      const label = job.pool.label || '(default pool)';
      add({
        kind: 'host',
        detail: `host:${label.toLowerCase()}`,
        message: `Pool '${label}' is mapped to host: its jobs run directly on this machine, not in a container, and can read and change any of your files.`,
      });
    }
    for (const step of job.steps) {
      const run = step.run;
      if (run.kind === 'checkout' && run.repository !== 'self' && run.repository !== 'none') {
        const alias = Object.keys(config.repositories).find((a) => a.toLowerCase() === run.repository.toLowerCase());
        const mapped = alias ? config.repositories[alias] : undefined;
        if (mapped !== undefined && outside(workspaceRoot, mapped)) {
          const abs = path.resolve(workspaceRoot, mapped);
          add({ kind: 'outsidePath', detail: `repository:${alias!.toLowerCase()}=${abs}`, message: `Repository '${alias}' is mapped to ${abs}, outside this repository: its checkout copies that folder into the job.` });
        }
      }
      if (run.kind === 'task' && run.override && (run.override.action === 'path' || run.override.action === 'script')) {
        const ref = run.override.action === 'path' ? run.override.path : run.override.script;
        if (outside(workspaceRoot, ref)) {
          const abs = path.resolve(workspaceRoot, ref);
          const what = run.override.action === 'path' ? 'task folder' : 'replacement script';
          add({ kind: 'outsidePath', detail: `task:${run.override.action}=${abs}`, message: `The ${what} ${abs} is outside this repository: it is copied into the job.` });
        }
      }
    }
  }

  if (containerJobs > 0 && config.dockerSocket) {
    add({ kind: 'dockerSocket', detail: 'dockerSocket', message: 'dockerSocket: true gives jobs control of Docker on this machine, which is equivalent to administrator rights on it.' });
  }
  if (containerJobs > 0 && config.workspace === 'mount') {
    add({
      kind: 'mount',
      detail: `mount:${path.resolve(workspaceRoot)}`,
      message: `workspace: mount gives jobs write access to ${path.resolve(workspaceRoot)} itself, ignored files such as .env included, instead of a copy.`,
    });
  }
  return [...risks.values()].sort((a, b) => a.detail.localeCompare(b.detail));
}

/** Identifies a set of risks: the same settings give the same fingerprint, any change a new one. */
export function isolationFingerprint(risks: IsolationRisk[]): string {
  const text = risks
    .map((r) => r.detail)
    .sort()
    .join('\n');
  return crypto.createHash('sha256').update(text).digest('hex');
}
