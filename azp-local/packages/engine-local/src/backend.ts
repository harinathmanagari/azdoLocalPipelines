// Where a job's steps run. A job gets one backend for its lifetime: a container that
// stands in for the hosted agent, or (host mode) a scratch folder on this machine.
import { spawn } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { ContainerSpec } from '@azp-local/core';
import type { DockerClient } from './docker';
import { extractTar, firstFile, listDirectory, packBuffer, packFiles, type FileEntry } from './workspace';

export interface BackendPaths {
  /** Pipeline.Workspace / Agent.BuildDirectory */
  workspace: string;
  /** Build.SourcesDirectory / System.DefaultWorkingDirectory */
  sources: string;
  /** Build.ArtifactStagingDirectory */
  artifacts: string;
  /** Build.BinariesDirectory */
  binaries: string;
  /** Agent.TempDirectory */
  temp: string;
  /** Agent.ToolsDirectory: shared across runs so tool installers download once */
  tools: string;
}

export interface ExecSpec {
  cmd: string[];
  env: Record<string, string>;
  cwd: string;
  onOut(chunk: Buffer): void;
  onErr(chunk: Buffer): void;
  /** Aborting stops the process and everything it started. */
  signal?: AbortSignal;
  /** Windows host only: pass arguments to the program exactly as given. */
  verbatim?: boolean;
}

export interface JobBackend {
  readonly kind: 'container' | 'host';
  readonly os: 'Linux' | 'Windows_NT' | 'Darwin';
  readonly arch: 'X64' | 'ARM64';
  /** Image name, or `host`. */
  readonly label: string;
  readonly paths: BackendPaths;
  /** PATH as steps see it before any `task.prependpath`. */
  basePath: string;
  readonly pathDelimiter: ':' | ';';
  /** Path arithmetic in the backend's own syntax. */
  readonly p: typeof path;
  /** Program to run bash scripts with, when there is one. */
  bash?: string;
  containerId?: string;

