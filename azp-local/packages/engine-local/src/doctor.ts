// Doctor, the Docker half: is a daemon reachable, are the images there, is there room.
import * as fs from 'node:fs';
import { resolveTarget, type Finding, type LocalConfig, type Pipeline } from '@azp-local/core';
import { DockerClient } from './docker';

const gigabytes = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(1)} GB`;

export async function checkDocker(pipelines: Pipeline[], config: LocalConfig, opts: { dockerHost?: string; storeDir?: string; platform?: NodeJS.Platform } = {}): Promise<Finding[]> {
  const findings: Finding[] = [];
  const platform = opts.platform ?? process.platform;
  const images = new Map<string, boolean>();
  for (const job of pipelines.flatMap((p) => p.stages.flatMap((s) => s.jobs))) {
    const target = resolveTarget(job, config, platform);
    if (target.kind === 'container') images.set(target.image, !!target.builtIn);
    for (const service of Object.values(job.services)) images.set(service.image, false);
  }

  let docker: DockerClient | undefined;
  try {
    docker = await DockerClient.connect(opts.dockerHost);
    const [version, info] = await Promise.all([docker.version(), docker.info()]);
    findings.push({ level: 'ok', area: 'Docker', message: `Docker ${version.Version} at ${docker.endpoint.label} (${info.OSType}/${info.Architecture}, ${info.NCPU} CPUs, ${gigabytes(info.MemTotal)} memory)` });
    if (info.OSType !== 'linux') {
      findings.push({ level: 'warning', area: 'Docker', message: `The daemon runs ${info.OSType} containers. Linux jobs need it switched to Linux containers.` });
    }
    if (info.MemTotal < 7 * 1024 ** 3) {
      findings.push({ level: 'info', area: 'Docker', message: 'Hosted agents have 7 GB of memory; this daemon has less, so memory-hungry steps may behave differently.' });
    }
  } catch (err) {
    findings.push({
      level: images.size > 0 ? 'error' : 'info',
      area: 'Docker',
      message: (err as Error).message.split('\n')[0],
      remedy: 'The graph and expansion work without Docker. Running container jobs needs a daemon.',
    });
  }

  if (docker) {
    for (const [image, builtIn] of images) {
      try {
        const present = await docker.imageInfo(image);
        if (present) findings.push({ level: 'ok', area: 'Images', message: `${image}: present (${gigabytes(present.Size)})` });
        else {
          findings.push({
            level: 'info',
            area: 'Images',
            message: builtIn ? `${image}: not built yet. It is built on first use, which takes a few minutes.` : `${image}: not present. It is pulled on first use.`,
          });
        }
      } catch (err) {
        findings.push({ level: 'warning', area: 'Images', message: `${image}: ${(err as Error).message}` });
      }
    }
  }

  if (opts.storeDir) {
    try {
      fs.mkdirSync(opts.storeDir, { recursive: true });
      const stat = fs.statfsSync(opts.storeDir);
      const free = stat.bavail * stat.bsize;
      findings.push({
        level: free < 5 * 1024 ** 3 ? 'warning' : 'ok',
        area: 'Disk',
        message: `${gigabytes(free)} free where runs, artifacts and caches are stored (${opts.storeDir})`,
      });
    } catch {
      /* statfs is not available everywhere */
    }
  }
  return findings;
}
