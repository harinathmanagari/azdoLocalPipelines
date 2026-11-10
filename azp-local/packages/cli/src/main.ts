// azp-local: everything the VS Code extension does, in a terminal or a script.
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as readline from 'node:readline';
import {
  ISOLATION_DECLINED,
  RunStore,
  RunView,
  analysePipelines,
  buildGraph,
  createPlan,
  describeSelection,
  describeSource,
  discoverPipelines,
  formatBuildNumber,
  formatDuration,
  loadConfig,
  loadPipeline,
  renderFindings,
  renderGraphText,
  resultLabel,
  selectByName,
  startRun,
  toYamlText,
  type Diagnostic,
  type IsolationRisk,
  type JobResult,
  type LoadedPipeline,
  type LocalConfig,
  type Pipeline,
  type RunEvent,
  type Selection,
} from '@azp-local/core';
import { LocalEngine, checkDocker } from '@azp-local/engine-local';

const HELP = `azp-local - draw and run Azure Pipelines YAML on this machine

Usage
  azp-local graph  [file]            Print stages, jobs and steps as the portal lays them out
  azp-local expand [file]            Print the YAML after template expansion (the local finalYaml)
  azp-local run    [file] [options]  Run the pipeline, a stage, a job or part of a job
  azp-local doctor                   Check Docker, images, disk and what needs a decision in .azp-local.yml
  azp-local runs                     List past local runs

Selection (run)
  --stage <name>          Run one stage
  --from-stage <name>     Run a stage and every stage after it
  --job <name>            Run one job; add its matrix leg as job.leg to run a single leg
  --step <job>:<step>     Run a job up to and including one step
  --rerun-failed [run]    Run again what did not pass in a run (default: the last one)

Inputs
  --param name=value      Value for a pipeline parameter (repeatable)
  --var name=value        Value for a variable, e.g. Build.Reason=PullRequest (repeatable)
  --secrets <file>        NAME=value lines for variable-group secrets; keep it outside the repository.
                          Secrets are also read from AZP_SECRET_<NAME> environment variables.
  -y, --yes               Do not ask: proceed when a condition cannot be decided locally
  --allow-unisolated      Run even though .azp-local.yml weakens isolation (host mode, dockerSocket,
                          workspace: mount, paths outside the repository) and that was not approved
                          before. Without it, such a run asks in a terminal and is refused elsewhere.

Engine
  --max-parallel <n>      Jobs to run at once (default 2)
  --keep-on-failure       Keep the container of a failed job for debugging
  --match-hosted-hardware Limit containers to 2 CPUs and 7 GB, as hosted agents have
  --docker-host <url>     npipe://, unix:// or tcp:// address of the Docker daemon
  --allow-gaps            Exit 0 even when steps could not run locally (default: exit 3)

Common
  -C, --cwd <dir>         Repository root (default: current directory)
  --store <dir>           Where runs, artifacts and caches are kept
  --json                  graph: print the model as JSON
  --quiet                 run: print step results only, not their output
`;

interface Args {
  command: string;
  positional: string[];
  flags: Map<string, string[]>;
}

const VALUE_FLAGS = new Set(['stage', 'from-stage', 'job', 'step', 'param', 'var', 'secrets', 'max-parallel', 'docker-host', 'cwd', 'store']);

function parseArgs(argv: string[]): Args {
  const flags = new Map<string, string[]>();
  const positional: string[] = [];
  const add = (name: string, value: string) => flags.set(name, [...(flags.get(name) ?? []), value]);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-y') add('yes', 'true');
    else if (arg === '-C') add('cwd', argv[++i] ?? '');
    else if (arg === '-h') add('help', 'true');
    else if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const name = eq > 0 ? arg.slice(2, eq) : arg.slice(2);
      if (eq > 0) add(name, arg.slice(eq + 1));
      else if (VALUE_FLAGS.has(name)) add(name, argv[++i] ?? '');
      else if (name === 'rerun-failed' && argv[i + 1] && !argv[i + 1].startsWith('-') && /^run-/.test(argv[i + 1])) add(name, argv[++i]);
      else add(name, 'true');
    } else positional.push(arg);
  }
  return { command: positional.shift() ?? 'help', positional, flags };
}

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number, text: string) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const dim = (text: string) => paint(2, text);
const bold = (text: string) => paint(1, text);

