// The Docker client against a stand-in daemon that speaks the same HTTP shapes:
// multiplexed exec output, tar upload and download, streamed JSON progress.
// This checks our side of the protocol. It is not a substitute for a real daemon.
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DockerClient, DockerError, parseDockerHost } from '../src';
import { extractTar, firstFile, packBuffer, packFiles } from '../src/workspace';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const frame = (stream: 1 | 2, text: string) => {
  const body = Buffer.from(text);
  const head = Buffer.alloc(8);
  head[0] = stream;
  head.writeUInt32BE(body.length, 4);
  return Buffer.concat([head, body]);
};

const seen: { method: string; url: string; body: Buffer }[] = [];
let server: http.Server;
let docker: DockerClient;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'azpl-docker-'));

beforeAll(async () => {
  server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);
    const url = new URL(req.url ?? '/', 'http://daemon');
    seen.push({ method: req.method ?? '', url: req.url ?? '', body });
    const json = (status: number, value: unknown) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(value));

    if (url.pathname === '/_ping') return res.writeHead(200).end('OK');
    if (url.pathname === '/containers/c1/exec') return json(201, { Id: 'e1' });
    if (url.pathname === '/exec/e1/start') {
      res.writeHead(200, { 'Content-Type': 'application/vnd.docker.multiplexed-stream' });
      // Frames do not line up with network chunks: split one in the middle of its header.
      const all = Buffer.concat([frame(1, 'hello\nwor'), frame(2, 'oops\n'), frame(1, 'ld\n')]);
      res.write(all.subarray(0, 3));
      await new Promise((resolve) => setTimeout(resolve, 20));
      res.write(all.subarray(3, 20));
      await new Promise((resolve) => setTimeout(resolve, 20));
      return res.end(all.subarray(20));
    }
    if (url.pathname === '/exec/e1/json') return json(200, { ExitCode: 3 });
    if (url.pathname === '/containers/c1/archive' && req.method === 'PUT') return res.writeHead(200).end();
    if (url.pathname === '/containers/c1/archive' && req.method === 'GET') {
      if (url.searchParams.get('path') === '/missing') return json(404, { message: 'Could not find the file /missing in container c1' });
      res.writeHead(200, { 'Content-Type': 'application/x-tar' });
      return packBuffer('dist/index.html', '<h1>hi</h1>').pipe(res);
    }
    if (url.pathname === '/images/ghost:1/json') return json(404, { message: 'No such image: ghost:1' });
    if (url.pathname === '/images/create') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(`${JSON.stringify({ status: 'Pulling from library/ghost', id: '1' })}\n`);
      res.write(`${JSON.stringify({ status: 'Downloading', id: 'abc', progressDetail: { current: 1 } })}\n`);
      return res.end(`${JSON.stringify({ error: 'pull access denied for ghost' })}\n`);
    }
    if (url.pathname === '/containers/create') return json(201, { Id: 'c2' });
    return json(500, { message: `unexpected ${req.method} ${req.url}` });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  docker = new DockerClient(parseDockerHost(`tcp://127.0.0.1:${(server.address() as AddressInfo).port}`));
});

afterAll(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('Docker Engine API client', () => {
  it('pings', async () => {
    await expect(docker.ping()).resolves.toBeUndefined();
  });

  it('demultiplexes exec output and returns the exit code', async () => {
    const out: string[] = [];
    const err: string[] = [];
    const code = await docker.exec('c1', { cmd: ['sh', '-c', 'echo hello'], env: { A: '1', B: 'two words' }, workingDir: '/__w/1/s' }, (stream, chunk) =>
      (stream === 'out' ? out : err).push(chunk.toString()),
    );
    expect(code).toBe(3);
    expect(out.join('')).toBe('hello\nworld\n');
    expect(err.join('')).toBe('oops\n');
    const create = JSON.parse(seen.find((r) => r.url === '/containers/c1/exec')!.body.toString());
    expect(create).toMatchObject({ Cmd: ['sh', '-c', 'echo hello'], Env: ['A=1', 'B=two words'], WorkingDir: '/__w/1/s', AttachStdout: true, AttachStderr: true, Tty: false });
  });

  it('uploads files as a tar stream with modes', async () => {
    const script = path.join(tmp, 'run.sh');
    const text = path.join(tmp, 'notes.txt');
    fs.writeFileSync(script, '#!/bin/sh\necho hi\n');
    fs.writeFileSync(text, 'a\r\nb\r\n');
    await docker.putArchive('c1', '/__w/1/s', packFiles([{ abs: script, rel: 'ci/run.sh' }, { abs: text, rel: 'notes.txt' }], true));
    const request = seen.find((r) => r.method === 'PUT')!;
    expect(request.url).toBe('/containers/c1/archive?path=%2F__w%2F1%2Fs');

    const out = path.join(tmp, 'unpacked');
    const { Readable } = await import('node:stream');
    expect(await extractTar(Readable.from([request.body]), out, false)).toEqual({ files: 2, skippedLinks: 0 });
    expect(fs.readFileSync(path.join(out, 'notes.txt'), 'utf8')).toBe('a\nb\n'); // line endings as a commit would hold them
    expect(fs.readFileSync(path.join(out, 'ci', 'run.sh'), 'utf8')).toContain('echo hi');
  });

  it('downloads a path as a tar stream, and reports a missing one as undefined', async () => {
    const stream = await docker.getArchive('c1', '/__w/1/s/dist');
    expect((await firstFile(stream!))?.toString()).toBe('<h1>hi</h1>');
    expect(await docker.getArchive('c1', '/missing')).toBeUndefined();
  });

  it('treats a missing image as absent and a failed pull as an error', async () => {
    expect(await docker.imageInfo('ghost:1')).toBeUndefined();
    const statuses: string[] = [];
    await expect(docker.pull('ghost:1', (line) => statuses.push(line))).rejects.toThrow(/pull access denied/);
    expect(statuses).toEqual(['1: Pulling from library/ghost']); // layer progress is not repeated line by line
    expect(seen.find((r) => r.url.startsWith('/images/create'))!.url).toBe('/images/create?fromImage=ghost&tag=1');
  });

  it('creates a job container with the settings the engine relies on', async () => {
    const id = await docker.createContainer({
      name: 'azpl-test',
      image: 'azp-local/agent-ubuntu:24.04',
      entrypoint: ['tail'],
      cmd: ['-f', '/dev/null'],
      labels: { 'azp-local': 'true' },
      binds: ['azp-local-tools:/__t'],
      nanoCpus: 2_000_000_000,
      memoryBytes: 7 * 1024 ** 3,
    });
    expect(id).toBe('c2');
    const request = seen.find((r) => r.url.startsWith('/containers/create'))!;
    expect(request.url).toBe('/containers/create?name=azpl-test');
    expect(JSON.parse(request.body.toString())).toMatchObject({
      Image: 'azp-local/agent-ubuntu:24.04',
      Entrypoint: ['tail'],
      Cmd: ['-f', '/dev/null'],
      HostConfig: { Binds: ['azp-local-tools:/__t'], NanoCpus: 2_000_000_000, Memory: 7516192768 },
    });
    // No credentials by default (D7): nothing but the tools volume is mounted.
    expect(JSON.stringify(JSON.parse(request.body.toString()).HostConfig)).not.toContain('docker.sock');
  });

  it('says how to fix it when no daemon answers', async () => {
    await expect(DockerClient.connect('tcp://127.0.0.1:1')).rejects.toThrow(DockerError);
  });
});
