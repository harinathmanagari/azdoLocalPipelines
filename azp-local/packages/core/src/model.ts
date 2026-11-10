// Builds the typed tree (pipeline -> stages -> jobs -> steps) from an expanded file.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { emptyConfig, taskOverride } from './config';
import { expandPipeline, normaliseVariables, type ExpandResult } from './expand';
import { ExprError, parseExpression } from './expressions';
import { findCycle, lintPipeline, suggest } from './lint';
import { classifyTask } from './tasks';
import {
  DEFAULT_CONDITION,
  type ContainerSpec,
  type Diagnostic,
  type Job,
  type LocalConfig,
  type Pipeline,
  type PoolSpec,
  type SourceRef,
  type Stage,
  type Step,
  type StepRun,
  type TriggerInfo,
  type VariableDecl,
} from './types';
import { expandMacros, staticVariables } from './variables';
import { get, getText, has, isPMap, isPScalar, isPSeq, toPlain, type PMap, type PNode } from './yaml';

export interface LoadOptions {
  workspaceRoot: string;
  /** Serves file text; lets a host supply unsaved editor contents. Defaults to the file system. */
  readFile?: (absPath: string) => string | undefined;
  config?: LocalConfig;
  /** Per-run parameter values, applied over the config file's. */
  parameters?: Record<string, unknown>;
  /** Per-run variable values, applied over the config file's. */
  variables?: Record<string, string>;
}

export interface LoadedPipeline {
  pipeline: Pipeline;
  /** The expanded tree, for "Expand to final YAML". */
  expanded: PMap | null;
  /** Variables known before the run: predefined values plus overrides. */
  staticVariables: Record<string, string>;
}

const STEP_KEYS = ['script', 'bash', 'pwsh', 'powershell', 'checkout', 'download', 'publish', 'task', 'template', 'downloadBuild', 'getPackage', 'reviewApp'];
const LIFECYCLE_HOOKS = ['preDeploy', 'deploy', 'routeTraffic', 'postRouteTraffic'];

function defaultReadFile(file: string): string | undefined {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
}

function list(node: PNode | undefined): string[] {
  if (isPScalar(node)) return node.text ? [node.text] : [];
  if (isPSeq(node)) return node.items.filter(isPScalar).map((item) => item.text);
  return [];
}

function bool(node: PNode | undefined, fallback: boolean): boolean {
  if (!isPScalar(node)) return fallback;
  if (typeof node.value === 'boolean') return node.value;
  const text = node.text.toLowerCase();
  return text === 'true' ? true : text === 'false' ? false : fallback;
}

function num(node: PNode | undefined): number | undefined {
  if (!isPScalar(node) || node.text === '') return undefined;
  const n = Number(node.text);
  return Number.isNaN(n) ? undefined : n;
}

function record(node: PNode | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isPMap(node)) return out;
  for (const entry of node.entries) {
    out[entry.key.text] = isPScalar(entry.value) ? entry.value.text : JSON.stringify(toPlain(entry.value));
  }
  return out;
}

function readVariables(node: PNode | undefined): VariableDecl[] {
  const out: VariableDecl[] = [];
  for (const item of normaliseVariables(node)) {
    const group = getText(item, 'group');
    const name = getText(item, 'name');
    if (group) out.push({ name: '', value: '', group, src: item.src });
    else if (name) out.push({ name, value: getText(item, 'value') ?? '', readonly: bool(get(item, 'readonly'), false), src: item.src });
  }
  return out;
}

class Builder {
  readonly diagnostics: Diagnostic[] = [];
  private containers: Record<string, ContainerSpec> = {};

  constructor(
    private readonly config: LocalConfig,
    private readonly baseVars: Record<string, string>,
  ) {}

  private warn(message: string, source: SourceRef, severity: Diagnostic['severity'] = 'warning', code = 'model'): void {
    // A template used several times, or a job with several matrix legs, builds the same line again and again.
    if (this.diagnostics.some((d) => d.message === message && d.source?.file === source.file && d.source.line === source.line && d.source.column === source.column)) return;
    this.diagnostics.push({ severity, message, source, code });
  }