function resultMark(result: string): string {
  switch (result) {
    case 'succeeded':
      return paint(32, 'ok  ');
    case 'succeededWithIssues':
      return paint(33, 'ok! ');
    case 'succeededWithGaps':
      return paint(33, 'gaps');
    case 'failed':
      return paint(31, 'FAIL');
    case 'canceled':
      return paint(35, 'stop');
    case 'skipped':
      return dim('skip');
    case 'unsupported':
      return paint(33, 'n/a ');
    default:
      return dim('    ');
  }
}

function pairs(values: string[] | undefined, what: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const value of values ?? []) {
    const eq = value.indexOf('=');
    if (eq <= 0) throw new Error(`${what} must be name=value, got '${value}'`);
    out[value.slice(0, eq)] = value.slice(eq + 1);
  }
  return out;
}

function printDiagnostics(diagnostics: Diagnostic[], root: string): void {
  for (const d of diagnostics) {
    const where = d.source ? describeSource({ ...d.source, file: path.relative(root, d.source.file) || d.source.file }) : '';
    console.error(`${d.severity === 'error' ? paint(31, 'error') : paint(33, d.severity)}  ${d.message}${where ? dim(`  ${where}`) : ''}`);
  }
}

function imagesDir(): string {
  const candidates = [path.join(__dirname, 'images'), path.join(__dirname, '..', 'images'), path.join(__dirname, '..', '..', 'images')];
  return candidates.find((dir) => fs.existsSync(path.join(dir, 'ubuntu', 'Dockerfile'))) ?? candidates[0];
}

interface Workspace {
  root: string;
  home: string;
  storeDir: string;
  config: LocalConfig;
}

function openWorkspace(args: Args): Workspace {
  const root = path.resolve(args.flags.get('cwd')?.[0] ?? process.cwd());
  const home = process.env.AZP_LOCAL_HOME ?? path.join(os.homedir(), '.azp-local');
  const id = `${path.basename(root).replace(/[^A-Za-z0-9._-]/g, '_')}-${crypto.createHash('sha1').update(root.toLowerCase()).digest('hex').slice(0, 10)}`;
  const storeDir = path.resolve(args.flags.get('store')?.[0] ?? path.join(home, 'workspaces', id));
  return { root, home, storeDir, config: loadConfig(root) };
}

function pickPipeline(ws: Workspace, args: Args): string {
  if (args.positional[0]) return path.resolve(ws.root, args.positional[0]);
  const found = discoverPipelines(ws.root, ws.config);
  if (found.pipelines.length === 1) return found.pipelines[0];
  if (found.pipelines.length === 0) throw new Error(`No pipeline file was found in ${ws.root}. Pass the file as an argument.`);
  throw new Error(`Several pipeline files were found; pass one as an argument:\n${found.pipelines.map((p) => `  ${path.relative(ws.root, p)}`).join('\n')}`);
}

