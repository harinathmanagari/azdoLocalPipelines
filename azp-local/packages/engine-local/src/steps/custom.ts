// Tasks the engine does not implement itself.
//   Tier 2: run the task's own Node handler from a folder that holds its task.json,
//           passing inputs the way the agent does (INPUT_<NAME> environment variables).
//   Replacement: run a script from the repository in place of a task that cannot run locally.
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { StepContext, StepOutcome } from '../context';
import { listDirectory } from '../workspace';
import { runScript } from './script';

interface TaskManifest {
  name?: string;
  inputs?: { name: string; aliases?: string[]; defaultValue?: unknown }[];
  execution?: Record<string, { target?: string; workingDirectory?: string }>;
}

/** `my input.name` -> `INPUT_MY_INPUT_NAME`, as the agent names it. */
export const inputEnvName = (name: string) => `INPUT_${name.replace(/[ .]/g, '_').toUpperCase()}`;

function inputEnv(ctx: StepContext, manifest?: TaskManifest): Record<string, string> {
  const env: Record<string, string> = {};
  for (const input of manifest?.inputs ?? []) {
    const given = ctx.input(input.name, ...(input.aliases ?? []));
    const value = given ?? (input.defaultValue === undefined ? undefined : String(input.defaultValue));
    if (value !== undefined) env[inputEnvName(input.name)] = ctx.expand(value);
  }
  // Inputs the manifest does not declare are passed too, so a replacement script sees everything the YAML gave.
  for (const [name, value] of Object.entries(ctx.inputs)) env[inputEnvName(name)] ??= value;
  return env;
}

export async function runTaskFromFolder(ctx: StepContext, folder: string): Promise<StepOutcome> {
  const hostDir = path.resolve(ctx.io.workspaceRoot, folder);
  let manifest: TaskManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(hostDir, 'task.json'), 'utf8')) as TaskManifest;
  } catch (err) {
    return { result: 'failed', message: `No readable task.json in ${hostDir}: ${(err as Error).message}` };
  }
  const handlers = Object.entries(manifest.execution ?? {});
  const node = handlers
    .filter(([name]) => /^node/i.test(name))
    .sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true }))[0];
  if (!node?.[1].target) {
    const names = handlers.map(([name]) => name).join(', ') || 'none';
    return {
      result: 'unsupported',
      message: `Task '${manifest.name ?? ctx.step.displayName}' has no Node handler (found: ${names}). PowerShell-handler tasks are not run locally.`,
    };
  }

  const dest = ctx.backend.p.join(ctx.backend.paths.temp, '_tasks', path.basename(hostDir));
  await ctx.backend.copyIn(listDirectory(hostDir), dest);
  const target = ctx.backend.p.join(dest, ...node[1].target.split(/[\\/]/));
  ctx.log(`Task ${manifest.name ?? ''} from ${hostDir} (handler ${node[0]}: ${node[1].target})`);
  ctx.log('==============================================================================');
  const res = await ctx.exec(['node', target], { cwd: ctx.backend.paths.sources, env: inputEnv(ctx, manifest) });
  if (res.code === 127 || res.code === 126) {
    return { result: 'failed', message: 'node was not found. Add a Node tool installer step before this task, or use an image that includes Node.js.' };
  }
  return res.code === 0 ? { result: 'succeeded' } : { result: 'failed', message: `The task exited with code ${res.code}.` };
}

export async function runReplacementScript(ctx: StepContext, script: string, taskName: string): Promise<StepOutcome> {
  const hostFile = path.resolve(ctx.io.workspaceRoot, script);
  let content: string;
  try {
    content = fs.readFileSync(hostFile, 'utf8');
  } catch {
    return { result: 'failed', message: `Replacement script not found: ${hostFile}` };
  }
  ctx.log(`${taskName} cannot run locally. Running ${script} in its place, as .azp-local.yml says.`);
  const ext = path.extname(hostFile).toLowerCase();
  const shell = ext === '.ps1' ? 'pwsh' : ext === '.cmd' || ext === '.bat' ? 'default' : 'bash';
  const outcome = await runScript(ctx, shell, content, { env: inputEnv(ctx) });
  return { ...outcome, gap: `${taskName} was replaced by ${script}` };
}
