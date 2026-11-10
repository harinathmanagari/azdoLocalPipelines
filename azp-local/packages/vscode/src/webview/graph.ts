// The graph webview: stages as columns, jobs as cards with their matrix legs, arrows
// for dependsOn, badges for conditions and task tiers, live status while running,
// and the run summary underneath. Everything is built with DOM calls and
// textContent, so nothing from a pipeline or a log is ever parsed as HTML.
import type { GraphJob, GraphModel, GraphStage, GraphStep, Selection } from '@azp-local/core';
import type { FromWebview, JobSnapshot, Problem, RunSnapshot, StepSnapshot, ToWebview } from './protocol';

declare function acquireVsCodeApi(): { postMessage(message: FromWebview): void; getState(): unknown; setState(state: unknown): void };

const vscode = acquireVsCodeApi();
const app = document.getElementById('app')!;
const SVG = 'http://www.w3.org/2000/svg';

let graph: GraphModel | undefined;
let run: RunSnapshot | undefined;
let title = '';
let trusted = true;
let stale = false;
let problems: Problem[] = [];
/** The person chose to see the graph although the pipeline has errors. Forgotten once the errors are gone. */
let showAnyway = false;
/** Whether the person opened or closed the problems banner; unset means the default for what it holds. */
let bannerOpen: boolean | undefined;

type Tab = 'stages' | 'jobs';
interface SavedState {
  expanded?: string[];
  tab?: Tab;
  stageList?: boolean;
}
const saved = (vscode.getState() as SavedState | undefined) ?? {};
const expanded = new Set<string>(saved.expanded ?? []);
/** Which view of the run is shown: the stage flow, as on Azure DevOps, or the stages with their jobs and steps. */
let tab: Tab = saved.tab ?? 'stages';
/** Whether the "All Stages" list beside the stage flow is open. */
let stageListOpen = saved.stageList ?? true;
/** The stage picked in the "All Stages" list, outlined in the flow. */
let selectedStage: string | undefined;

function saveState(): void {
  vscode.setState({ expanded: [...expanded], tab, stageList: stageListOpen } satisfies SavedState);
}

type Child = Node | string | undefined | false;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) if (child) node.append(child);
  return node;
}

function button(label: string, className: string, hint: string, onClick: () => void, disabled = false): HTMLButtonElement {
  const node = el('button', className, label);
  node.type = 'button';
  node.title = hint;
  node.setAttribute('aria-label', hint);
  node.disabled = disabled;
  node.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });
  return node;
}

const LABEL: Record<string, string> = {
  succeeded: 'succeeded',
  succeededWithIssues: 'succeeded with issues',
  succeededWithGaps: 'succeeded with gaps',
  failed: 'failed',
  canceled: 'canceled',
  skipped: 'skipped',
  unsupported: 'not run locally',
  running: 'running',
  pending: 'waiting',
  omitted: 'not selected',
  none: 'not run yet',
};

/** Status icons are drawn as inline SVG, as Azure DevOps does: a filled or hollow circle with a glyph. */
function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, ...children: SVGElement[]): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  node.append(...children);
  return node;
}

const glyph = (d: string, extra: Record<string, string | number> = {}) => svgEl('path', { d, class: 'glyph', ...extra });
const ring = (extra: Record<string, string | number> = {}) => svgEl('circle', { cx: 8, cy: 8, r: 6.9, class: 'ring', ...extra });
const disc = () => svgEl('circle', { cx: 8, cy: 8, r: 7.4, class: 'disc' });

function statusIcon(state: string | undefined, size = 16): SVGElement {
  const key = state ?? 'none';
  const label = LABEL[key] ?? key;
  const parts: SVGElement[] = [];
  switch (key) {
    case 'succeeded':
    case 'succeededWithIssues':
      parts.push(disc(), glyph('M4.7 8.3 L7 10.6 L11.4 5.8'));
      break;
    case 'succeededWithGaps':
      parts.push(disc(), glyph('M8 4.4 V8.6'), glyph('M8 11.3 V11.4'));
      break;
    case 'failed':
      parts.push(disc(), glyph('M5.5 5.5 L10.5 10.5 M10.5 5.5 L5.5 10.5'));
      break;
    case 'canceled':
      parts.push(disc(), svgEl('rect', { x: 5.4, y: 5.4, width: 5.2, height: 5.2, rx: 0.9, class: 'solid' }));
      break;
    case 'running':
      parts.push(ring({ class: 'ring track' }), svgEl('path', { d: 'M8 1.1 A6.9 6.9 0 0 1 14.9 8', class: 'arc' }));
      break;
    case 'skipped':
      parts.push(ring(), glyph('M5.2 8 H10.4 M8.6 5.7 L10.9 8 L8.6 10.3'));
      break;
    case 'pending':
      parts.push(ring(), glyph('M8 4.7 V8 L10.3 9.5'));
      break;
    case 'unsupported': {
      const mark = svgEl('text', { x: 8, y: 11.4, 'text-anchor': 'middle', class: 'mark' });
      mark.textContent = '?';
      parts.push(ring(), mark);
      break;
    }
    case 'omitted':
      parts.push(ring({ class: 'ring dashed' }));
      break;
    default:
      parts.push(ring());
  }
  const icon = svgEl('svg', { viewBox: '0 0 16 16', width: size, height: size, class: `st st-${key}`, role: 'img', 'aria-label': label }, ...parts);
  icon.append(svgEl('title'));
  icon.lastElementChild!.textContent = label;
  return icon;
}

const ICONS: Record<string, string> = {
  play: 'M4.5 2.8 L12.6 8 L4.5 13.2 Z',
  playAll: 'M2 3.2 L7.2 8 L2 12.8 Z M8.4 3.2 L13.6 8 L8.4 12.8 Z',
  chevron: 'M6 3.6 L10.4 8 L6 12.4',
  pipeline: 'M2 3 H6 V6.5 H2 Z M10 9.5 H14 V13 H10 Z M6 4.75 H8 Q10 4.75 10 6.75 V9.5',
  collapse: 'M8 4 L4 8 L8 12 M12.5 4 L8.5 8 L12.5 12',
  expand: 'M3.5 4 L7.5 8 L3.5 12 M8 4 L12 8 L8 12',
};

