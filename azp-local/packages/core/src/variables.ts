// Variables: the `$(macro)` pass, the case-insensitive bag a job carries, and the
// local values of the predefined variables that are known before a run starts.
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Replaces `$(name)` where `name` is a known variable. Anything else is left exactly
 * as written, which is how shell command substitution such as `$(pwd)` survives.
 * Values are expanded recursively, as Azure does.
 */
export function expandMacros(text: string, lookup: (name: string) => string | undefined, depth = 0): string {
  if (!text.includes('$(') || depth > 20) return text;
  let out = '';
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf('$(', i);
    if (start < 0) break;
    const end = text.indexOf(')', start + 2);
    if (end < 0) break;
    const name = text.slice(start + 2, end);
    const value = name.length > 0 ? lookup(name) : undefined;
    if (value === undefined) {
      out += text.slice(i, start + 2);
      i = start + 2;
    } else {
      out += text.slice(i, start) + expandMacros(value, lookup, depth + 1);
      i = end + 1;
    }
  }
  return out + text.slice(i);
}

/** `Build.SourcesDirectory` -> `BUILD_SOURCESDIRECTORY`, the name a step sees in its environment. */
export function envName(variable: string): string {
  return variable.replace(/[.\s]/g, '_').toUpperCase();
}

export interface VariableEntry {
  name: string;
  value: string;
  secret: boolean;
  readonly: boolean;
}

export class VariableBag {
  private readonly entries = new Map<string, VariableEntry>();

  constructor(initial?: Iterable<VariableEntry>) {
    if (initial) for (const entry of initial) this.entries.set(entry.name.toLowerCase(), { ...entry });
  }

  set(name: string, value: string, flags: { secret?: boolean; readonly?: boolean } = {}): void {
    this.entries.set(name.toLowerCase(), { name, value, secret: flags.secret ?? false, readonly: flags.readonly ?? false });
  }

  get(name: string): string | undefined {
    return this.entries.get(name.toLowerCase())?.value;
  }

  entry(name: string): VariableEntry | undefined {
    return this.entries.get(name.toLowerCase());
  }

  has(name: string): boolean {
    return this.entries.has(name.toLowerCase());
  }

  all(): VariableEntry[] {
    return [...this.entries.values()];
  }

  clone(): VariableBag {
    return new VariableBag(this.entries.values());
  }

  expand(text: string): string {
    return expandMacros(text, (name) => this.get(name));
  }

  /** Non-secret variables as environment variables. Secrets reach a step only through its own `env:`. */
  toEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    for (const entry of this.entries.values()) {
      if (!entry.secret) env[envName(entry.name)] = this.expand(entry.value);
    }
    return env;
  }

  secrets(): string[] {
    return this.all()
      .filter((e) => e.secret && e.value.length > 0)
      .map((e) => e.value);
  }
}

function readGit(workspaceRoot: string): { branch?: string; sha?: string } {
  try {
    const gitDir = path.join(workspaceRoot, '.git');
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    const m = /^ref:\s*(.+)$/.exec(head);
    if (!m) return { sha: head };
    const ref = m[1];
    let sha: string | undefined;
    try {
      sha = fs.readFileSync(path.join(gitDir, ref), 'utf8').trim();
    } catch {
      try {
        const packed = fs.readFileSync(path.join(gitDir, 'packed-refs'), 'utf8');
        sha = packed.split('\n').find((line) => line.endsWith(` ${ref}`))?.split(' ')[0];
      } catch {
        /* a branch with no commits */
      }
    }
    return { branch: ref, sha };
  } catch {
    return {};
  }
}

/**
 * Predefined variables that do not depend on the job: the ones a template expression
 * may read. `overrides` comes from the config file (for example Build.Reason: PullRequest).
 */