  /** Reports a `condition:` that is not a valid expression, on the line that holds it. */
  private condition(node: PMap, fallback: string = DEFAULT_CONDITION): string {
    const value = getText(node, 'condition');
    if (value === undefined) return fallback;
    try {
      parseExpression(value);
    } catch (err) {
      if (!(err instanceof ExprError)) throw err;
      // The parser's message ends with the expression it read; the condition is named in ours instead.
      const detail = err.message.replace(/ (in|of) expression:[\s\S]*$/, (_, word: string) => (word === 'of' ? ' of the condition' : ''));
      this.warn(`Invalid condition '${value}': ${detail}.`, get(node, 'condition')!.src, 'error', 'condition');
    }
    return value;
  }

  /** Reports a loop among stages or among the jobs of a stage: none of them could ever start. */
  private cycles(label: string, members: { name: string; dependsOn: string[]; src: SourceRef }[]): void {
    const edges = new Map(members.map((m) => [m.name, m.dependsOn]));
    const loop = findCycle(edges);
    if (!loop) return;
    const first = members.find((m) => m.name === loop[0])!;
    const message = loop.length === 2 ? `${label} '${loop[0]}' depends on itself.` : `${label}s depend on each other in a loop: ${loop.join(' → ')}.`;
    this.warn(message, first.src, 'error', 'dependency-cycle');
  }

  /** Values that are known before the run and can be shown in names and pool labels. */
  private known(base: Record<string, string>, decls: VariableDecl[]): Record<string, string> {
    const out = { ...base };
    for (const decl of decls) {
      if (decl.group) {
        const group = this.config.variableGroups[decl.group];
        if (group) for (const [name, entry] of Object.entries(group)) if (!entry.secret && entry.value !== undefined) out[name] = entry.value;
      } else if (!decl.value.trimStart().startsWith('$[')) {
        out[decl.name] = decl.value;
      }
    }
    return out;
  }

  build(root: PMap, file: string, expand: ExpandResult): Pipeline {
    const resources = get(get(root, 'resources'), 'containers');
    if (isPSeq(resources)) {
      for (const item of resources.items) {
        const alias = getText(item, 'container');
        const spec = this.containerSpec(item);
        if (alias && spec) this.containers[alias] = { ...spec, alias };
      }
    }

    const variables = readVariables(get(root, 'variables'));
    const vars = this.known(this.baseVars, variables);
    const rootPool = get(root, 'pool');
    let stages: Stage[] = [];
    const stagesNode = get(root, 'stages');

    if (isPSeq(stagesNode)) {
      let previous: string | undefined;
      stagesNode.items.forEach((node, index) => {
        if (!isPMap(node)) return this.warn('A stage must be a mapping.', node.src, 'error');
        const stage = this.stage(node, index, previous, rootPool, vars);
        stages.push(stage);
        previous = stage.id;
      });
    } else if (isPSeq(get(root, 'jobs'))) {
      stages = [this.implicitStage(root, (get(root, 'jobs') as { items: PNode[] }).items, rootPool, vars)];
    } else if (isPSeq(get(root, 'steps'))) {
      // A file with only `steps:` is one implicit stage holding one implicit job.
      stages = [this.implicitStage(root, [root], rootPool, vars)];
    } else if (!has(root, 'extends')) {
      this.warn("This file has no 'stages', 'jobs' or 'steps', so there is nothing to run.", root.src, 'error', 'empty');
    }

    const ids = new Set<string>();
    for (const stage of stages) {
      for (const dep of stage.dependsOn) {
        if (!stages.some((s) => s.id === dep)) this.warn(`Stage '${stage.id}' depends on '${dep}', which does not exist.`, stage.src, 'error');
      }
      for (const job of stage.jobs) {
        if (ids.has(job.id)) this.warn(`Job '${job.name}' is defined more than once in stage '${stage.id}'.`, job.src, 'error');
        ids.add(job.id);
        for (const dep of job.dependsOn) {
          if (!stage.jobs.some((j) => j.name === dep)) this.warn(`Job '${job.name}' depends on '${dep}', which is not in this stage.`, job.src, 'error');
        }
      }
      // The legs of a matrix share a name, so one entry per job name is enough.
      this.cycles('Job', stage.jobs.map((j) => ({ name: j.name, dependsOn: j.dependsOn, src: j.src })));
    }
    this.cycles('Stage', stages.map((s) => ({ name: s.id, dependsOn: s.dependsOn, src: s.src })));
    // After a syntax error the parser has guessed at the structure, so keys it made up would only add noise.
    if (!expand.diagnostics.some((d) => d.severity === 'error' && d.code === 'yaml')) {
      for (const finding of lintPipeline(root)) this.warn(finding.message, finding.source!, finding.severity, finding.code);
    }

    return {
      name: getText(root, 'name'),
      file,
      triggers: this.triggers(root),
      parameters: expand.parameters,
      parameterValues: expand.parameterValues,
      variables,
      stages,
      files: expand.files,
      diagnostics: [...expand.diagnostics, ...this.diagnostics],
    };
  }

