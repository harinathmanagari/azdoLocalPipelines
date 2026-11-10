// UseNode@1 / NodeTool@0: a tool installer. It downloads the requested Node.js into
// the tools directory (shared across runs, so each version is fetched once) and puts
// it first on PATH for the steps that follow.
import * as fs from 'node:fs';
import * as https from 'node:https';
import * as path from 'node:path';
import type { StepContext, StepOutcome } from '../context';

interface NodeRelease {
  version: string;
  lts: string | false;
}

const INDEX_URL = 'https://nodejs.org/dist/index.json';
const DAY = 24 * 60 * 60 * 1000;

function fetchText(url: string, redirects = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 20_000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        return resolve(fetchText(new URL(res.headers.location, url).toString(), redirects - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('timeout', () => req.destroy(new Error(`Timed out fetching ${url}`)));
    req.on('error', reject);
  });
}

function downloadFile(url: string, dest: string, redirects = 3): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 60_000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        return resolve(downloadFile(new URL(res.headers.location, url).toString(), dest, redirects - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', () => out.close(() => resolve()));
      out.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error(`Timed out downloading ${url}`)));
    req.on('error', reject);
  });
}

/** The list of Node.js releases, cached for a day and used stale when offline. */
async function releases(homeDir: string): Promise<NodeRelease[] | undefined> {
  const file = path.join(homeDir, 'node-index.json');
  const read = (): NodeRelease[] | undefined => {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8')) as NodeRelease[];
    } catch {
      return undefined;
    }
  };
  try {
    if (Date.now() - fs.statSync(file).mtimeMs < DAY) return read();
  } catch {
    /* not cached yet */
  }
  try {
    const all = (JSON.parse(await fetchText(INDEX_URL)) as NodeRelease[]).map((r) => ({ version: r.version.replace(/^v/, ''), lts: r.lts }));
    fs.mkdirSync(homeDir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(all));
    return all;
  } catch {
    return read();
  }
}

const parse = (version: string) => version.replace(/^v/, '').split('.').map((n) => Number(n));
const compare = (a: string, b: string) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

/** Picks the highest version that satisfies a spec such as `22.x`, `20`, `>=20.11`, `^22.3.0` or `lts/*`. */
export function resolveNodeVersion(spec: string, available: NodeRelease[]): string | undefined {
  const wanted = spec.trim().toLowerCase();
  const sorted = [...available].sort((a, b) => compare(b.version, a.version));
  if (['', '*', 'x', 'latest', 'current', 'node'].includes(wanted)) return sorted[0]?.version;
  if (wanted === 'lts' || wanted === 'lts/*') return sorted.find((r) => r.lts)?.version;
  let m: RegExpExecArray | null;
  if ((m = /^lts\/(\w+)$/.exec(wanted))) return sorted.find((r) => typeof r.lts === 'string' && r.lts.toLowerCase() === m![1])?.version;
  if ((m = /^v?(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?$/.exec(wanted))) {
    const want = [m[1], m[2], m[3]].map((part) => (part === undefined || part === 'x' || part === '*' ? undefined : Number(part)));
    return sorted.find((r) => parse(r.version).every((n, i) => want[i] === undefined || want[i] === n))?.version;
  }
  if ((m = /^(>=|\^|~)\s*v?(\d+(?:\.\d+){0,2})$/.exec(wanted))) {
    const floor = m[2];
    const [major, minor] = parse(floor);
    return sorted.find((r) => {
      if (compare(r.version, floor) < 0) return false;
      const [rMajor, rMinor] = parse(r.version);
      if (m![1] === '^') return rMajor === major;
      if (m![1] === '~') return rMajor === major && (minor === undefined || rMinor === minor);
      return true;
    })?.version;
  }
  return undefined;
}

export async function useNode(ctx: StepContext): Promise<StepOutcome> {
  const { backend } = ctx;
  let spec = ctx.input('version', 'versionSpec') ?? '';
  const versionFile = ctx.input('versionFilePath');
  if ((ctx.input('versionSource') ?? '').toLowerCase() === 'fromfile' && versionFile) {
    const content = await backend.readFile(ctx.resolve(versionFile));
    if (!content) return { result: 'failed', message: `Version file not found: ${versionFile}` };
    spec = content.toString('utf8').trim();
  }
  if (!spec) return { result: 'failed', message: "Node tool installer: a 'version' is required." };

  const arch = backend.arch === 'ARM64' ? 'arm64' : 'x64';
  const root = backend.p.join(backend.paths.tools, 'node');
  const index = await releases(ctx.settings.homeDir);
  let candidates = index;
  if (!candidates) {
    ctx.warn('The Node.js release list could not be fetched; choosing from versions already in the tool cache.');
    candidates = (await backend.listFiles(root).catch(() => [] as string[]))
      .map((file) => /^(\d+\.\d+\.\d+)\/([^/]+)\.complete$/.exec(file))
      .filter((m): m is RegExpExecArray => !!m && m[2] === arch)
      .map((m) => ({ version: m[1], lts: false as const }));
  }
  const version = resolveNodeVersion(spec, candidates);
  if (!version) {
    return {
      result: 'failed',
      message: index
        ? `No Node.js version matches '${spec}'.`
        : `No cached Node.js version matches '${spec}', and nodejs.org could not be reached.`,
    };
  }

  const dir = backend.p.join(root, version, arch);
  const marker = `${dir}.complete`;
  if (await backend.exists(marker)) {
    ctx.log(`Found Node.js ${version} in the tool cache: ${dir}`);
  } else if (backend.os === 'Windows_NT') {
    const url = `https://nodejs.org/dist/v${version}/node-v${version}-win-${arch}.zip`;
    const zip = path.join(backend.paths.temp, `node-v${version}.zip`);
    ctx.log(`Downloading ${url}`);
    try {
      await downloadFile(url, zip);
    } catch (err) {
      return { result: 'failed', message: `Could not download Node.js ${version}: ${(err as Error).message}` };
    }
    await backend.mkdirp(dir);
    // bsdtar ships with Windows 10 and later and reads zip archives.
    const tarExe = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
    const res = await ctx.exec([tarExe, '-xf', zip, '-C', dir, '--strip-components=1'], { cwd: backend.paths.temp });
    if (res.code !== 0) return { result: 'failed', message: `Could not extract ${zip}` };
    await backend.writeFile(marker, '');
  } else {
    const platform = backend.os === 'Darwin' ? 'darwin' : 'linux';
    const url = `https://nodejs.org/dist/v${version}/node-v${version}-${platform}-${arch}.tar.gz`;
    ctx.log(`Downloading ${url}`);
    const script = [
      'set -e',
      `mkdir -p '${dir}'`,
      `if command -v curl >/dev/null 2>&1; then curl -fsSL '${url}'; else wget -qO- '${url}'; fi | tar -xz -C '${dir}' --strip-components=1`,
      `touch '${marker}'`,
    ].join('\n');
    const res = await ctx.exec(['sh', '-c', script], { cwd: backend.paths.temp });
    if (res.code !== 0) {
      return { result: 'failed', message: `Could not install Node.js ${version}. The image needs curl or wget, tar, and network access.` };
    }
  }

  ctx.prependPath(backend.os === 'Windows_NT' ? dir : backend.p.join(dir, 'bin'));
  ctx.log(`Using Node.js ${version} (requested '${spec}')`);
  return { result: 'succeeded' };
}
