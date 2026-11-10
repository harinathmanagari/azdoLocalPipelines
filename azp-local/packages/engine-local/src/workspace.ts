// What a job's checkout contains (D5): the files git tracks plus untracked files
// that are not ignored. That is what a commit of the current state would hold, so
// ignored files such as .env or node_modules never reach a job.
import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import ignore, { type Ignore } from 'ignore';
import * as tar from 'tar-stream';

export interface FileEntry {
  /** Absolute path on the host. */
  abs: string;
  /** Path inside the destination, with forward slashes. */
  rel: string;
  /** Unix mode, when it is known (from the git index). */
  mode?: number;
}

export interface WorkspaceListing {
  files: FileEntry[];
  source: 'git' | 'gitignore';
  /** True when text files should be converted to LF, as a commit would hold them. */
  normaliseEol: boolean;
}

function git(cwd: string, args: string[]): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, maxBuffer: 256 * 1024 * 1024, windowsHide: true }, (err, stdout) => resolve(err ? undefined : stdout));
  });
}

function walkAll(root: string, dir: string, out: FileEntry[], prefix: string): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkAll(root, abs, out, prefix);
    else if (entry.isFile()) out.push({ abs, rel: prefix + path.relative(root, abs).split(path.sep).join('/') });
  }
}

/** Fallback for a folder that is not a git repository: honour .gitignore files, always skip .git. */
function walkWithGitignore(root: string): FileEntry[] {
  const out: FileEntry[] = [];
  const visit = (dir: string, rules: { base: string; ig: Ignore }[]) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const local = [...rules];
    try {
      local.push({ base: dir, ig: ignore().add(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8')) });
    } catch {
      /* no .gitignore here */
    }
    for (const entry of entries) {
      if (entry.name === '.git') continue;
      const abs = path.join(dir, entry.name);
      const isDir = entry.isDirectory();
      const ignored = local.some(({ base, ig }) => {
        const rel = path.relative(base, abs).split(path.sep).join('/');
        return ig.ignores(isDir ? `${rel}/` : rel);
      });
      if (ignored) continue;
      if (isDir) visit(abs, local);
      else if (entry.isFile()) out.push({ abs, rel: path.relative(root, abs).split(path.sep).join('/') });
    }
  };
  visit(root, []);
  return out;
}

export async function listWorkspaceFiles(root: string, includeGitDir = true): Promise<WorkspaceListing> {
  const isRepo = fs.existsSync(path.join(root, '.git'));
  const listed = isRepo ? await git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']) : undefined;
  if (listed === undefined) return { files: walkWithGitignore(root), source: 'gitignore', normaliseEol: false };

  const modes = new Map<string, number>();
  const staged = await git(root, ['ls-files', '-z', '--stage']);
  for (const record of (staged ?? '').split('\0')) {
    const m = /^(\d+) [0-9a-f]+ \d\t(.+)$/s.exec(record);
    if (m) modes.set(m[2], m[1] === '100755' ? 0o755 : 0o644);
  }
  const files: FileEntry[] = [];
  for (const rel of new Set(listed.split('\0').filter(Boolean))) {
    const abs = path.join(root, rel);
    try {
      if (fs.statSync(abs).isFile()) files.push({ abs, rel, mode: modes.get(rel) });
    } catch {
      /* deleted in the working tree */
    }
  }
  // History travels with the checkout so that steps can run git.
  if (includeGitDir) walkAll(root, path.join(root, '.git'), files, '');
  const autocrlf = ((await git(root, ['config', '--get', 'core.autocrlf'])) ?? '').trim().toLowerCase();
  return { files, source: 'git', normaliseEol: process.platform === 'win32' && autocrlf === 'true' };
}

export function listDirectory(dir: string): FileEntry[] {
  const out: FileEntry[] = [];
  walkAll(dir, dir, out, '');
  return out;
}

const looksBinary = (buf: Buffer) => buf.subarray(0, 8000).includes(0);

export function prepareContent(entry: FileEntry, normaliseEol: boolean): { data: Buffer; mode: number } {
  let data = fs.readFileSync(entry.abs);
  const insideGitDir = entry.rel.startsWith('.git/');
  if (normaliseEol && !insideGitDir && !looksBinary(data) && data.includes('\r\n')) {
    data = Buffer.from(data.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
  }
  // Without an index entry the executable bit is unknown (always so on Windows); a shebang is the best hint.
  const mode = entry.mode ?? (data.length > 2 && data[0] === 0x23 && data[1] === 0x21 ? 0o755 : 0o644);
  return { data, mode };
}

/** A tar stream of the given files, read one at a time as the consumer drains it. */
export function packFiles(files: FileEntry[], normaliseEol = false): Readable {
  const pack = tar.pack();
  (async () => {
    for (const entry of files) {
      let prepared: { data: Buffer; mode: number };
      try {
        prepared = prepareContent(entry, normaliseEol);
      } catch {
        continue; // unreadable or vanished: leave it out, as a failed read would in a checkout of the working tree
      }
      await new Promise<void>((resolve, reject) => {
        pack.entry({ name: entry.rel, size: prepared.data.length, mode: prepared.mode, mtime: new Date() }, prepared.data, (err) =>
          err ? reject(err) : resolve(),
        );
      });
    }
    pack.finalize();
  })().catch((err) => pack.destroy(err as Error));
  return Readable.from(pack);
}

export function packBuffer(name: string, data: Buffer | string, mode = 0o644): Readable {
  const pack = tar.pack();
  pack.entry({ name, mode, mtime: new Date() }, typeof data === 'string' ? Buffer.from(data, 'utf8') : data);
  pack.finalize();
  return Readable.from(pack);
}

/**
 * Unpacks a tar stream from the Docker API into a host folder. The API wraps the
 * requested path in its own name; `strip` removes that first component.
 * Symbolic links are not recreated: they are reported back to the caller.
 */
export async function extractTar(stream: Readable, destDir: string, strip: boolean): Promise<{ files: number; skippedLinks: number }> {
  const extract = tar.extract();
  let files = 0;
  let skippedLinks = 0;
  const done = new Promise<void>((resolve, reject) => {
    extract.on('entry', (header, body, next) => {
      const parts = header.name.split('/').filter(Boolean);
      const rel = strip ? parts.slice(1) : parts;
      const target = path.join(destDir, ...rel);
      const inside = path.resolve(target).startsWith(path.resolve(destDir));
      if (header.type === 'file' && rel.length > 0 && inside) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const out = fs.createWriteStream(target);
        body.pipe(out);
        out.on('finish', () => {
          files++;
          next();
        });
        out.on('error', reject);
      } else {
        if (header.type === 'symlink' || header.type === 'link') skippedLinks++;
        else if (header.type === 'directory' && inside) fs.mkdirSync(target, { recursive: true });
        body.resume();
        body.on('end', next);
      }
    });
    extract.on('finish', resolve);
    extract.on('error', reject);
  });
  stream.pipe(extract);
  await done;
  return { files, skippedLinks };
}

/** Reads the first regular file of a tar stream. */
export async function firstFile(stream: Readable): Promise<Buffer | undefined> {
  const extract = tar.extract();
  let found: Buffer | undefined;
  const done = new Promise<void>((resolve, reject) => {
    extract.on('entry', (header, body, next) => {
      if (header.type === 'file' && found === undefined) {
        const chunks: Buffer[] = [];
        body.on('data', (c) => chunks.push(c as Buffer));
        body.on('end', () => {
          found = Buffer.concat(chunks);
          next();
        });
      } else {
        body.resume();
        body.on('end', next);
      }
    });
    extract.on('finish', resolve);
    extract.on('error', reject);
  });
  stream.pipe(extract);
  await done;
  return found;
}