  private triggers(root: PMap): TriggerInfo {
    const describe = (node: PNode | undefined, absent: string): string => {
      if (node === undefined) return absent;
      if (isPScalar(node)) return node.text === 'none' ? 'disabled' : `branch ${node.text}`;
      if (isPSeq(node)) return `branches ${list(node).join(', ')}`;
      const parts: string[] = [];
      for (const kind of ['branches', 'paths', 'tags']) {
        const include = list(get(get(node, kind), 'include'));
        const exclude = list(get(get(node, kind), 'exclude'));
        if (include.length) parts.push(`${kind} ${include.join(', ')}`);
        if (exclude.length) parts.push(`not ${kind} ${exclude.join(', ')}`);
      }
      return parts.join('; ') || 'enabled';
    };
    const schedules = get(root, 'schedules');
    return {
      ci: describe(get(root, 'trigger'), 'every branch (default)'),
      pr: describe(get(root, 'pr'), 'every pull request (default)'),
      schedules: isPSeq(schedules)
        ? schedules.items.map((item) => ({ cron: getText(item, 'cron') ?? '', displayName: getText(item, 'displayName') }))
        : [],
    };
  }

  private implicitStage(root: PMap, jobNodes: PNode[], rootPool: PNode | undefined, vars: Record<string, string>): Stage {
    const stage: Stage = {
      id: '__default',
      displayName: 'Jobs',
      implicit: true,
      dependsOn: [],
      condition: DEFAULT_CONDITION,
      variables: [],
      jobs: [],
      src: root.src,
    };
    stage.jobs = this.jobs(jobNodes, stage.id, rootPool, vars, jobNodes.length === 1 && jobNodes[0] === root);
    return stage;
  }

  private stage(node: PMap, index: number, previous: string | undefined, rootPool: PNode | undefined, vars: Record<string, string>): Stage {
    const id = getText(node, 'stage') || `Stage${index + 1}`;
    const variables = readVariables(get(node, 'variables'));
    const stageVars = this.known(vars, variables);
    const text = (value: string) => expandMacros(value, (name) => lookupCI(stageVars, name));
    const jobsNode = get(node, 'jobs');
    return {
      id,
      displayName: text(getText(node, 'displayName') ?? id),
      implicit: false,
      dependsOn: has(node, 'dependsOn') ? list(get(node, 'dependsOn')) : previous ? [previous] : [],
      condition: this.condition(node),
      variables,
      jobs: isPSeq(jobsNode) ? this.jobs(jobsNode.items, id, get(node, 'pool') ?? rootPool, stageVars, false) : [],
      src: node.src,
    };
  }

