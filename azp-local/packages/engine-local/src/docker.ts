// A small client for the Docker Engine API (D13). It speaks HTTP over the daemon's
// named pipe, Unix socket or TCP port, so it gets streamed logs, exit codes and
// cancellation without the `docker` command, and works with Docker Desktop,
// Rancher Desktop (moby), Podman's compatible socket and Docker inside WSL.
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Readable } from 'node:stream';

export class DockerError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export interface DockerEndpoint {
  socketPath?: string;
  host?: string;
  port?: number;
  label: string;
}

export function parseDockerHost(value: string): DockerEndpoint {
  if (value.startsWith('npipe://')) {
    const pipe = value.slice('npipe://'.length).replace(/\//g, '\\');
    return { socketPath: pipe.startsWith('\\\\') ? pipe : `\\\\${pipe.replace(/^\\+/, '')}`, label: value };
  }
  if (value.startsWith('unix://')) return { socketPath: value.slice('unix://'.length), label: value };
  if (value.startsWith('tcp://') || value.startsWith('http://')) {
    const url = new URL(value.replace(/^tcp:/, 'http:'));
    return { host: url.hostname, port: Number(url.port || 2375), label: value };
  }
  return { socketPath: value, label: value };
}

/** Places a daemon is usually found, most specific first. */
export function candidateEndpoints(configured?: string): DockerEndpoint[] {
  const out: DockerEndpoint[] = [];
  if (configured) out.push(parseDockerHost(configured));
  if (process.env.DOCKER_HOST) out.push(parseDockerHost(process.env.DOCKER_HOST));
  if (process.platform === 'win32') {
    out.push(parseDockerHost('npipe:////./pipe/docker_engine'));
    out.push(parseDockerHost('npipe:////./pipe/podman-machine-default'));
  } else {
    out.push(parseDockerHost('unix:///var/run/docker.sock'));
    out.push(parseDockerHost(`unix://${path.join(os.homedir(), '.rd/docker.sock')}`));
    out.push(parseDockerHost(`unix://${path.join(os.homedir(), '.docker/run/docker.sock')}`));
    if (process.env.XDG_RUNTIME_DIR) out.push(parseDockerHost(`unix://${path.join(process.env.XDG_RUNTIME_DIR, 'podman/podman.sock')}`));
  }
  return out.filter((e, i) => out.findIndex((o) => o.label === e.label) === i);
}

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  json?: unknown;
  body?: Readable | Buffer;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface ContainerConfig {
  name?: string;
  image: string;
  cmd?: string[];
  entrypoint?: string[];
  env?: Record<string, string>;
  workingDir?: string;
  labels?: Record<string, string>;
  binds?: string[];
  network?: string;
  networkAliases?: string[];
  portBindings?: string[];
  nanoCpus?: number;
  memoryBytes?: number;
}

export class DockerClient {
  constructor(readonly endpoint: DockerEndpoint) {}

  /** The first endpoint that answers a ping. */
  static async connect(configured?: string): Promise<DockerClient> {
    const tried: string[] = [];
    for (const endpoint of candidateEndpoints(configured)) {
      const client = new DockerClient(endpoint);
      try {
        await client.ping();
        return client;
      } catch (err) {
        tried.push(`${endpoint.label}: ${(err as Error).message}`);
      }
    }
    throw new DockerError(`Docker is not reachable. Start Docker Desktop, Rancher Desktop (dockerd engine) or Podman, then try again.\n  ${tried.join('\n  ')}`);
  }

  private request(method: string, apiPath: string, opts: RequestOptions = {}): Promise<http.IncomingMessage> {
    const query = Object.entries(opts.query ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    const headers: Record<string, string> = { Host: 'docker', ...(opts.headers ?? {}) };
    let payload: Buffer | undefined;
    if (opts.json !== undefined) {
      payload = Buffer.from(JSON.stringify(opts.json));
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(payload.length);
    } else if (Buffer.isBuffer(opts.body)) {
      payload = opts.body;
      headers['Content-Length'] = String(payload.length);
    }
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          method,
          path: query ? `${apiPath}?${query}` : apiPath,
          headers,
          agent: false,
          ...(this.endpoint.socketPath ? { socketPath: this.endpoint.socketPath } : { host: this.endpoint.host, port: this.endpoint.port }),
        },
        resolve,
      );
      req.on('error', (err) => reject(new DockerError(err.message)));
      if (opts.timeoutMs) req.setTimeout(opts.timeoutMs, () => req.destroy(new Error('timed out')));
      if (payload) req.end(payload);
      else if (opts.body) {
        (opts.body as Readable).on('error', (err) => req.destroy(err));
        (opts.body as Readable).pipe(req);
      } else req.end();
    });
  }

  private static async text(res: http.IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of res) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString('utf8');
  }

  private async call<T = unknown>(method: string, apiPath: string, opts: RequestOptions = {}): Promise<T> {
    const res = await this.request(method, apiPath, opts);
    const text = await DockerClient.text(res);
    if ((res.statusCode ?? 500) >= 400) throw DockerClient.error(text, res.statusCode);
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private static error(text: string, status?: number): DockerError {
    try {
      return new DockerError((JSON.parse(text) as { message?: string }).message ?? text, status);
    } catch {
      return new DockerError(text.trim() || `Docker returned HTTP ${status}`, status);
    }
  }

  /** Reads a stream of JSON progress objects (pull, build), failing on the first that carries an error. */
  private async progress(res: http.IncomingMessage, onMessage: (message: Record<string, unknown>) => void): Promise<void> {
    if ((res.statusCode ?? 500) >= 400) throw DockerClient.error(await DockerClient.text(res), res.statusCode);
    let buffer = '';
    let failure: string | undefined;
    const handle = (line: string) => {
      if (!line.trim()) return;
      try {
        const message = JSON.parse(line) as Record<string, unknown>;
        if (typeof message.error === 'string') failure ??= message.error;
        else onMessage(message);
      } catch {
        /* not JSON: ignore */
      }
    };
    for await (const chunk of res) {
      buffer += (chunk as Buffer).toString('utf8');
      let index: number;
      while ((index = buffer.indexOf('\n')) >= 0) {
        handle(buffer.slice(0, index));
        buffer = buffer.slice(index + 1);
      }
    }
    handle(buffer);
    if (failure) throw new DockerError(failure);
  }

  // --- daemon ------------------------------------------------------------------

  async ping(): Promise<void> {
    const res = await this.request('GET', '/_ping', { timeoutMs: 4000 });
    const text = await DockerClient.text(res);
    if ((res.statusCode ?? 500) >= 400) throw DockerClient.error(text, res.statusCode);
  }

  version(): Promise<{ Version: string; ApiVersion: string; Os: string; Arch: string }> {
    return this.call('GET', '/version');
  }

  info(): Promise<{ OSType: string; Architecture: string; NCPU: number; MemTotal: number; ServerVersion: string; Name: string; DockerRootDir: string }> {
    return this.call('GET', '/info');
  }

  // --- images ------------------------------------------------------------------

  async imageInfo(name: string): Promise<{ Id: string; Size: number; RepoDigests?: string[] } | undefined> {
    try {
      return await this.call('GET', `/images/${name}/json`);
    } catch (err) {
      if (err instanceof DockerError && err.status === 404) return undefined;
      throw err;
    }
  }

  async pull(image: string, onStatus: (line: string) => void): Promise<void> {
    const lastColon = image.lastIndexOf(':');
    const hasTag = lastColon > image.lastIndexOf('/') && !image.includes('@');
    const res = await this.request('POST', '/images/create', {
      query: { fromImage: hasTag ? image.slice(0, lastColon) : image, tag: hasTag ? image.slice(lastColon + 1) : image.includes('@') ? undefined : 'latest' },
    });
    let last = '';
    await this.progress(res, (message) => {
      const status = String(message.status ?? '');
      // Layer progress repeats many times a second; report each distinct status once.
      const line = message.id && /^(Downloading|Extracting|Waiting|Verifying)/.test(status) ? '' : [message.id, status].filter(Boolean).join(': ');
      if (line && line !== last) {
        last = line;
        onStatus(line);
      }
    });
  }

  async build(context: Readable, tag: string, buildArgs: Record<string, string>, onOutput: (text: string) => void): Promise<void> {
    const res = await this.request('POST', '/build', {
      query: { t: tag, buildargs: JSON.stringify(buildArgs), rm: 1, forcerm: 1, version: 1 },
      headers: { 'Content-Type': 'application/x-tar' },
      body: context,
    });
    await this.progress(res, (message) => {
      if (typeof message.stream === 'string') onOutput(message.stream);
      else if (typeof message.status === 'string' && !message.progressDetail) onOutput(`${message.status}\n`);
    });
  }

  // --- containers --------------------------------------------------------------

  async createContainer(config: ContainerConfig): Promise<string> {
    const portBindings: Record<string, { HostPort: string }[]> = {};
    const exposed: Record<string, object> = {};
    for (const mapping of config.portBindings ?? []) {
      const [hostPort, containerPort] = mapping.includes(':') ? mapping.split(':').slice(-2) : [mapping, mapping];
      const key = containerPort.includes('/') ? containerPort : `${containerPort}/tcp`;
      exposed[key] = {};
      portBindings[key] = [{ HostPort: hostPort }];
    }
    const created = await this.call<{ Id: string }>('POST', '/containers/create', {
      query: { name: config.name },
      json: {
        Image: config.image,
        Cmd: config.cmd,
        Entrypoint: config.entrypoint,
        Env: Object.entries(config.env ?? {}).map(([k, v]) => `${k}=${v}`),
        WorkingDir: config.workingDir,
        Labels: config.labels,
        Tty: false,
        ExposedPorts: exposed,
        HostConfig: {
          Binds: config.binds,
          NanoCpus: config.nanoCpus,
          Memory: config.memoryBytes,
          PortBindings: portBindings,
          ...(config.network ? { NetworkMode: config.network } : {}),
        },
        ...(config.network
          ? { NetworkingConfig: { EndpointsConfig: { [config.network]: { Aliases: config.networkAliases ?? [] } } } }
          : {}),
      },
    });
    return created.Id;
  }

  async startContainer(id: string): Promise<void> {
    await this.call('POST', `/containers/${id}/start`);
  }

  async removeContainer(id: string): Promise<void> {
    try {
      await this.call('DELETE', `/containers/${id}`, { query: { force: 1, v: 1 } });
    } catch (err) {
      if (!(err instanceof DockerError && err.status === 404)) throw err;
    }
  }

  listContainers(label: string): Promise<{ Id: string; Names: string[]; Labels: Record<string, string>; State: string; Image: string }[]> {
    return this.call('GET', '/containers/json', { query: { all: 1, filters: JSON.stringify({ label: [label] }) } });
  }

  /**
   * Runs a process in a container and streams its output. Resolves with the exit code.
   * The output arrives as Docker's multiplexed stream: 8-byte frames of [stream, 0, 0, 0, length].
   */
  async exec(
    container: string,
    spec: { cmd: string[]; env?: Record<string, string>; workingDir?: string; user?: string },
    onData?: (stream: 'out' | 'err', chunk: Buffer) => void,
  ): Promise<number> {
    const created = await this.call<{ Id: string }>('POST', `/containers/${container}/exec`, {
      json: {
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        Cmd: spec.cmd,
        Env: Object.entries(spec.env ?? {}).map(([k, v]) => `${k}=${v}`),
        WorkingDir: spec.workingDir,
        User: spec.user,
      },
    });
    const res = await this.request('POST', `/exec/${created.Id}/start`, { json: { Detach: false, Tty: false } });
    if ((res.statusCode ?? 500) >= 400) throw DockerClient.error(await DockerClient.text(res), res.statusCode);
    let pending: Buffer = Buffer.alloc(0);
    for await (const chunk of res) {
      pending = pending.length ? Buffer.concat([pending, chunk as Buffer]) : (chunk as Buffer);
      while (pending.length >= 8) {
        const length = pending.readUInt32BE(4);
        if (pending.length < 8 + length) break;
        onData?.(pending[0] === 2 ? 'err' : 'out', pending.subarray(8, 8 + length));
        pending = pending.subarray(8 + length);
      }
    }
    const inspected = await this.call<{ ExitCode: number | null }>('GET', `/exec/${created.Id}/json`);
    return inspected.ExitCode ?? -1;
  }

  /** Runs a short command and returns what it printed. */
  async run(container: string, cmd: string[], workingDir?: string): Promise<{ code: number; stdout: string; stderr: string }> {
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    const code = await this.exec(container, { cmd, workingDir }, (stream, chunk) => (stream === 'out' ? out : err).push(chunk));
    return { code, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') };
  }

  /** Extracts a tar stream into a directory of the container. */
  async putArchive(container: string, dir: string, tar: Readable): Promise<void> {
    const res = await this.request('PUT', `/containers/${container}/archive`, {
      query: { path: dir },
      headers: { 'Content-Type': 'application/x-tar' },
      body: tar,
    });
    const text = await DockerClient.text(res);
    if ((res.statusCode ?? 500) >= 400) throw DockerClient.error(text, res.statusCode);
  }

  /** A tar stream of a file or directory of the container, or undefined when the path does not exist. */
  async getArchive(container: string, target: string): Promise<Readable | undefined> {
    const res = await this.request('GET', `/containers/${container}/archive`, { query: { path: target } });
    if (res.statusCode === 404) {
      res.resume();
      return undefined;
    }
    if ((res.statusCode ?? 500) >= 400) throw DockerClient.error(await DockerClient.text(res), res.statusCode);
    return res;
  }

  // --- networks ----------------------------------------------------------------

  async createNetwork(name: string, labels: Record<string, string>): Promise<string> {
    return (await this.call<{ Id: string }>('POST', '/networks/create', { json: { Name: name, Labels: labels } })).Id;
  }

  async removeNetwork(id: string): Promise<void> {
    try {
      await this.call('DELETE', `/networks/${id}`);
    } catch {
      /* already gone, or still in use by a kept container */
    }
  }
}

/** True when a path exists and is a socket or pipe a daemon could be listening on. */
export function endpointExists(endpoint: DockerEndpoint): boolean {
  if (!endpoint.socketPath) return true;
  try {
    return fs.existsSync(endpoint.socketPath);
  } catch {
    return false;
  }
}
