// Cache@2, backed by a folder on disk that is scoped to the workspace.
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import picomatch from 'picomatch';
import type { StepContext, StepOutcome } from '../context';

interface IndexEntry {
  key: string;
  entry: string;
  savedAt: number;
}

const sha = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');

/**
 * Resolves a cache key such as `npm | "$(Agent.OS)" | package-lock.json`.
 * A quoted segment is literal. A segment that names a file (or matches files) is
 * replaced by a hash of the content. Anything else is literal.
 */
async function resolveKey(ctx: StepContext, key: string, cwd: string): Promise<string> {
  const parts: string[] = [];
  let listing: string[] | undefined;
  for (const raw of key.split('|').map((s) => s.trim()).filter(Boolean)) {
    const quoted = /^"(.*)"$/.exec(raw) ?? /^'(.*)'$/.exec(raw);
    if (quoted) {
      parts.push(quoted[1]);
      continue;
    }
    if (/[*?[\]]/.test(raw)) {
      listing ??= await ctx.backend.listFiles(cwd);
      const matches = picomatch(raw, { dot: true });
      const matched = listing.filter((file) => matches(file)).sort();
      if (matched.length > 0) {
        const hashes: string[] = [];
        for (const file of matched) hashes.push(sha((await ctx.backend.readFile(ctx.backend.p.join(cwd, file))) ?? ''));
        parts.push(sha(hashes.join('\n')));
        continue;
      }
    } else if (/[./\\]/.test(raw)) {
      const content = await ctx.backend.readFile(ctx.resolve(raw, cwd));
      if (content) {
        parts.push(sha(content));
        continue;
      }
    }
    parts.push(raw);
  }
  return parts.join('|');
}

export async function cache(ctx: StepContext): Promise<StepOutcome> {
  const keyInput = ctx.input('key');
  const pathInput = ctx.input('path');
  if (!keyInput || !pathInput) return { result: 'failed', message: "Cache task: 'key' and 'path' are required." };

  const cwd = ctx.backend.paths.sources;
  const target = ctx.resolve(pathInput.split(/\r?\n/)[0].trim());
  const hitVar = ctx.input('cacheHitVar') || 'CACHE_RESTORED';
  // Entries from a Linux container are useless to a Windows host job, whatever the key says.
  const store = path.join(ctx.settings.cacheDir, `${ctx.backend.kind}-${ctx.backend.os.toLowerCase()}`);
  const indexFile = path.join(store, 'index.json');
  const readIndex = (): IndexEntry[] => {
    try {
      return JSON.parse(fs.readFileSync(indexFile, 'utf8')) as IndexEntry[];
    } catch {
      return [];
    }
  };

  const key = await resolveKey(ctx, keyInput, cwd);
  const scopedKey = `${key}\n${target}`;
  ctx.log(`Resolved cache key: ${key}`);
  const exact = readIndex().find((e) => e.key === scopedKey);

  let restored: 'true' | 'inexact' | 'false' = 'false';
  if (exact && (await ctx.backend.cacheRestore(path.join(store, exact.entry), target))) {
    restored = 'true';
    ctx.log(`Cache hit. Restored ${target}`);
  } else {
    for (const restoreKey of (ctx.input('restoreKeys') ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) {
      const prefix = await resolveKey(ctx, restoreKey, cwd);
      const candidate = readIndex()
        .filter((e) => e.key.split('\n')[0].startsWith(prefix) && e.key.endsWith(`\n${target}`))
        .sort((a, b) => b.savedAt - a.savedAt)[0];
      if (candidate && (await ctx.backend.cacheRestore(path.join(store, candidate.entry), target))) {
        restored = 'inexact';
        ctx.log(`No exact match. Restored ${target} from the closest entry (restore key: ${prefix})`);
        break;
      }
    }
    if (restored === 'false') ctx.log('Cache miss. The path will be saved after the job if it succeeds.');
  }
  ctx.setVariable(hitVar, restored);

  ctx.addPostStep(`Post-job: ${ctx.step.displayName}`, async (post) => {
    if (restored === 'true') {
      post.log('Cache hit on the primary key; nothing to save.');
      return { result: 'succeeded' };
    }
    if (post.jobStatus() !== 'Succeeded' && post.jobStatus() !== 'SucceededWithIssues') {
      post.log('The job did not succeed; the cache is not saved.');
      return { result: 'succeeded' };
    }
    const entry = sha(scopedKey).slice(0, 32);
    if (!(await post.backend.cacheSave(target, path.join(store, entry)))) {
      post.warn(`Cache path does not exist, nothing saved: ${target}`);
      return { result: 'succeeded' };
    }
    const index = readIndex().filter((e) => e.key !== scopedKey);
    index.push({ key: scopedKey, entry, savedAt: Date.now() });
    fs.mkdirSync(store, { recursive: true });
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
    post.log(`Saved ${target} to the local cache under key: ${key}`);
    return { result: 'succeeded' };
  });
  return { result: 'succeeded' };
}