export function staticVariables(workspaceRoot: string, pipelineFile: string, overrides: Record<string, string> = {}): Record<string, string> {
  const git = readGit(workspaceRoot);
  const branch = git.branch ?? 'refs/heads/main';
  const repoName = path.basename(workspaceRoot);
  const vars: Record<string, string> = {
    'Build.Reason': 'Manual',
    'Build.SourceBranch': branch,
    'Build.SourceBranchName': branch.split('/').pop() ?? branch,
    'Build.SourceVersion': git.sha ?? '0000000000000000000000000000000000000000',
    'Build.Repository.Name': repoName,
    'Build.Repository.Provider': 'TfsGit',
    'Build.DefinitionName': path.basename(pipelineFile).replace(/\.ya?ml$/i, ''),
    'Build.RequestedFor': 'Local user',
    'Build.QueuedBy': 'azp-local',
    'System.TeamProject': 'local',
    'System.TeamFoundationCollectionUri': 'https://localhost/azp-local/',
    'System.CollectionUri': 'https://localhost/azp-local/',
    'System.DefinitionId': '1',
    'System.HostType': 'build',
    'System.Debug': 'false',
    TF_BUILD: 'True',
  };
  for (const [name, value] of Object.entries(overrides)) {
    const existing = Object.keys(vars).find((k) => k.toLowerCase() === name.toLowerCase());
    vars[existing ?? name] = value;
  }
  const lower = (name: string) => Object.keys(vars).find((k) => k.toLowerCase() === name.toLowerCase());
  const sourceBranch = vars[lower('Build.SourceBranch')!];
  if (overrides && !Object.keys(overrides).some((k) => k.toLowerCase() === 'build.sourcebranchname')) {
    vars['Build.SourceBranchName'] = sourceBranch.split('/').pop() ?? sourceBranch;
  }
  if (vars['Build.Reason'] === 'PullRequest') {
    vars['System.PullRequest.PullRequestId'] ??= '1';
    vars['System.PullRequest.SourceBranch'] ??= sourceBranch;
    vars['System.PullRequest.TargetBranch'] ??= 'refs/heads/main';
  }
  return vars;
}

/** Expands the tokens of a `name:` (build number) format. Other variables are left for the macro pass. */
export function formatBuildNumber(format: string | undefined, now: Date, buildId: number, rev: (base: string) => number, vars: Record<string, string>): string {
  if (!format) return String(buildId);
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  const dateFormat = (spec: string) =>
    spec.replace(/yyyy|yy|MM|dd|HH|mm|ss/g, (token) => {
      switch (token) {
        case 'yyyy': return String(now.getFullYear());
        case 'yy': return pad(now.getFullYear() % 100);
        case 'MM': return pad(now.getMonth() + 1);
        case 'dd': return pad(now.getDate());
        case 'HH': return pad(now.getHours());
        case 'mm': return pad(now.getMinutes());
        default: return pad(now.getSeconds());
      }
    });
  const startOfYear = new Date(now.getFullYear(), 0, 0).getTime();
  const tokens: Record<string, string> = {
    'build.buildid': String(buildId),
    buildid: String(buildId),
    builddefinitionname: vars['Build.DefinitionName'] ?? '',
    sourcebranchname: vars['Build.SourceBranchName'] ?? '',
    teamproject: vars['System.TeamProject'] ?? '',
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    dayofmonth: String(now.getDate()),
    dayofyear: String(Math.floor((now.getTime() - startOfYear) / 86_400_000)),
    hours: String(now.getHours()),
    minutes: String(now.getMinutes()),
    seconds: String(now.getSeconds()),
  };
  let withoutRev = format.replace(/\$\(([^)]+)\)/g, (whole, body: string) => {
    const [name, ...rest] = body.split(':');
    const spec = rest.join(':');
    const key = name.trim().toLowerCase();
    if (key === 'date') return dateFormat(spec || 'yyyyMMdd');
    if (key === 'year' && spec) return dateFormat(spec);
    if (key === 'rev') return whole;
    return tokens[key] ?? whole;
  });
  withoutRev = expandMacros(withoutRev, (name) => (name.toLowerCase().startsWith('rev:') ? undefined : vars[name]));
  const base = withoutRev.replace(/\$\(rev:[^)]*\)/gi, '');
  return withoutRev.replace(/\$\(rev:([^)]*)\)/gi, (_whole, spec: string) => {
    const n = rev(base);
    return spec.replace(/r+/, (rs) => String(n).padStart(rs.length, '0'));
  });
}