  private jobs(nodes: PNode[], stageId: string, inheritedPool: PNode | undefined, vars: Record<string, string>, rootIsJob: boolean): Job[] {
    const jobs: Job[] = [];
    nodes.forEach((node, index) => {
      if (!isPMap(node)) return this.warn('A job must be a mapping.', node.src, 'error');
      const isDeployment = has(node, 'deployment');
      const name = (isDeployment ? getText(node, 'deployment') : getText(node, 'job')) || (nodes.length === 1 ? 'Job' : `Job${index + 1}`);
      // Root-level variables of a steps-only file already live on the pipeline.
      const variables = rootIsJob ? [] : readVariables(get(node, 'variables'));
      const strategy = get(node, 'strategy');

      let legs: ({ name: string; variables: Record<string, string> } | undefined)[] = [undefined];
      if (!isDeployment && isPMap(strategy)) {
        const matrix = get(strategy, 'matrix');
        const parallel = num(get(strategy, 'parallel'));
        if (isPMap(matrix) && matrix.entries.length > 0) {
          legs = matrix.entries.map((entry) => ({ name: entry.key.text, variables: record(entry.value) }));
        } else if (isPScalar(matrix) && matrix.text) {
          this.warn('This matrix is computed at run time and cannot be expanded locally; the job is shown as a single leg.', matrix.src);
        } else if (parallel && parallel > 1) {
          legs = Array.from({ length: parallel }, (_, i) => ({
            name: `Job${i + 1}`,
            variables: { 'System.JobPositionInPhase': String(i + 1), 'System.TotalJobsInPhase': String(parallel) },
          }));
        }
      }

      for (const leg of legs) {
        const jobVars = { ...this.known(vars, variables), ...(leg?.variables ?? {}) };
        const text = (value: string) => expandMacros(value, (n) => lookupCI(jobVars, n));
        const displayName = text(getText(node, 'displayName') ?? name);
        const stepNodes: { node: PNode; condition?: string }[] = [];
        if (isDeployment) {
          const kind = ['runOnce', 'rolling', 'canary'].find((k) => has(strategy, k));
          const body = kind ? get(strategy, kind) : undefined;
          if (!body) this.warn(`Deployment job '${name}' has no runOnce, rolling or canary strategy.`, node.src, 'error');
          for (const hook of LIFECYCLE_HOOKS) {
            const steps = get(get(body, hook), 'steps');
            if (isPSeq(steps)) stepNodes.push(...steps.items.map((s) => ({ node: s })));
          }
          for (const [outcome, condition] of [['failure', 'failed()'], ['success', 'succeeded()']] as const) {
            const steps = get(get(get(body, 'on'), outcome), 'steps');
            if (isPSeq(steps)) stepNodes.push(...steps.items.map((s) => ({ node: s, condition })));
          }
        } else {
          const steps = get(node, 'steps');
          if (isPSeq(steps)) stepNodes.push(...steps.items.map((s) => ({ node: s })));
        }

        const environment = get(node, 'environment');
        const job: Job = {
          id: [stageId, name, leg?.name].filter(Boolean).join('.'),
          name,
          stageId,
          displayName: leg ? `${displayName} ${leg.name}` : displayName,
          kind: isDeployment ? 'deployment' : 'job',
          dependsOn: list(get(node, 'dependsOn')),
          condition: this.condition(node),
          pool: this.pool(get(node, 'pool') ?? inheritedPool, text),
          container: this.containerRef(get(node, 'container'), text),
          matrixLeg: leg,
          maxParallel: num(get(strategy, 'maxParallel')),
          services: this.services(get(node, 'services'), text),
          variables,
          steps: this.steps(stepNodes, isDeployment, text, node.src),
          timeoutInMinutes: num(get(node, 'timeoutInMinutes')),
          continueOnError: bool(get(node, 'continueOnError'), false),
          environment: isPScalar(environment) ? text(environment.text) : getText(environment, 'name'),
          src: node.src,
        };
        jobs.push(job);
      }
    });
    return jobs;
  }

  private pool(node: PNode | undefined, text: (value: string) => string): PoolSpec {
    if (node === undefined) return { kind: 'none', label: '' };
    if (isPScalar(node)) {
      const name = text(node.text);
      if (name.toLowerCase() === 'server') return { kind: 'server', label: 'server' };
      return name ? { kind: 'named', name, label: name } : { kind: 'none', label: '' };
    }
    const vmImage = getText(node, 'vmImage');
    const name = getText(node, 'name');
    if (vmImage) return { kind: 'hosted', vmImage: text(vmImage), label: text(vmImage) };
    if (name) return { kind: 'named', name: text(name), label: text(name) };
    return { kind: 'none', label: '' };
  }

