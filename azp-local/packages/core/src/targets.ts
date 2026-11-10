// Where a job runs locally: which container image stands in for its pool, or the
// host, or nowhere. Pure data in, pure data out, so the graph, Doctor and the engine agree.
import type { Job, LocalConfig } from './types';

export type JobTarget =
  /** `builtIn` names the Ubuntu release of the slim image the tool builds itself. */
  | { kind: 'container'; image: string; builtIn?: string; source: 'container-job' | 'config' | 'default' }
  | { kind: 'host'; note: string }
  | { kind: 'unsupported'; reason: string };

export const BUILT_IN_IMAGE = 'azp-local/agent-ubuntu';
const DEFAULT_UBUNTU = '24.04';

function ubuntuRelease(label: string): string | undefined {
  const m = /^ubuntu-(latest|\d\d\.\d\d)$/i.exec(label);
  if (!m) return undefined;
  return m[1].toLowerCase() === 'latest' ? DEFAULT_UBUNTU : m[1];
}

function configured(config: LocalConfig, label: string): string | undefined {
  const key = Object.keys(config.images).find((k) => k.toLowerCase() === label.toLowerCase());
  return key ? config.images[key] : undefined;
}

export function resolveTarget(job: Job, config: LocalConfig, platform: NodeJS.Platform = process.platform): JobTarget {
  if (job.pool.kind === 'server') {
    return { kind: 'unsupported', reason: 'Agentless (server) jobs run inside Azure DevOps and have no local equivalent.' };
  }
  // `container:` on the job is used exactly as on Azure, whatever the pool.
  if (job.container) return { kind: 'container', image: job.container.image, source: 'container-job' };

  const label = job.pool.label || 'ubuntu-latest';
  const mapped = configured(config, label);
  if (mapped !== undefined) {
    if (mapped.toLowerCase() !== 'host') return { kind: 'container', image: mapped, source: 'config' };
    const wantsWindows = /^windows/i.test(label);
    const wantsMac = /^macos/i.test(label);
    if ((wantsWindows && platform !== 'win32') || (wantsMac && platform !== 'darwin')) {
      return { kind: 'unsupported', reason: `'${label}' is mapped to host, but this machine is not ${wantsWindows ? 'Windows' : 'macOS'}.` };
    }
    return { kind: 'host', note: 'Runs directly on this machine in a scratch folder. Not isolated.' };
  }

  const release = ubuntuRelease(label);
  if (release) return { kind: 'container', image: `${BUILT_IN_IMAGE}:${release}`, builtIn: release, source: 'default' };
  if (/^windows/i.test(label)) {
    return {
      kind: 'unsupported',
      reason: `Windows jobs need host mode. Add 'images: { ${label}: host }' to .azp-local.yml on a Windows machine to run them unisolated.`,
    };
  }
  if (/^macos/i.test(label)) {
    return { kind: 'unsupported', reason: 'macOS jobs cannot run in a container. They can be mapped to host on a Mac.' };
  }
  return {
    kind: 'unsupported',
    reason: `No image is mapped for pool '${label}'. Add it under 'images:' in .azp-local.yml.`,
  };
}

export function describeTarget(target: JobTarget): string {
  if (target.kind === 'container') return target.image;
  if (target.kind === 'host') return 'host (not isolated)';
  return 'not runnable locally';
}