function load(ws: Workspace, args: Args): LoadedPipeline {
  const file = pickPipeline(ws, args);
  const loaded = loadPipeline(file, {
    workspaceRoot: ws.root,
    config: ws.config,
    parameters: pairs(args.flags.get('param'), '--param'),
    variables: pairs(args.flags.get('var'), '--var'),
  });
  printDiagnostics([...ws.config.diagnostics, ...loaded.pipeline.diagnostics], ws.root);
  return loaded;
}

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Do not echo what is typed for a secret.
      const out = rl as unknown as { _writeToOutput: (text: string) => void; output: NodeJS.WritableStream };
      const write = out._writeToOutput.bind(rl);
      let prompted = false;
      out._writeToOutput = (text: string) => {
        if (!prompted) {
          write(text);
          prompted = true;
        }
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

/**
 * Approvals for runs that .azp-local.yml lets out of their container, kept in the azp-local
 * home folder (never the repository) by workspace and fingerprint. A change to any of those
 * settings gives a new fingerprint, so it is asked again.
 */
async function approveIsolation(ws: Workspace, args: Args, risks: IsolationRisk[], fingerprint: string): Promise<boolean> {
  const file = path.join(ws.home, 'isolation-approvals.json');
  const key = ws.root.toLowerCase();
  let approvals: Record<string, string> = {};
  try {
    approvals = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
  } catch {
    /* none yet */
  }
  if (approvals[key] === fingerprint) return true;

  console.log(paint(33, bold('.azp-local.yml weakens the isolation of this run:')));
  for (const risk of risks) console.log(paint(33, `  - ${risk.message}`));
  console.log(dim('  The file is part of the repository, so anyone who can change the repository can change these settings.'));
  if (args.flags.has('allow-unisolated')) {
    console.log(paint(33, '  -> allowed (--allow-unisolated)\n'));
    return true;
  }
  if (!process.stdin.isTTY || args.flags.has('yes')) {
    console.log(paint(31, '  -> not run. Check the settings, then run in a terminal to approve them, or pass --allow-unisolated.\n'));
    return false;
  }
  const answer = (await ask('  Allow? [a]lways for this repository (until these settings change), [o]nce, [N]o: ')).trim().toLowerCase();
  if (answer === 'a' || answer === 'always') {
    approvals[key] = fingerprint;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(approvals, null, 2));
    return true;
  }
  return answer === 'o' || answer === 'once';
}

function readSecretsFile(file: string, root: string): Record<string, string> {
  const absolute = path.resolve(file);
  if (!path.relative(root, absolute).startsWith('..')) {
    console.error(paint(33, `warning  ${file} is inside the repository. Keep secrets outside it so they are never committed or copied into a job.`));
  }
  const text = fs.readFileSync(absolute, 'utf8');
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][\w.]*)\s*=\s*(.*)$/.exec(line);
    if (m) out[m[1].toLowerCase()] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

function resolveSelection(pipeline: Pipeline, args: Args, store: RunStore): Selection {
  const flag = (name: string) => args.flags.get(name)?.[0];
  if (args.flags.has('rerun-failed') && !flag('step') && !flag('job') && !flag('stage') && !flag('from-stage')) {
    const given = flag('rerun-failed');
    const runId = given && given !== 'true' ? given : store.listRuns().find((r) => path.resolve(r.pipelineFile) === path.resolve(pipeline.file))?.runId;
    if (!runId) throw new Error('There is no earlier run of this pipeline to re-run.');
    return { kind: 'failed', runId };
  }
  return selectByName(pipeline, { step: flag('step'), job: flag('job'), stage: flag('stage'), fromStage: flag('from-stage') });
}