  private containerSpec(node: PNode | undefined): ContainerSpec | undefined {
    if (!isPMap(node)) return undefined;
    const image = getText(node, 'image');
    if (!image) return undefined;
    return {
      image,
      env: has(node, 'env') ? record(get(node, 'env')) : undefined,
      ports: has(node, 'ports') ? list(get(node, 'ports')) : undefined,
      volumes: has(node, 'volumes') ? list(get(node, 'volumes')) : undefined,
      options: getText(node, 'options'),
    };
  }

  private containerRef(node: PNode | undefined, text: (value: string) => string): ContainerSpec | undefined {
    if (node === undefined) return undefined;
    if (isPScalar(node)) {
      const ref = text(node.text);
      if (!ref) return undefined;
      return this.containers[ref] ?? { image: ref };
    }
    const spec = this.containerSpec(node);
    return spec ? { ...spec, image: text(spec.image) } : undefined;
  }

  private services(node: PNode | undefined, text: (value: string) => string): Record<string, ContainerSpec> {
    const out: Record<string, ContainerSpec> = {};
    if (!isPMap(node)) return out;
    for (const entry of node.entries) {
      const spec = this.containerRef(entry.value, text);
      if (spec) out[entry.key.text] = spec;
      else this.warn(`Service '${entry.key.text}' does not name a container.`, entry.key.src, 'error');
    }
    return out;
  }

  private steps(nodes: { node: PNode; condition?: string }[], isDeployment: boolean, text: (value: string) => string, jobSrc: SourceRef): Step[] {
    const steps: Step[] = [];
    const used = new Set<string>();
    let n = 0;
    for (const { node, condition } of nodes) {
      n++;
      if (!isPMap(node)) {
        this.warn('A step must be a mapping.', node.src, 'error');
        continue;
      }
      const run = this.stepRun(node);
      if (!run) continue;
      const refName = getText(node, 'name');
      let id = refName || `step${n}`;
      // Hooks of a deployment job are separate lifecycle phases, so only an ordinary job needs unique names.
      if (refName && used.has(id) && !isDeployment) this.warn(`Step name '${refName}' is used more than once in this job; step names must be unique.`, get(node, 'name')!.src, 'error', 'duplicate-step-name');
      while (used.has(id)) id = `${id}_${n}`;
      used.add(id);
      steps.push({
        id,
        refName,
        displayName: text(getText(node, 'displayName') ?? defaultDisplayName(run)),
        run,
        condition: this.condition(node, condition),
        continueOnError: bool(get(node, 'continueOnError'), false),
        enabled: bool(get(node, 'enabled'), true),
        env: record(get(node, 'env')),
        workingDirectory: getText(node, 'workingDirectory'),
        failOnStderr: has(node, 'failOnStderr') ? bool(get(node, 'failOnStderr'), false) : undefined,
        timeoutInMinutes: num(get(node, 'timeoutInMinutes')),
        retryCount: num(get(node, 'retryCountOnTaskFailure')),
        src: node.src,
      });
    }

    // Steps the agent adds by itself have no line of their own; they point at the job.
    const first = jobSrc;
    if (isDeployment) {
      // A deployment job does not check out sources; it downloads the run's artifacts instead.
      if (!steps.some((s) => s.run.kind === 'download')) {
        steps.unshift({
          ...implicitStep('download', 'Download artifacts', first),
          run: { kind: 'download', source: 'current', artifact: '' },
        });
      }
    } else if (!steps.some((s) => s.run.kind === 'checkout')) {
      steps.unshift({ ...implicitStep('checkout', 'Checkout', first), run: { kind: 'checkout', repository: 'self' } });
    }
    return steps;
  }