function icon(name: keyof typeof ICONS, className = ''): SVGElement {
  const fill = name === 'play' || name === 'playAll';
  return svgEl('svg', { viewBox: '0 0 16 16', width: 14, height: 14, class: `ico ${fill ? 'ico-fill' : 'ico-line'} ${className}`.trim(), 'aria-hidden': 'true' }, svgEl('path', { d: ICONS[name] }));
}

function duration(from?: number, to?: number): string {
  if (!from) return '';
  const ms = (to ?? Date.now()) - from;
  if (ms < 1000) return to ? `${ms}ms` : '0s';
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/** An elapsed time that keeps counting, without a redraw, until it has an end. */
function timeEl(from?: number, to?: number): HTMLElement | undefined {
  if (!from) return undefined;
  const node = el('span', 'time', duration(from, to));
  if (!to && run?.live) node.dataset.from = String(from);
  return node;
}

function badge(text: string, className: string, hint?: string): HTMLElement {
  const node = el('span', `badge ${className}`, text);
  if (hint) node.title = hint;
  return node;
}

function conditionBadge(condition: string | undefined, preview: string | undefined): HTMLElement | undefined {
  if (!condition) return undefined;
  const text = preview === 'runs' ? 'if: runs' : preview === 'skipped' ? 'if: skipped' : 'if: depends';
  return badge(text, `cond cond-${preview}`, `Condition: ${condition}\nJudged from what is known before the run: ${preview === 'depends' ? 'decided during the run' : preview}`);
}

const post = (message: FromWebview) => vscode.postMessage(message);
const start = (selection: Selection) => post({ type: 'run', selection });
const busy = () => !!run?.live;
const canRun = () => trusted && !busy() && !!graph && graph.errors === 0;

function combine(states: string[]): string | undefined {
  const shown = states.filter((s) => s !== 'omitted');
  if (shown.length === 0) return undefined;
  for (const state of ['running', 'failed', 'canceled', 'succeededWithGaps', 'unsupported', 'succeededWithIssues']) if (shown.includes(state)) return state;
  if (shown.every((s) => s === 'skipped')) return 'skipped';
  if (shown.includes('pending')) return 'pending';
  return 'succeeded';
}

// --- rendering ---------------------------------------------------------------

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const TERMINAL = ['succeeded', 'succeededWithIssues', 'succeededWithGaps', 'failed', 'canceled', 'skipped', 'unsupported'];

function ago(ms: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return new Date(ms).toLocaleDateString();
}

function renderStep(job: GraphJob, step: GraphStep | undefined, snap: StepSnapshot | undefined): HTMLElement {
  const name = step?.displayName ?? snap?.displayName ?? snap?.id ?? '';
  const hasLog = !!snap && !['pending', 'skipped'].includes(snap.state);
  const item = el('li', `step${step && !step.enabled ? ' disabled' : ''}`);
  const row = el('div', 'step-row');
  item.append(row);
  const main = button('', 'step-main', hasLog ? `Open the log of ${name}` : step ? `Go to ${name} in the YAML` : name, () => {
    if (hasLog) post({ type: 'log', jobId: job.id, stepId: snap!.id });
    else if (step) post({ type: 'source', src: step.src });
  });
  main.append(statusIcon(snap?.state, 14), el('span', 'step-name', name));
  row.append(main);

  const meta = el('span', 'step-meta');
  if (step) {
    if (step.kind.includes('@')) {
      const kind = el('span', 'kind', step.kind);
      kind.title = step.kind;
      meta.append(kind);
      if (step.tier && step.tier > 1) meta.append(badge(`tier ${step.tier}`, `tier tier-${step.tier}`, [step.tierNote, step.override && `Locally: ${step.override}`].filter(Boolean).join('\n')));
    } else if (!step.implicit) {
      meta.append(el('span', 'kind', step.kind));
    }
    if (step.override) meta.append(badge(step.override.startsWith('replaced') ? 'stub' : step.override.startsWith('task code') ? 'local task' : step.override.split(' ')[0], 'override', step.override));
    const cond = conditionBadge(step.condition, step.preview);
    if (cond && !snap) meta.append(cond);
    if (!step.enabled) meta.append(badge('disabled', 'muted'));
  }
  if (snap?.errors) meta.append(badge(plural(snap.errors, 'error'), 'bad'));
  if (snap?.warnings) meta.append(badge(plural(snap.warnings, 'warning'), 'warn'));
  meta.append(timeEl(snap?.startedAt, snap?.finishedAt) ?? '');
  row.append(meta);
  if (step && !step.implicit) row.append(button('YAML', 'link yaml', `Go to ${name} in the YAML`, () => post({ type: 'source', src: step.src })));
  if (snap?.message && ['failed', 'unsupported', 'skipped', 'canceled', 'succeededWithIssues'].includes(snap.state)) item.append(el('div', `step-note${snap.state === 'failed' ? ' bad' : ''}`, snap.message));
  return item;
}

function runIcon(label: string, onClick: () => void, name: 'play' | 'playAll' = 'play'): HTMLButtonElement {
  const node = button('', 'icon', label, onClick, !canRun());
  node.append(icon(name));
  return node;
}

function renderJob(stage: GraphStage, job: GraphJob, asLeg: boolean): HTMLElement {
  const snap: JobSnapshot | undefined = run?.jobs[job.id];
  const open = expanded.has(job.id) || snap?.state === 'failed';
  const card = el('article', `job s-${snap?.state ?? 'none'}${asLeg ? ' leg' : ''}${open ? ' open' : ''}${job.target.kind === 'unsupported' ? ' unrunnable' : ''}`);
  card.dataset.id = job.id;

  const head = el('div', 'job-head');
  const toggle = button('', 'job-title', `${open ? 'Hide' : 'Show'} the steps of ${job.displayName}`, () => {
    if (expanded.has(job.id)) expanded.delete(job.id);
    else expanded.add(job.id);
    saveState();
    render();
  });
  toggle.setAttribute('aria-expanded', String(open));
  const text = el('span', 'job-text');
  const image = job.targetLabel.replace(/^azp-local\/agent-/, '');
  const target = el('span', 'job-target', `${job.pool} → ${image} · ${plural(job.steps.length, 'step')}`);
  target.title = `${job.pool} → ${job.targetLabel}`;
  if (job.target.kind === 'unsupported') target.title = job.target.reason;
  if (job.target.kind === 'host') target.title = job.target.note;
  text.append(el('span', 'job-name', asLeg ? (job.leg ?? job.displayName) : job.displayName), target);
  toggle.append(statusIcon(snap?.state), text);
  head.append(toggle, timeEl(snap?.startedAt, snap?.finishedAt) ?? '');
  head.append(runIcon(`Run job ${job.displayName}${job.dependsOn.length ? ' (and what it depends on, unless already run)' : ''}`, () => start({ kind: 'job', jobId: job.id })));
  head.append(el('span', 'chev-wrap', icon('chevron', 'chev')));
  card.append(head);

  const badges = el('div', 'badges');
  if (job.kind === 'deployment') badges.append(badge(job.environment ? `deploys to ${job.environment}` : 'deployment', 'muted', 'Environments, approvals and checks are shown, not enforced.'));
  if (job.target.kind === 'host') badges.append(badge('host, not isolated', 'warn', job.target.note));
  if (job.target.kind === 'unsupported') badges.append(badge('not runnable locally', 'warn', job.target.reason));
  if (job.tiers[2]) badges.append(badge(`${job.tiers[2]}× tier 2`, 'tier tier-2', "Tier 2: runs the task's own Node handler from its package."));
  if (job.tiers[3]) badges.append(badge(`${job.tiers[3]}× tier 3`, 'tier tier-3', 'Tier 3: cannot run locally. Shown as not run unless .azp-local.yml says what to do.'));
  for (const service of job.services) badges.append(badge(`service ${service}`, 'muted'));
  const cond = conditionBadge(job.condition, job.preview);
  if (cond) badges.append(cond);
  if (snap?.reused) badges.append(badge('reused', 'muted', snap.message));
  if (badges.childElementCount) card.append(badges);
  if (snap?.message && !snap.reused && snap.state !== 'succeeded') card.append(el('div', 'job-note', snap.message));
  if (snap?.container) {
    const kept = el('div', 'job-note');
    kept.append('Container kept for debugging. ', button('Open a shell', 'link', 'Open a terminal inside the kept container', () => post({ type: 'shell', jobId: job.id })));
    card.append(kept);
  }

  if (open) {
    const list = el('ol', 'steps');
    const known = new Set(job.steps.map((s) => s.id));
    const extra = (snap?.steps ?? []).filter((s) => !known.has(s.id));
    for (const s of extra.filter((s) => s.id === '__init')) list.append(renderStep(job, undefined, s));
    for (const step of job.steps) list.append(renderStep(job, step, snap?.steps.find((s) => s.id === step.id)));
    for (const s of extra.filter((s) => s.id !== '__init')) list.append(renderStep(job, undefined, s));
    card.append(list);
  }
  void stage;
  return card;
}

/** The line under a stage's name, as on an Azure DevOps stage card. */
function stageSummary(stage: GraphStage): string {
  if (!run) return plural(stage.jobs.length, 'job');
  const states = stage.jobs.map((job) => run?.jobs[job.id]?.state ?? 'pending').filter((s) => s !== 'omitted');
  if (states.length === 0) return 'Not selected';
  const finished = states.filter((s) => TERMINAL.includes(s)).length;
  const failed = states.filter((s) => s === 'failed').length;
  if (states.includes('running')) return `Running · ${finished} of ${plural(states.length, 'job')} done`;
  if (failed) return `${failed} of ${plural(states.length, 'job')} failed`;
  if (states.every((s) => s === 'skipped')) return 'Skipped due to conditions';
  if (finished === states.length) return `${plural(states.length, 'job')} completed`;
  return finished === 0 ? 'Waiting' : `${finished} of ${plural(states.length, 'job')} completed`;
}

function stageTime(stage: GraphStage): HTMLElement | undefined {
  const snaps = stage.jobs.map((job) => run?.jobs[job.id]).filter((s): s is JobSnapshot => !!s?.startedAt);
  if (snaps.length === 0) return undefined;
  const from = Math.min(...snaps.map((s) => s.startedAt!));
  const done = snaps.every((s) => s.finishedAt);
  return timeEl(from, done ? Math.max(...snaps.map((s) => s.finishedAt!)) : undefined);
}

function renderStage(stage: GraphStage): HTMLElement {
  const states = stage.jobs.map((job) => run?.jobs[job.id]?.state).filter((s): s is string => !!s);
  const box = el('section', `stage${stage.implicit ? ' implicit' : ''}`);
  box.dataset.id = stage.id;
  if (!stage.implicit) {
    const head = el('header', 'stage-head');
    const name = button('', 'stage-title', `Go to stage ${stage.displayName} in the YAML`, () => post({ type: 'source', src: stage.src }));
    const text = el('span', 'stage-text');
    text.append(el('span', 'stage-name', stage.displayName), el('span', 'stage-sub', stageSummary(stage)));
    name.append(statusIcon(combine(states), 20), text);
    head.append(name, stageTime(stage) ?? '');
    head.append(
      runIcon(`Run stage ${stage.displayName}`, () => start({ kind: 'stage', stageId: stage.id })),
      runIcon(`Run from ${stage.displayName}: this stage and every stage after it`, () => start({ kind: 'stage', stageId: stage.id, andLater: true }), 'playAll'),
    );
    const cond = conditionBadge(stage.condition, stage.preview);
    if (cond) head.append(el('div', 'stage-badges', cond));
    box.append(head);
  }

  // Matrix legs of one job are drawn together, fanned out under the job's name.
  const groups = new Map<string, GraphJob[]>();
  for (const job of stage.jobs) groups.set(job.name, [...(groups.get(job.name) ?? []), job]);
  const body = el('div', 'jobs');
  for (const [name, jobs] of groups) {
    if (jobs.length === 1 && !jobs[0].leg) {
      body.append(renderJob(stage, jobs[0], false));
      continue;
    }
    const legStates = jobs.map((j) => run?.jobs[j.id]?.state).filter((s): s is string => !!s);
    const group = el('div', 'matrix');
    group.dataset.id = `${stage.id}.${name}`;
    const head = el('div', 'matrix-head');
    const label = jobs[0].leg ? jobs[0].displayName.slice(0, -jobs[0].leg.length).trim() || name : name;
    head.append(statusIcon(combine(legStates)), el('span', 'matrix-name', label), el('span', 'matrix-count', plural(jobs.length, 'leg')));
    head.append(runIcon(`Run every leg of ${label}`, () => start({ kind: 'job', jobId: `${stage.id}.${name}` })));
    group.append(head);
    for (const job of jobs) group.append(renderJob(stage, job, true));
    body.append(group);
  }
  box.append(body);
  return box;
}

// --- stage flow (the "Stages" tab) --------------------------------------------

const stageState = (stage: GraphStage) => combine(stage.jobs.map((job) => run?.jobs[job.id]?.state).filter((s): s is string => !!s));

/** Opens the "Jobs" tab at a stage: what clicking a stage card does on Azure DevOps. */
function showJobsOf(stageId: string): void {
  tab = 'jobs';
  saveState();
  render();
  requestAnimationFrame(() => focus(stageId));
}

function selectStage(stageId: string): void {
  selectedStage = stageId;
  render();
  requestAnimationFrame(() => focus(stageId, 'nearest'));
}

/** A compact stage card: status and name, then what its jobs did and how long it took. */
function renderStageCard(stage: GraphStage): HTMLElement {
  const card = el('article', `stage-card s-${stageState(stage) ?? 'none'}${selectedStage === stage.id ? ' selected' : ''}`);
  card.dataset.id = stage.id;
  card.title = stage.displayName;
  const main = button('', 'stage-card-main', `Show the jobs of stage ${stage.displayName}`, () => showJobsOf(stage.id));
  main.append(
    el('span', 'stage-card-title', statusIcon(stageState(stage), 16), el('span', 'stage-card-name', stage.displayName)),
    el('span', 'stage-card-meta', el('span', 'stage-card-sub', stageSummary(stage)), stageTime(stage) ?? ''),
  );
  card.append(main);
  const cond = run ? undefined : conditionBadge(stage.condition, stage.preview);
  if (cond) card.append(el('div', 'stage-card-extra', cond));
  card.append(
    el(
      'div',
      'stage-card-actions',
      runIcon(`Run stage ${stage.displayName}`, () => start({ kind: 'stage', stageId: stage.id })),
      runIcon(`Run from ${stage.displayName}: this stage and every stage after it`, () => start({ kind: 'stage', stageId: stage.id, andLater: true }), 'playAll'),
    ),
  );
  return card;
}

/**
 * Places stages on a grid: one column per dependency depth, one row per stage in that column.
 * Rows line up across columns, as on Azure DevOps; a stage sits near the stages it waits for.
 */
function layoutStages(stages: GraphStage[]): Map<string, { column: number; row: number }> {
  const place = new Map<string, { column: number; row: number }>();
  const depth = Math.max(0, ...stages.map((s) => s.column));
  for (let c = 0; c <= depth; c++) {
    const inColumn = stages.filter((s) => s.column === c);
    const weight = (stage: GraphStage) => {
      const rows = stage.dependsOn.map((id) => place.get(id)?.row).filter((r): r is number => r !== undefined);
      return rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : 0;
    };
    const ordered = inColumn.map((stage, index) => ({ stage, index, weight: weight(stage) })).sort((a, b) => a.weight - b.weight || a.index - b.index);
    ordered.forEach(({ stage }, row) => place.set(stage.id, { column: c, row }));
  }
  return place;
}

function renderStagesView(): HTMLElement {
  const stages = graph!.stages.filter((s) => !s.implicit);
  const view = el('div', `stages-view${stageListOpen ? '' : ' list-closed'}`);

  if (stageListOpen) {
    const aside = el('aside', 'stage-list');
    const head = el('div', 'stage-list-head', el('span', '', 'All Stages'));
    const close = button('', 'icon-btn', 'Hide the list of stages', () => {
      stageListOpen = false;
      saveState();
      render();
    });
    close.append(icon('collapse'));
    head.append(close);
    const list = el('ul', 'stage-list-items');
    for (const stage of stages) {
      const item = button('', `stage-list-item${selectedStage === stage.id ? ' selected' : ''}`, `Show stage ${stage.displayName} in the flow`, () => selectStage(stage.id));
      item.title = stage.displayName;
      item.append(statusIcon(stageState(stage), 16), el('span', 'stage-list-name', stage.displayName));
      list.append(el('li', '', item));
    }
    aside.append(head, list);
    view.append(aside);
  }

  const flow = el('div', 'flow');
  if (!stageListOpen) {
    const reopen = button('', 'icon-btn reopen', 'Show the list of stages', () => {
      stageListOpen = true;
      saveState();
      render();
    });
    reopen.append(icon('expand'));
    flow.append(reopen);
  }
  const links = document.createElementNS(SVG, 'svg');
  links.setAttribute('class', 'links');
  links.setAttribute('aria-hidden', 'true');
  const grid = el('div', 'flow-grid');
  const place = layoutStages(stages);
  for (const stage of stages) {
    const card = renderStageCard(stage);
    const at = place.get(stage.id)!;
    card.style.gridColumn = String(at.column + 1);
    card.style.gridRow = String(at.row + 1);
    grid.append(card);
  }
  flow.append(links, grid);
  view.append(flow);
  return view;
}

/** Connectors between stage cards: straight across a row, otherwise a step with rounded corners. */
function drawStageLinks(flow: HTMLElement, svg: SVGSVGElement): void {
  if (!graph) return;
  svg.replaceChildren();
  const origin = flow.getBoundingClientRect();
  const dx = flow.scrollLeft - origin.left;
  const dy = flow.scrollTop - origin.top;
  svg.setAttribute('width', String(flow.scrollWidth));
  svg.setAttribute('height', String(flow.scrollHeight));
  const anchor = (id: string) => {
    const card = flow.querySelector<HTMLElement>(`.stage-card[data-id="${CSS.escape(id)}"]`);
    if (!card) return undefined;
    const r = card.getBoundingClientRect();
    // Connectors meet a card halfway down its name and summary, whatever sits below them.
    const main = card.querySelector('.stage-card-main')!.getBoundingClientRect();
    return { left: r.left + dx, right: r.right + dx, y: (main.top + main.bottom) / 2 + dy };
  };
  for (const stage of graph.stages) {
    const to = anchor(stage.id);
    if (!to) continue;
    for (const dep of stage.dependsOn) {
      const from = anchor(dep);
      if (!from) continue;
      const node = document.createElementNS(SVG, 'path');
      const { right: x1, y: y1 } = from;
      const { left: x2, y: y2 } = to;
      if (Math.abs(y1 - y2) < 1) {
        node.setAttribute('d', `M${x1},${y1} H${x2}`);
      } else {
        // The bend sits in the gap just before the card it leads to.
        const xm = Math.max(x1 + 6, x2 - 14);
        const dir = y2 > y1 ? 1 : -1;
        const r = Math.min(8, Math.abs(y2 - y1) / 2, xm - x1, x2 - xm);
        node.setAttribute('d', `M${x1},${y1} H${xm - r} Q${xm},${y1} ${xm},${y1 + dir * r} V${y2 - dir * r} Q${xm},${y2} ${xm + r},${y2} H${x2}`);
      }
      node.setAttribute('class', 'link-line');
      svg.append(node);
    }
  }
}

/** The stages with their jobs and steps: the "Jobs" tab. */
function renderJobsView(): HTMLElement {
  const canvas = el('div', 'canvas');
  const edges = document.createElementNS(SVG, 'svg');
  edges.setAttribute('class', 'edges');
  edges.setAttribute('aria-hidden', 'true');
  canvas.append(edges);
  const columns = el('div', 'columns');
  const depth = Math.max(0, ...graph!.stages.map((s) => s.column));
  for (let c = 0; c <= depth; c++) {
    const column = el('div', 'column');
    for (const stage of graph!.stages.filter((s) => s.column === c)) column.append(renderStage(stage));
    columns.append(column);
  }
  canvas.append(columns);
  return canvas;
}

function renderRunView(): HTMLElement {
  const staged = graph!.stages.some((s) => !s.implicit);
  // A pipeline without stages has nothing to show on a stage flow, as on Azure DevOps.
  const current: Tab = staged ? tab : 'jobs';
  const panel = el('section', 'block panel');
  const tabs = el('div', 'tabs');
  tabs.setAttribute('role', 'tablist');
  const tabButton = (label: string, value: Tab) => {
    const node = button(label, `tab${current === value ? ' active' : ''}`, `Show ${label.toLowerCase()}`, () => {
      tab = value;
      saveState();
      render();
    });
    node.setAttribute('role', 'tab');
    node.setAttribute('aria-selected', String(current === value));
    return node;
  };
  if (staged) tabs.append(tabButton('Stages', 'stages'));
  tabs.append(tabButton('Jobs', 'jobs'));
  panel.append(tabs, current === 'stages' ? renderStagesView() : renderJobsView());
  return panel;
}

/** Redraws the lines of whichever tab is showing, once the cards have their size. */
function drawLines(): void {
  const flow = document.querySelector<HTMLElement>('.flow');
  const links = flow?.querySelector<SVGSVGElement>(':scope > .links');
  if (flow && links) drawStageLinks(flow, links);
  const canvas = document.querySelector<HTMLElement>('.canvas');
  const edges = canvas?.querySelector<SVGSVGElement>(':scope > .edges');
  if (canvas && edges) drawEdges(canvas, edges);
}

function fact(label: string, ...content: Child[]): HTMLElement {
  return el('div', 'fact', el('div', 'fact-label', label), el('div', 'fact-value', ...content));
}

/** The card at the top of Azure DevOps's run summary: result, run, time started and elapsed, triggers. */
function renderFacts(): HTMLElement {
  const state = run ? (run.live ? 'running' : (run.result ?? 'canceled')) : undefined;
  const card = el('section', 'facts');
  const result = el('span', 'inline', statusIcon(state), el('span', '', run ? (LABEL[state!] ?? state!) : 'Not run yet'));
  card.append(fact('Result', result));
  if (run) {
    card.append(fact('Run', run.buildNumber ? `#${run.buildNumber}` : run.runId, run.buildNumber ? el('span', 'muted-text', ` ${run.runId}`) : undefined));
    card.append(fact('Scope', run.selection));
    const started = run.startedAt ? el('span', '', ago(run.startedAt)) : undefined;
    if (started && run.startedAt) started.title = new Date(run.startedAt).toLocaleString();
    card.append(fact('Time started and elapsed', started ?? '–', run.startedAt ? el('span', 'muted-text', ' · ') : undefined, timeEl(run.startedAt, run.finishedAt)));
  }
  const triggers = el('div', 'triggers');
  triggers.title = 'Triggers are shown for information; nothing fires locally.';
  triggers.append(badge(`CI: ${graph!.triggers.ci ?? '-'}`, 'muted'), badge(`PR: ${graph!.triggers.pr ?? '-'}`, 'muted'));
  for (const schedule of graph!.triggers.schedules) triggers.append(badge(`cron ${schedule.cron}`, 'muted', schedule.displayName));
  card.append(fact('Triggers', triggers));
  return card;
}

function renderGaps(): HTMLElement | undefined {
  if (!run || run.gaps.length === 0) return undefined;
  const gaps = el('section', 'message warn');
  gaps.append(statusIcon('succeededWithGaps', 18));
  const body = el('div', 'message-body');
  body.append(el('div', 'message-title', 'Did not run as it would on Azure DevOps'));
  const list = el('ul');
  for (const gap of run.gaps) list.append(el('li', '', gap));
  body.append(list);
  gaps.append(body);
  return gaps;
}

function jump(id: string): void {
  expanded.add(id);
  tab = 'jobs';
  saveState();
  render();
  requestAnimationFrame(() => focus(id));
}

/** The "Jobs" table of the run summary: name, status, duration. */
function renderJobsTable(): HTMLElement | undefined {
  if (!run || !graph) return undefined;
  const rows: HTMLElement[] = [];
  for (const stage of graph.stages) {
    for (const job of stage.jobs) {
      const snap = run.jobs[job.id];
      if (!snap || snap.state === 'omitted') continue;
      const name = button(job.displayName, 'link job-link', `Show ${job.displayName} in the graph`, () => jump(job.id));
      const label = el('span', 'inline', statusIcon(snap.state), el('span', '', LABEL[snap.state] ?? snap.state));
      rows.push(el('tr', '', el('td', '', name, stage.implicit ? undefined : el('span', 'muted-text', `  ${stage.displayName}`)), el('td', '', label), el('td', 'num', timeEl(snap.startedAt, snap.finishedAt) ?? '–')));
    }
  }
  if (rows.length === 0) return undefined;
  const table = el('table', 'jobs-table');
  table.append(el('thead', '', el('tr', '', el('th', '', 'Name'), el('th', '', 'Status'), el('th', 'num', 'Duration'))), el('tbody', '', ...rows));
  return el('section', 'block', el('h2', '', 'Jobs'), el('div', 'card flush', table));
}

function renderTiles(): HTMLElement | undefined {
  if (!run) return undefined;
  const grid = el('div', 'summary-grid');
  for (const tests of run.tests) {
    const tile = el('div', 'tile');
    const bar = el('div', 'meter stack');
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', `${tests.passed} passed, ${tests.failed} failed, ${tests.skipped} skipped`);
    for (const [count, className] of [[tests.passed, 'ok'], [tests.failed, 'bad'], [tests.skipped, 'skip']] as const) {
      if (!count || !tests.total) continue;
      const part = el('div', `meter-fill ${className}`);
      part.style.width = `${((count / tests.total) * 100).toFixed(1)}%`;
      bar.append(part);
    }
    tile.append(el('h3', '', 'Tests'), el('div', 'figure', `${tests.passed}/${tests.total}`), bar, el('div', 'muted-text', `${tests.title}: ${tests.failed} failed, ${tests.skipped} skipped, ${duration(1, 1 + tests.durationMs)}`));
    if (tests.failures.length) {
      const list = el('ul', 'failures');
      for (const failure of tests.failures.slice(0, 8)) list.append(el('li', '', failure));
      tile.append(list);
    }
    grid.append(tile);
  }
  for (const coverage of run.coverage) {
    const pct = coverage.linesTotal ? (coverage.linesCovered / coverage.linesTotal) * 100 : 0;
    const tile = el('div', 'tile');
    const meter = el('div', 'meter');
    const fill = el('div', 'meter-fill ok');
    fill.style.width = `${pct.toFixed(1)}%`;
    meter.append(fill);
    meter.setAttribute('role', 'img');
    meter.setAttribute('aria-label', `${pct.toFixed(1)} percent of lines covered`);
    tile.append(
      el('h3', '', 'Coverage'),
      el('div', 'figure', `${pct.toFixed(1)}%`),
      meter,
      el('div', 'muted-text', `${coverage.linesCovered}/${coverage.linesTotal} lines${coverage.branchesTotal ? `, ${coverage.branchesCovered}/${coverage.branchesTotal} branches` : ''} (${coverage.format}, drawn locally)`),
    );
    grid.append(tile);
  }
  if (run.artifacts.length) {
    const tile = el('div', 'tile');
    tile.append(el('h3', '', 'Artifacts'), el('div', 'figure', String(run.artifacts.length)), el('div', 'muted-text', `${run.artifacts.length} published`));
    for (const artifact of run.artifacts) {
      tile.append(button(`${artifact.name} (${plural(artifact.files, 'file')})`, 'link block', `Show artifact ${artifact.name} in the file manager`, () => post({ type: 'reveal', path: artifact.path, kind: 'artifact' })));
    }
    grid.append(tile);
  }
  if (run.summaries.length) {
    const tile = el('div', 'tile');
    tile.append(el('h3', '', 'Uploaded summaries'));
    for (const summary of run.summaries) tile.append(button(summary.name, 'link block', `Open ${summary.name}`, () => post({ type: 'reveal', path: summary.path, kind: 'summary' })));
    grid.append(tile);
  }
  if (grid.childElementCount === 0) return undefined;
  return el('section', 'block', el('h2', '', 'Tests, coverage and related'), grid);
}

// --- problems ----------------------------------------------------------------

const errorCount = () => problems.filter((p) => p.severity === 'error').length;

function openAt(src: Problem['src']): void {
  if (src) post({ type: 'source', src });
}

function renderProblem(p: Problem): HTMLElement {
  const row = el('li', `problem problem-${p.severity}`);
  row.append(p.severity === 'error' ? statusIcon('failed', 16) : statusIcon('succeededWithGaps', 16));
  const text = el('div', 'problem-text', el('div', 'problem-message', p.message));
  const meta = el('div', 'problem-meta');
  if (p.src && p.file) meta.append(button(`${p.file}:${p.line}`, 'link-button', 'Open this line in the editor', () => openAt(p.src)));
  if (p.includedFrom) meta.append(button(`included from ${p.includedFrom.file}:${p.includedFrom.line}`, 'link-button', 'Open the line that includes this template', () => openAt(p.includedFrom!.src)));
  if (p.code) meta.append(el('span', 'problem-code', p.code));
  if (meta.childElementCount) text.append(meta);
  row.append(text);
  if (p.src) {
    row.classList.add('openable');
    row.addEventListener('click', () => openAt(p.src));
  }
  return row;
}

/** Findings grouped by the file they are in, the pipeline's own file first. */
function renderProblemGroups(items: Problem[]): HTMLElement {
  const groups = new Map<string, Problem[]>();
  for (const p of items) groups.set(p.file ?? '', [...(groups.get(p.file ?? '') ?? []), p]);
  const wrap = el('div', 'problem-groups');
  for (const [file, rows] of groups) {
    const list = el('ul', 'problem-list');
    for (const p of rows) list.append(renderProblem(p));
    wrap.append(el('section', 'problem-group', file ? el('h3', 'problem-file', file, badge(String(rows.length), 'muted')) : undefined, list));
  }
  return wrap;
}

/** Shown instead of the graph while the pipeline has errors. It redraws as the file is edited, so the graph replaces it by itself. */
function renderErrorView(): void {
  const errors = problems.filter((p) => p.severity === 'error');
  const others = problems.filter((p) => p.severity !== 'error');
  app.replaceChildren();

  const bar = el('header', 'bar');
  const heading = el('div', 'bar-title', statusIcon('failed', 28));
  heading.append(el('div', 'bar-text', el('h1', '', title), el('div', 'bar-sub', `${plural(errors.length, 'error')} to fix before the graph can be drawn`)));
  bar.append(heading, el('div', 'bar-actions', button('Show graph anyway', 'secondary', 'Draw what could be read, even though the pipeline has errors. It may be incomplete.', () => {
    showAnyway = true;
    render();
  })));
  app.append(bar);

  const page = el('div', 'page');
  page.append(el('div', 'message info', el('div', 'message-body', 'Fix the errors below, in the editor or by clicking one to jump to it. The graph appears here as soon as none are left.')));
  page.append(renderProblemGroups(errors));
  if (others.length) page.append(el('section', 'block', el('h2', '', plural(others.length, 'warning')), renderProblemGroups(others)));
  app.append(page);
}

/** Above the graph: warnings to look at, or the errors that were set aside with "Show graph anyway". */
function renderProblemsBanner(): HTMLElement | undefined {
  if (problems.length === 0) return undefined;
  const errors = errorCount();
  const warnings = problems.length - errors;
  const summary = errors
    ? `${plural(errors, 'error')}${warnings ? ` and ${plural(warnings, 'warning')}` : ''} found. The graph may be incomplete.`
    : `${plural(warnings, 'warning')} found in this pipeline.`;
  const details = el('details', `message problems-banner ${errors ? 'bad' : 'warn'}`);
  details.open = bannerOpen ?? errors > 0;
  const head = el('summary', 'message-title', summary);
  // Kept across redraws, which happen as the file is edited; the click comes before the state changes.
  head.addEventListener('click', () => (bannerOpen = !details.open));
  details.append(head, renderProblemGroups(problems));
  return details;
}

function renderHeader(): HTMLElement {
  const bar = el('header', 'bar');
  const state = run ? (run.live ? 'running' : (run.result ?? 'canceled')) : undefined;
  const heading = el('div', 'bar-title');
  heading.append(run ? statusIcon(state, 28) : el('span', 'pipeline-glyph', icon('pipeline')));
  const text = el('div', 'bar-text');
  text.append(el('h1', '', title), el('div', 'bar-sub', run ? `Run ${run.buildNumber ? `#${run.buildNumber}` : run.runId} · ${LABEL[state!] ?? state!}` : 'Local pipeline · not run yet'));
  heading.append(text);
  bar.append(heading);

  const actions = el('div', 'bar-actions');
  if (busy()) actions.append(button('Cancel run', 'primary danger', 'Stop the running steps, then run steps whose condition allows it', () => post({ type: 'cancel' })));
  else {
    const runButton = button('', 'primary', 'Run every stage locally', () => start({ kind: 'pipeline' }), !canRun());
    runButton.append(icon('play'), 'Run pipeline');
    actions.append(runButton);
  }
  if (run && !run.live && ['failed', 'canceled'].includes(run.result ?? '')) actions.append(button('Re-run failed jobs', 'secondary', 'Run again only what did not pass; keep the rest', () => post({ type: 'command', command: 'rerunFailed' }), !canRun()));
  actions.append(
    button('Parameters', 'secondary', 'Set parameters and variables for the next run', () => post({ type: 'command', command: 'setInputs' })),
    button('Final YAML', 'secondary', 'Show the YAML after template expansion', () => post({ type: 'command', command: 'expand' })),
    button('Doctor', 'secondary', 'Check Docker, images and what needs a decision', () => post({ type: 'command', command: 'doctor' })),
  );
  bar.append(actions);
  return bar;
}

function render(): void {
  if (!graph) return;
  const scroll = { x: window.scrollX, y: window.scrollY };
  // Live runs redraw often; the stage flow and job columns keep their own horizontal scroll.
  const inner = document.querySelector<HTMLElement>('.flow, .canvas');
  const innerScroll = inner ? { kind: inner.className, left: inner.scrollLeft } : undefined;
  if (errorCount() > 0 && !showAnyway) {
    renderErrorView();
    window.scrollTo(scroll.x, scroll.y);
    return;
  }
  app.replaceChildren();
  app.append(renderHeader());

  const page = el('div', 'page');
  if (!trusted) page.append(el('div', 'message info', el('div', 'message-body', 'This workspace is not trusted, so pipelines cannot be run from it. The graph is still drawn.')));
  const banner = renderProblemsBanner();
  if (banner) page.append(banner);
  if (stale) page.append(el('div', 'message info', el('div', 'message-body', 'The file has changed since this run started. The statuses below belong to the run; the layout is the current file.')));
  page.append(renderFacts());
  const gaps = renderGaps();
  if (gaps) page.append(gaps);

  page.append(renderRunView());

  for (const section of [renderJobsTable(), renderTiles()]) if (section) page.append(section);
  if (run && !run.live && run.result !== 'failed') {
    page.append(el('p', 'muted-text footnote', 'A local pass means the steps work here. It does not satisfy a branch policy or prove the run passes on Azure DevOps.'));
  }
  app.append(page);

  const next = document.querySelector<HTMLElement>('.flow, .canvas');
  if (next && innerScroll && next.className === innerScroll.kind) next.scrollLeft = innerScroll.left;
  window.scrollTo(scroll.x, scroll.y);
  requestAnimationFrame(drawLines);
}

/** Arrows for dependsOn: between stages, and between jobs inside a stage. */
function drawEdges(canvas: HTMLElement, svg: SVGSVGElement): void {
  if (!graph) return;
  svg.replaceChildren();
  const origin = canvas.getBoundingClientRect();
  svg.setAttribute('width', String(canvas.scrollWidth));
  svg.setAttribute('height', String(canvas.scrollHeight));
  const defs = document.createElementNS(SVG, 'defs');
  const marker = document.createElementNS(SVG, 'marker');
  marker.setAttribute('id', 'arrow');
  marker.setAttribute('viewBox', '0 0 8 8');
  marker.setAttribute('refX', '7');
  marker.setAttribute('refY', '4');
  marker.setAttribute('markerWidth', '7');
  marker.setAttribute('markerHeight', '7');
  marker.setAttribute('orient', 'auto');
  const tip = document.createElementNS(SVG, 'path');
  tip.setAttribute('d', 'M0,0 L8,4 L0,8 z');
  tip.setAttribute('class', 'edge-tip');
  marker.append(tip);
  defs.append(marker);
  svg.append(defs);

  const rect = (id: string) => {
    const node = canvas.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
    if (!node) return undefined;
    const r = node.getBoundingClientRect();
    // The canvas scrolls sideways; positions are taken from its content's corner.
    const ox = origin.left - canvas.scrollLeft;
    const oy = origin.top - canvas.scrollTop;
    // A card that is open grows downwards; arrows meet its header row.
    const head = node.querySelector(':scope > .job-head, :scope > .matrix-head')?.getBoundingClientRect();
    const midY = (head ? (head.top + head.bottom) / 2 : (r.top + r.bottom) / 2) - oy;
    return { left: r.left - ox, right: r.right - ox, top: r.top - oy, bottom: r.bottom - oy, midY };
  };
  const path = (d: string, className: string) => {
    const node = document.createElementNS(SVG, 'path');
    node.setAttribute('d', d);
    node.setAttribute('class', className);
    node.setAttribute('marker-end', 'url(#arrow)');
    svg.append(node);
  };

  for (const stage of graph.stages) {
    const to = rect(stage.id);
    for (const dep of stage.dependsOn) {
      const from = rect(dep);
      if (!from || !to) continue;
      const y1 = Math.min(from.bottom - 16, from.top + 26);
      const y2 = Math.min(to.bottom - 16, to.top + 26);
      const mid = (from.right + to.left) / 2;
      path(`M${from.right},${y1} C${mid},${y1} ${mid},${y2} ${to.left - 2},${y2}`, 'edge edge-stage');
    }
    // A job that waits for another in the same stage: an arc down the left side of the cards.
    for (const job of stage.jobs) {
      const target = rect(job.id);
      const sources = new Set(job.dependsOn.map((id) => (canvas.querySelector(`[data-id="${CSS.escape(id)}"]`)?.closest('.matrix') as HTMLElement | null)?.dataset.id ?? id));
      for (const source of sources) {
        const from = rect(source);
        if (!from || !target) continue;
        const x = Math.min(from.left, target.left);
        const bend = x - 14;
        path(`M${from.left},${from.midY} C${bend},${from.midY} ${bend},${target.midY} ${target.left - 2},${target.midY}`, 'edge edge-job');
      }
    }
  }
}

function focus(id: string, block: ScrollLogicalPosition = 'center'): void {
  const node = document.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
  if (!node) return;
  node.scrollIntoView({ block, inline: 'center', behavior: 'smooth' });
  node.classList.add('focus');
  setTimeout(() => node.classList.remove('focus'), 1600);
}

window.addEventListener('message', (event: MessageEvent<ToWebview>) => {
  const message = event.data;
  if (message.type === 'model') {
    graph = message.graph;
    title = message.title;
    trusted = message.trusted;
    run = message.run;
    stale = !!message.stale;
    problems = message.problems;
    if (errorCount() === 0) showAnyway = false;
    if (message.focus) {
      const job = graph.stages.flatMap((s) => s.jobs).find((j) => j.id === message.focus);
      if (job) {
        expanded.add(job.id);
        tab = 'jobs';
      }
    }
    render();
    if (message.focus) requestAnimationFrame(() => focus(message.focus!));
  } else if (message.type === 'run') {
    run = message.run;
    render();
  }
});

window.addEventListener('resize', drawLines);

// Elapsed times of running jobs tick without a message from the extension.
setInterval(() => {
  for (const node of document.querySelectorAll<HTMLElement>('.time[data-from]')) node.textContent = duration(Number(node.dataset.from));
}, 1000);

post({ type: 'ready' });