async function commandRun(ws: Workspace, args: Args): Promise<number> {
  const loaded = load(ws, args);
  const { pipeline } = loaded;
  if (pipeline.diagnostics.some((d) => d.severity === 'error')) {
    console.error('The pipeline has errors; nothing was run.');
    return 1;
  }
  const store = new RunStore(ws.storeDir);
  const selection = resolveSelection(pipeline, args, store);
  const buildId = store.nextBuildId();
  const buildNumber = formatBuildNumber(pipeline.name, new Date(), buildId, (base) => store.revision(base), loaded.staticVariables);
  const plan = createPlan(pipeline, selection, { history: store, variables: pairs(args.flags.get('var'), '--var'), buildId, buildNumber });

  const flag = (name: string) => args.flags.get(name)?.[0];
  const yes = args.flags.has('yes');
  const quiet = args.flags.has('quiet');
  const interactive = !!process.stdin.isTTY && !yes;
  const fileSecrets = flag('secrets') ? readSecretsFile(flag('secrets')!, ws.root) : {};

  const engine = new LocalEngine({
    imagesDir: imagesDir(),
    cacheDir: store.cacheDir,
    homeDir: ws.home,
    dockerHost: flag('docker-host'),
    maxParallelJobs: Number(flag('max-parallel') ?? 2),
    keepContainersOnFailure: args.flags.has('keep-on-failure'),
    matchHostedHardware: args.flags.has('match-hosted-hardware'),
    counter: (prefix, seed) => store.counter(prefix, seed),
  });

  const jobName = new Map(pipeline.stages.flatMap((s) => s.jobs).map((j) => [j.id, j.displayName]));
  const stepName = new Map(pipeline.stages.flatMap((s) => s.jobs).flatMap((j) => j.steps.map((s) => [`${j.id}/${s.id}`, s.displayName] as const)));
  const width = Math.min(28, Math.max(...[...jobName.values()].map((n) => n.length)));
  const tag = (jobId: string) => dim(`${(jobName.get(jobId) ?? jobId).padEnd(width).slice(0, width)} |`);
  const view = new RunView(plan.jobs.map((j) => ({ jobId: j.job.id, action: j.action })));

  console.log(bold(`Run ${buildNumber}`) + dim(`  ${describeSelection(pipeline, selection)}, ${path.relative(ws.root, pipeline.file)}`));
  for (const pj of plan.jobs) {
    if (pj.action === 'omit') continue;
    console.log(dim(`  ${pj.action === 'run' ? 'run  ' : 'reuse'} ${pj.job.displayName}  (${pj.reason})`));
  }
  console.log('');

  const onEvent = (event: RunEvent) => {
    view.apply(event);
    switch (event.type) {
      case 'job.started':
        console.log(`${tag(event.jobId)} ${bold('job started')} ${dim(`on ${event.image}`)}`);
        break;
      case 'step.started': {
        const name = event.displayName ?? stepName.get(`${event.jobId}/${event.stepId}`) ?? event.stepId;
        stepName.set(`${event.jobId}/${event.stepId}`, name);
        console.log(`${tag(event.jobId)} ${paint(36, `> ${name}`)}`);
        break;
      }
      case 'log':
        if (!quiet) {
          const line = /##\[error\]/.test(event.line) ? paint(31, event.line) : /##\[warning\]/.test(event.line) ? paint(33, event.line) : event.line;
          console.log(`${tag(event.jobId)}   ${line}`);
        }
        break;
      case 'issue':
        if (quiet) console.log(`${tag(event.jobId)}   ${paint(event.severity === 'error' ? 31 : 33, `${event.severity}: ${event.message}`)}`);
        break;
      case 'step.finished': {
        const name = stepName.get(`${event.jobId}/${event.stepId}`) ?? event.stepId;
        const step = view.step(event.jobId, event.stepId);
        const took = step.startedAt ? dim(` ${formatDuration(event.at - step.startedAt)}`) : '';
        const note = event.message && event.result !== 'succeeded' ? dim(`  ${event.message}`) : '';
        console.log(`${tag(event.jobId)} ${resultMark(event.result)} ${name}${took}${note}`);
        break;
      }
      case 'job.finished': {
        const job = view.job(event.jobId);
        const took = job.startedAt ? dim(` in ${formatDuration(event.at - job.startedAt)}`) : '';
        console.log(`${tag(event.jobId)} ${bold(`job ${resultLabel(event.result)}`)}${took}${event.message ? dim(`  ${event.message}`) : ''}`);
        if (event.container) console.log(`${tag(event.jobId)} ${paint(33, `kept for debugging: ${event.container}`)}`);
        break;
      }
      default:
        break;
    }
  };

  const session = startRun({
    engine,
    plan,
    store,
    workspaceRoot: ws.root,
    config: ws.config,
    onEvent,
    hooks: {
      getSecret: async (name, group) => {
        const fromEnv = process.env[`AZP_SECRET_${name.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}`];
        if (fromEnv !== undefined) return fromEnv;
        if (fileSecrets[name.toLowerCase()] !== undefined) return fileSecrets[name.toLowerCase()];
        if (!interactive) return undefined;
        const answer = await ask(`Secret '${name}'${group ? ` (variable group ${group})` : ''}, leave empty to skip: `, true);
        return answer === '' ? undefined : answer;
      },
      confirm: async (message) => {
        if (yes) {
          console.log(paint(33, `${message} -> yes (--yes)`));
          return true;
        }
        if (!interactive) {
          console.log(paint(33, `${message} -> no (not a terminal; pass --yes to proceed)`));
          return false;
        }
        return /^y/i.test(await ask(`${message} [y/N] `));
      },
      approveIsolation: (risks, fingerprint) => approveIsolation(ws, args, risks, fingerprint),
    },
  });

  let interrupted = false;
  const onSigint = () => {
    if (interrupted) process.exit(130);
    interrupted = true;
    console.log(paint(35, '\nCanceling: stopping the running steps, then running steps whose condition allows it. Press Ctrl+C again to quit now.'));
    void session.cancel();
  };
  process.on('SIGINT', onSigint);
  const outcome = await session.done;
  process.off('SIGINT', onSigint);

  printSummary(pipeline, view, outcome, session.runId, store);
  // Refused before anything ran: a failure to start, not an interrupted run.
  if (outcome.result === 'canceled' && outcome.gaps[0] === ISOLATION_DECLINED) return 1;
  switch (outcome.result) {
    case 'succeeded':
    case 'succeededWithIssues':
    case 'skipped':
      return 0;
    case 'succeededWithGaps':
      return args.flags.has('allow-gaps') ? 0 : 3;
    case 'canceled':
      return 130;
    default:
      return 1;
  }
}