  prepare(log: (line: string) => void): Promise<void>;
  exec(spec: ExecSpec): Promise<number>;
  mkdirp(dir: string): Promise<void>;
  exists(target: string): Promise<boolean>;
  isDirectory(target: string): Promise<boolean>;
  writeFile(file: string, content: string | Buffer, mode?: number): Promise<void>;
  readFile(file: string): Promise<Buffer | undefined>;
  /** Copies host files into a folder of the backend. */
  copyIn(files: FileEntry[], dest: string, normaliseEol?: boolean): Promise<void>;
  /** Copies a file or folder of the backend to a host folder. Undefined when the source does not exist. */
  copyOut(src: string, hostDir: string): Promise<{ files: number; skippedLinks: number } | undefined>;
  /** Files below a folder, relative, with forward slashes. node_modules and .git are not descended into. */
  listFiles(dir: string): Promise<string[]>;
  cacheSave(src: string, entryBase: string): Promise<boolean>;
  cacheRestore(entryBase: string, dest: string): Promise<boolean>;
  /** Removes the backend. With `keep`, leaves it for debugging and returns how to get a shell in it. */
  dispose(keep: boolean): Promise<string | undefined>;
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

export interface ContainerBackendOptions {
  docker: DockerClient;
  image: string;
  runId: string;
  jobId: string;
  services: Record<string, ContainerSpec>;
  env?: Record<string, string>;
  /** Host folder to bind at the sources directory instead of copying (config `workspace: mount`). */
  mountWorkspace?: string;
  dockerSocket: boolean;
  matchHostedHardware: boolean;
  ensureImage(image: string, log: (line: string) => void): Promise<void>;
}

/**
 * Renames over an existing file. Windows answers EPERM/EBUSY/EACCES while another
 * handle (a parallel leg, a virus scanner) holds the destination; retry briefly, and
 * if the destination exists by then, another save of the same key has already won.
 */
async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') throw err;
      if (attempt >= 8) {
        if (fs.existsSync(to)) return;
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
}

const TOOLS_VOLUME = 'azp-local-tools';
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export class ContainerBackend implements JobBackend {
  readonly kind = 'container';
  readonly os = 'Linux';
  arch: 'X64' | 'ARM64' = 'X64';
  readonly label: string;
  readonly paths: BackendPaths = { workspace: '/__w/1', sources: '/__w/1/s', artifacts: '/__w/1/a', binaries: '/__w/1/b', temp: '/__w/_temp', tools: '/__t' };
  basePath = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';
  readonly pathDelimiter = ':';
  readonly p = path.posix;
  bash?: string;
  containerId?: string;
  private network?: string;
  private readonly serviceIds: string[] = [];

  constructor(private readonly opts: ContainerBackendOptions) {
    this.label = opts.image;
  }

  private get docker(): DockerClient {
    return this.opts.docker;
  }

  private get id(): string {
    if (!this.containerId) throw new Error('The job container has not been created.');
    return this.containerId;
  }

  async prepare(log: (line: string) => void): Promise<void> {
    const { docker, opts } = this;
    await opts.ensureImage(opts.image, log);
    const unique = `${slug(opts.runId)}-${slug(opts.jobId)}-${crypto.randomBytes(3).toString('hex')}`;
    const labels = { 'azp-local': 'true', 'azp-local.run': opts.runId, 'azp-local.job': opts.jobId };

    const serviceNames = Object.keys(opts.services);
    if (serviceNames.length > 0) {
      // Service containers share a network with the job and are reachable by their alias.
      this.network = await docker.createNetwork(`azpl-${unique}`, labels);
      for (const alias of serviceNames) {
        const service = opts.services[alias];
        await opts.ensureImage(service.image, log);
        const id = await docker.createContainer({
          name: `azpl-${unique}-svc-${slug(alias)}`,
          image: service.image,
          env: service.env,
          labels: { ...labels, 'azp-local.service': alias },
          network: `azpl-${unique}`,
          networkAliases: [alias],
          portBindings: service.ports,
        });
        await docker.startContainer(id);
        this.serviceIds.push(id);
        log(`Started service container '${alias}' from ${service.image}`);
      }
    }

    const binds = [`${TOOLS_VOLUME}:${this.paths.tools}`];
    if (opts.mountWorkspace) binds.push(`${opts.mountWorkspace}:${this.paths.sources}`);
    if (opts.dockerSocket) binds.push('/var/run/docker.sock:/var/run/docker.sock');
    this.containerId = await docker.createContainer({
      name: `azpl-${unique}`,
      image: opts.image,
      // Keep the container alive for the job; each step is a separate exec.
      entrypoint: ['tail'],
      cmd: ['-f', '/dev/null'],
      env: opts.env,
      labels,
      binds,
      network: this.network ? `azpl-${unique}` : undefined,
      networkAliases: this.network ? ['job'] : undefined,
      nanoCpus: opts.matchHostedHardware ? 2_000_000_000 : undefined,
      memoryBytes: opts.matchHostedHardware ? 7 * 1024 ** 3 : undefined,
    });
    await docker.startContainer(this.containerId);
    log(`Started job container ${this.containerId.slice(0, 12)} from ${opts.image}`);

    const p = this.paths;
    const probe = await docker.run(this.id, [
      'sh',
      '-c',
      `mkdir -p ${p.sources} ${p.artifacts} ${p.binaries} ${p.temp} ${p.tools} && echo "PATH=$PATH" && echo "ARCH=$(uname -m)" && echo "BASH=$(command -v bash || true)"`,
    ]);
    if (probe.code !== 0) throw new Error(`Could not prepare the job container: ${probe.stderr.trim() || probe.stdout.trim()}`);
    const value = (key: string) => new RegExp(`^${key}=(.*)$`, 'm').exec(probe.stdout)?.[1].trim() ?? '';
    this.basePath = value('PATH') || this.basePath;
    this.arch = /aarch64|arm64/.test(value('ARCH')) ? 'ARM64' : 'X64';
    this.bash = value('BASH') || undefined;
  }

  async exec(spec: ExecSpec): Promise<number> {
    const pidFile = `${this.paths.temp}/.pid-${crypto.randomBytes(6).toString('hex')}`;
    const stop = () => {
      // The step is its own process group; signal the group, then make sure.
      const script = `pid=$(cat ${pidFile} 2>/dev/null) || exit 0; kill -TERM -- -$pid 2>/dev/null || kill -TERM $pid 2>/dev/null; sleep 2; kill -KILL -- -$pid 2>/dev/null || kill -KILL $pid 2>/dev/null; true`;
      this.docker.run(this.id, ['sh', '-c', script]).catch(() => undefined);
    };
    spec.signal?.addEventListener('abort', stop, { once: true });
    try {
      if (spec.signal?.aborted) return 137;
      const code = await this.docker.exec(
        this.id,
        { cmd: ['sh', '-c', 'echo $$ > "$0"; exec "$@"', pidFile, ...spec.cmd], env: spec.env, workingDir: spec.cwd },
        (stream, chunk) => (stream === 'out' ? spec.onOut(chunk) : spec.onErr(chunk)),
      );
      return code;
    } finally {
      spec.signal?.removeEventListener('abort', stop);
      this.docker.run(this.id, ['rm', '-f', pidFile]).catch(() => undefined);
    }
  }

  private async sh(script: string, cwd?: string): Promise<{ code: number; stdout: string; stderr: string }> {
    return this.docker.run(this.id, ['sh', '-c', script], cwd);
  }

  async mkdirp(dir: string): Promise<void> {
    const res = await this.docker.run(this.id, ['mkdir', '-p', dir]);
    if (res.code !== 0) throw new Error(res.stderr.trim() || `Could not create ${dir}`);
  }

  async exists(target: string): Promise<boolean> {
    return (await this.docker.run(this.id, ['test', '-e', target])).code === 0;
  }

  async isDirectory(target: string): Promise<boolean> {
    return (await this.docker.run(this.id, ['test', '-d', target])).code === 0;
  }

  async writeFile(file: string, content: string | Buffer, mode = 0o644): Promise<void> {
    await this.docker.putArchive(this.id, path.posix.dirname(file), packBuffer(path.posix.basename(file), content, mode));
  }

  async readFile(file: string): Promise<Buffer | undefined> {
    const stream = await this.docker.getArchive(this.id, file);
    return stream ? firstFile(stream) : undefined;
  }

  async copyIn(files: FileEntry[], dest: string, normaliseEol = false): Promise<void> {
    await this.mkdirp(dest);
    await this.docker.putArchive(this.id, dest, packFiles(files, normaliseEol));
  }

  async copyOut(src: string, hostDir: string): Promise<{ files: number; skippedLinks: number } | undefined> {
    const isDir = await this.isDirectory(src);
    const stream = await this.docker.getArchive(this.id, src);
    if (!stream) return undefined;
    fs.mkdirSync(hostDir, { recursive: true });
    return extractTar(stream, hostDir, isDir);
  }

  async listFiles(dir: string): Promise<string[]> {
    const res = await this.sh(`find . -type d \\( -name node_modules -o -name .git \\) -prune -o -type f -print`, dir);
    if (res.code !== 0) return [];
    return res.stdout.split('\n').filter(Boolean).map((line) => line.replace(/^\.\//, ''));
  }

  async cacheSave(src: string, entryBase: string): Promise<boolean> {
    const stream = await this.docker.getArchive(this.id, src);
    if (!stream) return false;
    fs.mkdirSync(path.dirname(entryBase), { recursive: true });
    // Parallel legs share a key, so each save writes its own file and then swaps it in.
    const partial = `${entryBase}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.partial`;
    const final = `${entryBase}.tar`;
    try {
      await pipeline(stream, fs.createWriteStream(partial));
      await renameWithRetry(partial, final);
    } finally {
      fs.rmSync(partial, { force: true });
    }
    return true;
  }

  async cacheRestore(entryBase: string, dest: string): Promise<boolean> {
    const file = `${entryBase}.tar`;
    if (!fs.existsSync(file)) return false;
    const parent = path.posix.dirname(dest);
    await this.mkdirp(parent);
    await this.docker.putArchive(this.id, parent, fs.createReadStream(file));
    return true;
  }

  async dispose(keep: boolean): Promise<string | undefined> {
    if (keep && this.containerId) {
      return `docker exec -it -w ${this.paths.sources} ${this.containerId.slice(0, 12)} ${this.bash ? 'bash' : 'sh'}`;
    }
    if (this.containerId) await this.docker.removeContainer(this.containerId).catch(() => undefined);
    for (const id of this.serviceIds) await this.docker.removeContainer(id).catch(() => undefined);
    if (this.network) await this.docker.removeNetwork(this.network);
    this.containerId = undefined;
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Host mode
// ---------------------------------------------------------------------------

/** Finds a program on PATH, honouring PATHEXT on Windows. */
export function which(name: string, searchPath = process.env.PATH ?? process.env.Path ?? ''): string | undefined {
  const extensions = process.platform === 'win32' ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';') : [''];
  for (const dir of searchPath.split(path.delimiter).filter(Boolean)) {
    for (const ext of path.extname(name) ? [''] : extensions) {
      const candidate = path.join(dir, name + ext);
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch {
        /* keep looking */
      }
    }
  }
  return undefined;
}

function findBash(): string | undefined {
  if (process.platform !== 'win32') return which('bash');
  // On Windows `bash` on PATH is often WSL's launcher, which cannot see Windows paths. Prefer Git for Windows.
  const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LocalAppData && path.join(process.env.LocalAppData, 'Programs')];
  for (const root of roots) {
    if (!root) continue;
    const candidate = path.join(root, 'Git', 'bin', 'bash.exe');
    if (fs.existsSync(candidate)) return candidate;
  }
  const onPath = which('bash');
  return onPath && !/\\system32\\/i.test(onPath) ? onPath : undefined;
}

export class HostBackend implements JobBackend {
  readonly kind = 'host';
  readonly os = process.platform === 'win32' ? 'Windows_NT' : process.platform === 'darwin' ? 'Darwin' : 'Linux';
  readonly arch = process.arch === 'arm64' ? 'ARM64' : 'X64';
  readonly label = 'host';
  readonly paths: BackendPaths;
  basePath = process.env.PATH ?? process.env.Path ?? '';
  readonly pathDelimiter = path.delimiter as ':' | ';';
  readonly p = path;
  bash?: string;
  private readonly root: string;

  constructor(scratchRoot: string, toolsDir: string, id: string) {
    this.root = path.join(scratchRoot, id);
    this.paths = {
      workspace: path.join(this.root, '1'),
      sources: path.join(this.root, '1', 's'),
      artifacts: path.join(this.root, '1', 'a'),
      binaries: path.join(this.root, '1', 'b'),
      temp: path.join(this.root, '_temp'),
      tools: toolsDir,
    };
  }

  async prepare(log: (line: string) => void): Promise<void> {
    fs.rmSync(this.root, { recursive: true, force: true });
    for (const dir of Object.values(this.paths)) fs.mkdirSync(dir, { recursive: true });
    this.bash = findBash();
    log(`Host mode: steps run on this machine (${os.type()} ${os.release()}) in ${this.root}`);
    log('Host mode is not isolated: steps use the tools installed here and can reach your files.');
  }

  exec(spec: ExecSpec): Promise<number> {
    return new Promise((resolve) => {
      if (spec.signal?.aborted) return resolve(137);
      let child: ReturnType<typeof spawn>;
      try {
        child = spawn(spec.cmd[0], spec.cmd.slice(1), {
          cwd: spec.cwd,
          env: spec.env,
          windowsHide: true,
          windowsVerbatimArguments: spec.verbatim,
          detached: process.platform !== 'win32',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (err) {
        spec.onErr(Buffer.from(`${(err as Error).message}\n`));
        return resolve(127);
      }
      const stop = () => {
        if (child.pid === undefined) return;
        if (process.platform === 'win32') spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        else {
          try {
            process.kill(-child.pid, 'SIGTERM');
            setTimeout(() => {
              try {
                process.kill(-child.pid!, 'SIGKILL');
              } catch {
                /* already gone */
              }
            }, 2000).unref();
          } catch {
            /* already gone */
          }
        }
      };
      spec.signal?.addEventListener('abort', stop, { once: true });
      child.stdout?.on('data', spec.onOut);
      child.stderr?.on('data', spec.onErr);
      child.on('error', (err) => {
        spec.onErr(Buffer.from(`${err.message}\n`));
        resolve(127);
      });
      child.on('close', (code, signal) => {
        spec.signal?.removeEventListener('abort', stop);
        resolve(code ?? (signal ? 137 : 1));
      });
    });
  }

  async mkdirp(dir: string): Promise<void> {
    fs.mkdirSync(dir, { recursive: true });
  }

  async exists(target: string): Promise<boolean> {
    return fs.existsSync(target);
  }

  async isDirectory(target: string): Promise<boolean> {
    try {
      return fs.statSync(target).isDirectory();
    } catch {
      return false;
    }
  }

  async writeFile(file: string, content: string | Buffer): Promise<void> {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }

  async readFile(file: string): Promise<Buffer | undefined> {
    try {
      return fs.readFileSync(file);
    } catch {
      return undefined;
    }
  }

  async copyIn(files: FileEntry[], dest: string): Promise<void> {
    for (const file of files) {
      const target = path.join(dest, ...file.rel.split('/'));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      try {
        fs.copyFileSync(file.abs, target);
      } catch {
        /* unreadable or vanished: left out */
      }
    }
  }

  async copyOut(src: string, hostDir: string): Promise<{ files: number; skippedLinks: number } | undefined> {
    if (!fs.existsSync(src)) return undefined;
    fs.mkdirSync(hostDir, { recursive: true });
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, hostDir, { recursive: true });
      return { files: listDirectory(hostDir).length, skippedLinks: 0 };
    }
    fs.copyFileSync(src, path.join(hostDir, path.basename(src)));
    return { files: 1, skippedLinks: 0 };
  }

  async listFiles(dir: string): Promise<string[]> {
    const out: string[] = [];
    const walk = (current: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const abs = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git') walk(abs);
        } else if (entry.isFile()) out.push(path.relative(dir, abs).split(path.sep).join('/'));
      }
    };
    walk(dir);
    return out;
  }

  async cacheSave(src: string, entryBase: string): Promise<boolean> {
    if (!fs.existsSync(src)) return false;
    const target = `${entryBase}.dir`;
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(src, target, { recursive: true });
    return true;
  }

  async cacheRestore(entryBase: string, dest: string): Promise<boolean> {
    const source = `${entryBase}.dir`;
    if (!fs.existsSync(source)) return false;
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(source, dest, { recursive: true });
    return true;
  }

  async dispose(keep: boolean): Promise<string | undefined> {
    if (keep) return `cd "${this.paths.sources}"`;
    try {
      fs.rmSync(this.root, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch {
      /* a file still in use on Windows: the temp folder is cleaned up by the OS eventually */
    }
    return undefined;
  }
}
