// script / bash / pwsh / powershell, and the CmdLine, Bash and PowerShell tasks behind them.
import * as crypto from 'node:crypto';
import { which } from '../backend';
import type { StepContext, StepOutcome } from '../context';

export type Shell = 'default' | 'bash' | 'pwsh' | 'powershell';

export interface ScriptOptions {
  cwd?: string;
  failOnStderr?: boolean;
  env?: Record<string, string>;
  /** PowerShell only. */
  errorActionPreference?: string;
  ignoreLastExitCode?: boolean;
}

const START = '========================== Starting Command Output ===========================';

function toOutcome(code: number, sawStderr: boolean, failOnStderr: boolean | undefined, what: string): StepOutcome {
  if (code !== 0) return { result: 'failed', message: `${what} exited with code '${code}'.` };
  if (failOnStderr && sawStderr) return { result: 'failed', message: `${what} wrote one or more lines to the standard error stream.` };
  return { result: 'succeeded' };
}

export async function runScript(ctx: StepContext, shell: Shell, script: string, opts: ScriptOptions = {}): Promise<StepOutcome> {
  const { backend } = ctx;
  const cwd = opts.cwd ? ctx.resolve(opts.cwd) : backend.paths.sources;
  if (!(await backend.isDirectory(cwd))) {
    return { result: 'failed', message: `Working directory not found: ${cwd}` };
  }
  const base = backend.p.join(backend.paths.temp, crypto.randomUUID());
  const windows = backend.os === 'Windows_NT';

  // `script:` is cmd on Windows and bash everywhere else.
  if (shell === 'default' && windows) {
    const file = `${base}.cmd`;
    await backend.writeFile(file, `@echo off\r\n${script.replace(/\r?\n/g, '\r\n')}\r\n`);
    ctx.log(START);
    const comspec = process.env.ComSpec ?? 'cmd.exe';
    const res = await ctx.exec([comspec, '/D', '/E:ON', '/V:OFF', '/S', '/C', `"CALL "${file}""`], { cwd, env: opts.env, verbatim: true });
    return toOutcome(res.code, res.sawStderr, opts.failOnStderr, 'Cmd.exe');
  }

  if (shell === 'default' || shell === 'bash') {
    const file = `${base}.sh`;
    await backend.writeFile(file, `${script.replace(/\r\n/g, '\n')}\n`, 0o755);
    if (!backend.bash && windows) {
      return { result: 'failed', message: 'Bash was not found on this machine. Install Git for Windows to run bash steps in host mode.' };
    }
    ctx.log(START);
    const scriptPath = windows ? file.replace(/\\/g, '/') : file;
    const cmd = backend.bash ? [backend.bash, '--noprofile', '--norc', scriptPath] : ['sh', scriptPath];
    const res = await ctx.exec(cmd, { cwd, env: opts.env });
    return toOutcome(res.code, res.sawStderr, opts.failOnStderr, 'Bash');
  }

  // PowerShell: `powershell:` means Windows PowerShell on Windows and PowerShell Core elsewhere.
  const file = `${base}.ps1`;
  const preference = opts.errorActionPreference || 'stop';
  const tail = opts.ignoreLastExitCode
    ? ''
    : "\nif (!(Test-Path -LiteralPath variable:\\LASTEXITCODE)) { exit 0 } else { exit $LASTEXITCODE }\n";
  await backend.writeFile(file, `$ErrorActionPreference = '${preference}'\n$ProgressPreference = 'SilentlyContinue'\n${script}\n${tail}`);
  let program = shell === 'powershell' && windows ? 'powershell.exe' : 'pwsh';
  if (backend.kind === 'host' && !which(program)) {
    if (shell === 'pwsh') return { result: 'failed', message: 'pwsh (PowerShell 7) was not found on this machine.' };
    program = 'pwsh';
  }
  ctx.log(START);
  const res = await ctx.exec([program, '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Unrestricted', '-Command', `. '${file}'`], {
    cwd,
    env: opts.env,
  });
  if (res.code === 127 || res.code === 126) {
    return { result: 'failed', message: `${program} is not available in ${backend.label}. Use an image that includes PowerShell.` };
  }
  return toOutcome(res.code, res.sawStderr, opts.failOnStderr, 'PowerShell');
}

/** CmdLine@2, Bash@3 and PowerShell@2 written out as tasks. */
export async function runScriptTask(ctx: StepContext, task: 'cmdline' | 'bash' | 'powershell'): Promise<StepOutcome> {
  const cwd = ctx.input('workingDirectory', 'cwd');
  const failOnStderr = ctx.boolInput('failOnStderr', false);
  if (task === 'cmdline') return runScript(ctx, 'default', ctx.input('script') ?? '', { cwd, failOnStderr });

  // Both tasks default to targetType: filePath; an inline script given without it is still honoured.
  const fromFile = (ctx.input('targetType') ?? 'filePath').toLowerCase() === 'filepath' && !ctx.input('script');
  const args = ctx.input('arguments') ?? '';
  if (task === 'bash') {
    let script = ctx.input('script') ?? '';
    if (fromFile) {
      const file = ctx.input('filePath');
      if (!file) return { result: 'failed', message: "Bash task: 'filePath' or an inline 'script' is required." };
      const resolved = ctx.resolve(file);
      script = `bash '${ctx.backend.os === 'Windows_NT' ? resolved.replace(/\\/g, '/') : resolved}' ${args}`;
    }
    return runScript(ctx, 'bash', script, { cwd, failOnStderr });
  }

  let script = ctx.input('script') ?? '';
  if (fromFile) {
    const file = ctx.input('filePath');
    if (!file) return { result: 'failed', message: "PowerShell task: 'filePath' or an inline 'script' is required." };
    script = `. '${ctx.resolve(file)}' ${args}`;
  }
  return runScript(ctx, ctx.boolInput('pwsh', false) ? 'pwsh' : 'powershell', script, {
    cwd,
    failOnStderr,
    errorActionPreference: ctx.input('errorActionPreference'),
    ignoreLastExitCode: ctx.boolInput('ignoreLASTEXITCODE', false),
  });
}