function printSummary(pipeline: Pipeline, view: RunView, outcome: { result: JobResult; gaps: string[] }, runId: string, store: RunStore): void {
  const took = view.startedAt && view.finishedAt ? formatDuration(view.finishedAt - view.startedAt) : '';
  console.log(`\n${bold('Summary')}  ${runId}${view.buildNumber ? `  build ${view.buildNumber}` : ''}  ${took}`);
  for (const stage of pipeline.stages) {
    const jobs = stage.jobs.filter((j) => view.jobs.get(j.id)?.state !== 'omitted');
    if (jobs.length === 0) continue;
    if (!stage.implicit) console.log(`  ${bold(stage.displayName)}`);
    for (const job of jobs) {
      const state = view.job(job.id);
      const duration = state.startedAt && state.finishedAt ? dim(` ${formatDuration(state.finishedAt - state.startedAt)}`) : '';
      console.log(`    ${resultMark(state.state)} ${job.displayName}${duration}${state.reused ? dim('  (reused)') : ''}${state.message && state.state !== 'succeeded' ? dim(`  ${state.message}`) : ''}`);
    }
  }
  for (const { jobId, summary } of view.tests) {
    console.log(`  Tests     ${summary.title}: ${summary.passed}/${summary.total} passed${summary.failed ? paint(31, `, ${summary.failed} failed`) : ''}${summary.skipped ? `, ${summary.skipped} skipped` : ''} ${dim(`(${jobId})`)}`);
  }
  for (const { jobId, summary } of view.coverage) {
    const pct = summary.linesTotal ? ((summary.linesCovered / summary.linesTotal) * 100).toFixed(1) : '0.0';
    console.log(`  Coverage  ${pct}% of lines (${summary.linesCovered}/${summary.linesTotal}, ${summary.format}) ${dim(`(${jobId})`)}`);
  }
  for (const artifact of view.artifacts) console.log(`  Artifact  ${artifact.name}: ${artifact.files} file(s)  ${dim(artifact.path)}`);
  for (const summary of view.summaries) console.log(`  Summary   ${summary.name}  ${dim(summary.path)}`);
  if (outcome.gaps.length > 0) {
    console.log(paint(33, '\n  Did not run as it would on Azure DevOps:'));
    for (const gap of outcome.gaps) console.log(paint(33, `    - ${gap}`));
  }
  const verdict = `Result: ${resultLabel(outcome.result)}`;
  console.log(`\n${outcome.result === 'failed' ? paint(31, verdict) : outcome.result === 'succeeded' ? paint(32, verdict) : paint(33, verdict)}`);
  if (outcome.result !== 'failed') console.log(dim('A local pass means the steps work here. It does not satisfy a branch policy or prove the run passes on Azure DevOps.'));
  console.log(dim(`Logs and artifacts: ${store.runDir(runId)}`));
}

