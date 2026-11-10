// Finding pipeline files by content (D11). `azure-pipelines.yml` is a convention, not
// a rule: a YAML file counts when its top-level keys are a pipeline's, or the config
// file lists it. A file that another one includes with `template:` is a template.
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { LocalConfig } from './types';

// `build`, `bin` and `out` are not skipped: repositories often keep their pipelines there.
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.vscode-test', 'vendor', 'target', 'obj', '.venv', 'venv']);
const BODY_KEYS = ['stages', 'jobs', 'steps', 'extends'];
const FOREIGN_KEYS = ['apiVersion', 'kind', 'on', 'services', 'version', 'openapi', 'swagger'];

function topLevelKeys(text: string): Map<string, number> {
  const keys = new Map<string, number>();
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const m = /^(['"]?)([A-Za-z_][\w-]*)\1\s*:/.exec(line);
    if (m && !keys.has(m[2])) keys.set(m[2], index);
  });
  return keys;
}

/**
 * Names that mean "pipeline" whatever the file holds. A file called this that has no stages, jobs
 * or steps is a broken pipeline, not something else, and its error should be shown.
 */
export function hasPipelineName(file: string): boolean {
  return /^\.?azure-pipelines(?:[-.][\w.-]*)?\.ya?ml$/i.test(path.basename(file)) || /^\.?vsts-ci\.ya?ml$/i.test(path.basename(file));
}

/** True when the text is shaped like an Azure Pipelines file or template. */
export function looksLikePipeline(text: string): boolean {
  const keys = topLevelKeys(text);
  const body = BODY_KEYS.filter((key) => keys.has(key));
  if (body.length === 0) return false;
  if (FOREIGN_KEYS.some((key) => keys.has(key)) && !keys.has('pool') && !keys.has('trigger')) return false;
  if (body.includes('extends')) return true;
  // Azure's stages / jobs / steps are lists. GitHub Actions' `jobs:` is a mapping.
  const lines = text.split(/\r?\n/);
  return body.some((key) => {
    const start = keys.get(key)!;
    const inline = lines[start].slice(lines[start].indexOf(':') + 1).trim();
    if (inline.startsWith('[') || inline.startsWith('${{')) return true;
    for (let i = start + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      return trimmed.startsWith('-') || trimmed.startsWith('${{');
    }
    return false;
  });
}

function referencedTemplates(text: string, file: string, workspaceRoot: string): string[] {
  const out: string[] = [];
  const re = /^\s*-?\s*template\s*:\s*['"]?([^'"#\s]+)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let ref = m[1];
    const at = ref.lastIndexOf('@');
    if (at > 0) {
      if (ref.slice(at + 1) !== 'self') continue;
      ref = ref.slice(0, at);
    }
    out.push(ref.startsWith('/') ? path.join(workspaceRoot, ref) : path.resolve(path.dirname(file), ref));
  }
  return out;
}

export interface Discovery {
  pipelines: string[];
  templates: string[];
}

export function discoverPipelines(
  workspaceRoot: string,
  config: LocalConfig,
  readFile: (file: string) => string | undefined = (file) => {
    try {
      return fs.readFileSync(file, 'utf8');
    } catch {
      return undefined;
    }
  },
): Discovery {
  const yamlFiles: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 8 || yamlFiles.length > 3000) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), depth + 1);
      } else if (/\.ya?ml$/i.test(entry.name) && entry.name !== '.azp-local.yml') {
        yamlFiles.push(path.join(dir, entry.name));
      }
    }
  };
  walk(workspaceRoot, 0);

  const listed = new Set(config.pipelines.map((p) => path.resolve(workspaceRoot, p)));
  const candidates = new Set<string>(listed);
  const referenced = new Set<string>();
  for (const file of yamlFiles) {
    const text = readFile(file);
    if (text === undefined) continue;
    if (!looksLikePipeline(text)) {
      if (hasPipelineName(file)) candidates.add(file);
      continue;
    }
    candidates.add(file);
    referencedTemplates(text, file, workspaceRoot).forEach((ref) => referenced.add(path.normalize(ref)));
  }

  // A template need not look like a pipeline (a variables template has only `variables:`):
  // being referenced is what makes it one.
  const pipelines = [...candidates].filter((file) => listed.has(file) || !referenced.has(path.normalize(file))).sort();
  const templates = [...referenced].filter((file) => ![...listed].some((l) => path.normalize(l) === file) && readFile(file) !== undefined).sort();
  return { pipelines, templates };
}
