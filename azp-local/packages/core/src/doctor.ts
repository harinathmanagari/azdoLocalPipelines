// Doctor, the part that needs no Docker: what a pipeline uses that needs a decision
// in .azp-local.yml. The engine adds the Docker checks.
import { resolveTarget } from './targets';
import type { LocalConfig, Pipeline } from './types';
import { describeSource } from './yaml';

export interface Finding {
  level: 'ok' | 'info' | 'warning' | 'error';
  area: string;
  message: string;
  remedy?: string;
}

export function analysePipelines(pipelines: Pipeline[], config: LocalConfig, platform: NodeJS.Platform = process.platform): Finding[] {
  const findings: Finding[] = [];

  if (!config.file) {
    findings.push({ level: 'info', area: 'Config', message: 'No .azp-local.yml. Defaults apply; a self-contained pipeline needs none.' });
  } else if (config.diagnostics.length === 0) {
    findings.push({ level: 'ok', area: 'Config', message: `${config.file} is valid.` });
  }
  for (const d of config.diagnostics) {
    findings.push({ level: d.severity === 'error' ? 'error' : 'warning', area: 'Config', message: `${d.message} (${describeSource(d.source)})` });
  }
  if (config.dockerSocket) {
    findings.push({
      level: 'warning',
      area: 'Security',
      message: 'dockerSocket is enabled: steps can control Docker on this machine, which is equivalent to root on the host.',
    });
  }

  for (const pipeline of pipelines) {
    const errors = pipeline.diagnostics.filter((d) => d.severity === 'error');
    for (const d of errors) findings.push({ level: 'error', area: 'Expansion', message: `${d.message} (${describeSource(d.source)})` });

    const jobs = pipeline.stages.flatMap((s) => s.jobs);
    const pools = new Map<string, string[]>();
    for (const job of jobs) {
      const label = job.container ? `container ${job.container.image}` : job.pool.label || '(default pool)';
      pools.set(label, [...(pools.get(label) ?? []), job.id]);
    }
    const seenPool = new Set<string>();
    for (const job of jobs) {
      const label = job.container ? `container ${job.container.image}` : job.pool.label || '(default pool)';
      if (seenPool.has(label)) continue;
      seenPool.add(label);
      const target = resolveTarget(job, config, platform);
      const count = pools.get(label)!.length;
      const where = `${count} job${count === 1 ? '' : 's'}`;
      if (target.kind === 'container') {
        findings.push({ level: 'ok', area: 'Pools', message: `${label} -> ${target.image} (${where})` });
      } else if (target.kind === 'host') {
        findings.push({ level: 'warning', area: 'Pools', message: `${label} -> host mode (${where}). Steps run on this machine without isolation.` });
      } else {
        findings.push({ level: 'warning', area: 'Pools', message: `${label} is not runnable locally (${where}).`, remedy: target.reason });
      }
    }

    const groups = new Set<string>();
    for (const decl of [...pipeline.variables, ...pipeline.stages.flatMap((s) => s.variables), ...jobs.flatMap((j) => j.variables)]) {
      if (decl.group) groups.add(decl.group);
    }
    for (const group of groups) {
      const values = config.variableGroups[group];
      if (!values) {
        findings.push({
          level: 'warning',
          area: 'Variable groups',
          message: `Variable group '${group}' is used but has no local values.`,
          remedy: `Add it under 'variableGroups:' in .azp-local.yml.`,
        });
      } else {
        const secrets = Object.entries(values).filter(([, v]) => v.secret).map(([name]) => name);
        findings.push({
          level: 'ok',
          area: 'Variable groups',
          message: `${group}: ${Object.keys(values).length} value(s)${secrets.length ? `, secrets prompted for: ${secrets.join(', ')}` : ''}`,
        });
      }
    }

    const tasks = new Map<string, { tier: number; reason: string; override?: string; count: number }>();
    for (const step of jobs.flatMap((j) => j.steps)) {
      if (step.run.kind !== 'task') continue;
      const key = step.run.version ? `${step.run.name}@${step.run.version}` : step.run.name;
      const o = step.run.override;
      const override = !o ? undefined : o.action === 'script' ? `script ${o.script}` : o.action === 'path' ? `task code in ${o.path}` : o.action;
      const entry = tasks.get(key) ?? { tier: step.run.tier, reason: step.run.tierReason, override, count: 0 };
      entry.count++;
      tasks.set(key, entry);
    }
    for (const [name, task] of tasks) {
      if (task.override) {
        findings.push({
          level: task.override.startsWith('script') ? 'warning' : 'info',
          area: 'Tasks',
          message: `${name} (tier ${task.tier}) -> ${task.override}${task.override.startsWith('script') ? '. A replacement script runs instead of the real task.' : ''}`,
        });
      } else if (task.tier === 1) {
        findings.push({ level: 'ok', area: 'Tasks', message: `${name}: built in.` });
      } else if (task.tier === 2) {
        findings.push({
          level: 'warning',
          area: 'Tasks',
          message: `${name}: task package not available, so the step will be reported as not run.`,
          remedy: `Map a folder that holds its task.json: tasks: { ${name}: { path: ../tasks/${name.split('@')[0]} } }, or choose skip, fail or a replacement script.`,
        });
      } else {
        findings.push({
          level: 'warning',
          area: 'Tasks',
          message: `${name}: cannot run locally. ${task.reason} The step will be reported as not run.`,
          remedy: `Decide in .azp-local.yml: tasks: { ${name}: skip }, fail, or { script: ./ci/local/stub.sh }.`,
        });
      }
    }
  }
  return findings;
}

export function renderFindings(findings: Finding[]): string {
  const mark = { ok: '[ok]  ', info: '[info]', warning: '[warn]', error: '[fail]' } as const;
  const lines: string[] = [];
  let area = '';
  for (const f of findings) {
    if (f.area !== area) {
      area = f.area;
      lines.push('', area);
    }
    lines.push(`  ${mark[f.level]} ${f.message}`);
    if (f.remedy) lines.push(`         -> ${f.remedy}`);
  }
  return lines.join('\n').trimStart();
}
