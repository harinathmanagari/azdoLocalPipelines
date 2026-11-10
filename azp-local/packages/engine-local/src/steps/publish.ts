// PublishTestResults@2 and PublishCodeCoverageResults: instead of uploading to Azure
// DevOps, they write into the run store so results show up in the run summary.
import * as fs from 'node:fs';
import * as path from 'node:path';
import picomatch from 'picomatch';
import type { TestSummary } from '@azp-local/core';
import type { StepContext, StepOutcome } from '../context';
import { mergeTests, parseCoverage, parseJUnit } from '../results';

const safe = (name: string) => name.replace(/[^A-Za-z0-9._-]/g, '_');

/** Finds files by the multi-line glob patterns the publishing tasks accept. A leading `!` excludes. */
async function findFiles(ctx: StepContext, folder: string, patterns: string[]): Promise<string[]> {
  const include = patterns.filter((p) => !p.startsWith('!')).map((p) => p.replace(/\\/g, '/'));
  const exclude = patterns.filter((p) => p.startsWith('!')).map((p) => p.slice(1).replace(/\\/g, '/'));
  const found: string[] = [];
  const globs: string[] = [];
  for (const pattern of include) {
    if (/[*?[\]{}]/.test(pattern)) globs.push(pattern);
    else if (await ctx.backend.exists(ctx.resolve(pattern, folder))) found.push(ctx.resolve(pattern, folder));
  }
  if (globs.length > 0) {
    const relative = globs.map((g) => (ctx.backend.p.isAbsolute(g) ? ctx.backend.p.relative(folder, g).replace(/\\/g, '/') : g));
    const matches = picomatch(relative, { dot: true, ignore: exclude });
    for (const file of await ctx.backend.listFiles(folder)) if (matches(file)) found.push(ctx.backend.p.join(folder, file));
  }
  return [...new Set(found)];
}

export async function publishTestResults(ctx: StepContext): Promise<StepOutcome> {
  const format = (ctx.input('testResultsFormat', 'testRunner') ?? 'JUnit').toLowerCase();
  if (format !== 'junit') {
    return { result: 'unsupported', message: `Test result format '${format}' is not read locally yet; only JUnit is.` };
  }
  const folder = ctx.resolve(ctx.input('searchFolder') ?? ctx.backend.paths.sources);
  const patterns = (ctx.input('testResultsFiles') ?? '**/TEST-*.xml').split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
  const title = ctx.input('testRunTitle') ?? ctx.job.displayName;

  const files = (await ctx.backend.isDirectory(folder)) ? await findFiles(ctx, folder, patterns) : [];
  if (files.length === 0) {
    ctx.warn(`No test result files matching '${patterns.join(', ')}' were found in ${folder}.`);
    return { result: 'succeeded' };
  }

  const parts: TestSummary[] = [];
  const keepDir = path.join(ctx.io.runDir, 'tests', safe(ctx.job.id));
  fs.mkdirSync(keepDir, { recursive: true });
  for (const [i, file] of files.entries()) {
    const content = await ctx.backend.readFile(file);
    if (!content) continue;
    fs.writeFileSync(path.join(keepDir, `${i}-${safe(ctx.backend.p.basename(file))}`), content);
    try {
      parts.push(parseJUnit(content.toString('utf8'), title));
    } catch (err) {
      ctx.warn(`Could not read ${file} as JUnit XML: ${(err as Error).message}`);
    }
  }
  const summary = mergeTests(title, parts);
  ctx.log(`Result files: ${files.length}. Tests: ${summary.total} total, ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped.`);
  for (const failed of summary.cases.filter((c) => c.outcome === 'failed')) {
    ctx.log(`  failed: ${failed.suite ? `${failed.suite} > ` : ''}${failed.name}${failed.message ? `: ${failed.message.split('\n')[0]}` : ''}`);
  }
  ctx.emit({ type: 'tests', jobId: ctx.job.id, stepId: ctx.step.id, summary });
  if (ctx.boolInput('failTaskOnFailedTests', false) && summary.failed > 0) {
    return { result: 'failed', message: `There are ${summary.failed} failed test(s).` };
  }
  return { result: 'succeeded' };
}

export async function publishCoverage(ctx: StepContext): Promise<StepOutcome> {
  const location = ctx.input('summaryFileLocation');
  if (!location) return { result: 'failed', message: "Coverage task: 'summaryFileLocation' is required." };
  const patterns = location.split(/\r?\n|;/).map((p) => p.trim()).filter(Boolean);
  const files = await findFiles(ctx, ctx.backend.paths.sources, patterns);
  if (files.length === 0) {
    ctx.warn(`No coverage file was found at ${patterns.join(', ')}.`);
    return { result: 'succeeded' };
  }
  const keepDir = path.join(ctx.io.runDir, 'coverage', safe(ctx.job.id));
  fs.mkdirSync(keepDir, { recursive: true });
  for (const file of files) {
    const content = await ctx.backend.readFile(file);
    if (!content) continue;
    fs.writeFileSync(path.join(keepDir, safe(ctx.backend.p.basename(file))), content);
    const summary = parseCoverage(content.toString('utf8'));
    if (!summary) {
      ctx.warn(`${file} is neither Cobertura XML nor lcov; it was stored but not summarised.`);
      continue;
    }
    const pct = summary.linesTotal ? ((summary.linesCovered / summary.linesTotal) * 100).toFixed(1) : '0.0';
    ctx.log(`${ctx.backend.p.basename(file)} (${summary.format}): ${summary.linesCovered}/${summary.linesTotal} lines covered (${pct}%) in ${summary.files.length} file(s).`);
    ctx.emit({ type: 'coverage', jobId: ctx.job.id, stepId: ctx.step.id, summary });
  }
  ctx.log('The coverage summary is drawn locally from this file; nothing was uploaded to Azure DevOps.');
  return { result: 'succeeded' };
}