async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.flags.has('help') || args.command === 'help') {
    console.log(HELP);
    return 0;
  }
  const ws = openWorkspace(args);

  switch (args.command) {
    case 'graph': {
      const loaded = load(ws, args);
      const graph = buildGraph(loaded.pipeline, loaded.staticVariables, ws.config);
      console.log(args.flags.has('json') ? JSON.stringify(graph, null, 2) : renderGraphText(graph));
      return loaded.pipeline.diagnostics.some((d) => d.severity === 'error') ? 1 : 0;
    }
    case 'expand': {
      const loaded = load(ws, args);
      if (!loaded.expanded) return 1;
      process.stdout.write(toYamlText(loaded.expanded));
      return loaded.pipeline.diagnostics.some((d) => d.severity === 'error') ? 1 : 0;
    }
    case 'run':
      return commandRun(ws, args);
    case 'doctor': {
      const files = args.positional[0] ? [path.resolve(ws.root, args.positional[0])] : discoverPipelines(ws.root, ws.config).pipelines;
      console.log(`Workspace ${ws.root}`);
      console.log(files.length ? `Pipelines: ${files.map((f) => path.relative(ws.root, f)).join(', ')}\n` : 'No pipeline files were found.\n');
      const pipelines = files.map((file) => loadPipeline(file, { workspaceRoot: ws.root, config: ws.config }).pipeline);
      const findings = [
        ...(await checkDocker(pipelines, ws.config, { dockerHost: args.flags.get('docker-host')?.[0], storeDir: ws.storeDir })),
        ...analysePipelines(pipelines, ws.config),
      ];
      const store = new RunStore(ws.storeDir);
      findings.push({ level: 'info', area: 'Disk', message: `Run store uses ${(store.sizeBytes() / 1024 ** 2).toFixed(1)} MB for ${store.listRuns().length} run(s)` });
      console.log(renderFindings(findings));
      return findings.some((f) => f.level === 'error') ? 1 : 0;
    }
    case 'runs': {
      const store = new RunStore(ws.storeDir);
      const runs = store.listRuns();
      if (runs.length === 0) console.log('No local runs yet.');
      for (const run of runs) {
        const took = run.finishedAt ? formatDuration(run.finishedAt - run.startedAt) : 'unfinished';
        console.log(`${run.runId}  ${resultMark(run.result ?? '')} ${new Date(run.startedAt).toISOString().replace('T', ' ').slice(0, 19)}  ${took.padEnd(8)} ${path.relative(ws.root, run.pipelineFile)}  ${dim(JSON.stringify(run.selection))}`);
      }
      return 0;
    }
    default:
      console.error(`Unknown command '${args.command}'.\n`);
      console.log(HELP);
      return 2;
  }
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err: Error) => {
    console.error(paint(31, `error  ${err.message}`));
    process.exitCode = 1;
  },
);