  private stepRun(node: PMap): StepRun | undefined {
    const key = STEP_KEYS.find((k) => has(node, k));
    const value = key ? (getText(node, key) ?? '') : '';
    switch (key) {
      case 'script':
        return { kind: 'script', shell: 'default', script: value };
      case 'bash':
        return { kind: 'script', shell: 'bash', script: value };
      case 'pwsh':
        return { kind: 'script', shell: 'pwsh', script: value };
      case 'powershell':
        return { kind: 'script', shell: 'powershell', script: value };
      case 'checkout':
        return { kind: 'checkout', repository: value || 'self', fetchDepth: num(get(node, 'fetchDepth')) };
      case 'download':
        return { kind: 'download', source: value || 'current', artifact: getText(node, 'artifact') ?? '', patterns: getText(node, 'patterns') };
      case 'publish':
        return { kind: 'publish', path: value, artifact: getText(node, 'artifact') ?? '' };
      case 'task': {
        const at = value.lastIndexOf('@');
        const name = at > 0 ? value.slice(0, at) : value;
        const version = at > 0 ? value.slice(at + 1) : '';
        if (!name) {
          this.warn("A 'task:' step needs a task name such as CmdLine@2.", node.src, 'error');
          return undefined;
        }
        if (!version) this.warn(`Task '${name}' has no version (expected ${name}@<major>).`, node.src);
        const inputs = record(get(node, 'inputs'));
        const { tier, reason } = classifyTask(name, inputs);
        return { kind: 'task', name, version, inputs, tier, tierReason: reason, override: taskOverride(this.config, name, version) };
      }
      case 'template':
        this.warn(`Template '${value}' could not be included here.`, node.src, 'error');
        return undefined;
      case 'downloadBuild':
      case 'getPackage':
      case 'reviewApp':
        return {
          kind: 'task',
          name: key,
          version: '',
          inputs: record(node),
          tier: 3,
          tierReason: `'${key}' needs data that only the Azure DevOps server has.`,
          override: taskOverride(this.config, key, ''),
        };
      default: {
        // A misspelled step keyword (`scrpit:`) is the likeliest cause; name the one it looks like.
        const typo = node.entries.map((e) => ({ key: e.key.text, near: suggest(e.key.text, STEP_KEYS) })).find((e) => e.near);
        this.warn(`Unrecognised step.${typo ? ` '${typo.key}' looks like a misspelling of '${typo.near}'.` : ''} Expected one of: ${STEP_KEYS.slice(0, 8).join(', ')}.`, node.src, 'error');
        return undefined;
      }
    }
  }
}

function implicitStep(id: string, displayName: string, src: SourceRef): Omit<Step, 'run'> {
  return { id, displayName, condition: DEFAULT_CONDITION, continueOnError: false, enabled: true, env: {}, implicit: true, src };
}

function defaultDisplayName(run: StepRun): string {
  switch (run.kind) {
    case 'script':
      return run.shell === 'default' ? 'CmdLine' : run.shell === 'bash' ? 'Bash' : 'PowerShell';
    case 'task':
      return run.name;
    case 'checkout':
      return `Checkout ${run.repository}`;
    case 'download':
      return run.source === 'none' ? 'Download (none)' : `Download ${run.artifact || 'artifacts'}`;
    case 'publish':
      return `Publish ${run.artifact || 'artifact'}`;
  }
}

export function lookupCI(vars: Record<string, string>, name: string): string | undefined {
  if (Object.prototype.hasOwnProperty.call(vars, name)) return vars[name];
  const lower = name.toLowerCase();
  const key = Object.keys(vars).find((k) => k.toLowerCase() === lower);
  return key === undefined ? undefined : vars[key];
}

export function loadPipeline(file: string, opts: LoadOptions): LoadedPipeline {
  const config = opts.config ?? emptyConfig();
  const absolute = path.resolve(opts.workspaceRoot, file);
  const base = staticVariables(opts.workspaceRoot, absolute, { ...config.variables, ...(opts.variables ?? {}) });
  const expand = expandPipeline(absolute, {
    workspaceRoot: opts.workspaceRoot,
    readFile: opts.readFile ?? defaultReadFile,
    repositories: config.repositories,
    parameters: { ...config.parameters, ...(opts.parameters ?? {}) },
    variables: base,
  });
  if (!expand.root) {
    return {
      expanded: null,
      staticVariables: base,
      pipeline: {
        file: absolute,
        triggers: { schedules: [] },
        parameters: expand.parameters,
        parameterValues: expand.parameterValues,
        variables: [],
        stages: [],
        files: expand.files,
        diagnostics: expand.diagnostics,
      },
    };
  }
  const builder = new Builder(config, base);
  return { pipeline: builder.build(expand.root, absolute, expand), expanded: expand.root, staticVariables: base };
}
