// .azp-local.yml: the one optional file that holds everything specific to a repository.
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Diagnostic, LocalConfig, TaskOverride } from './types';
import { get, isPMap, isPScalar, isPSeq, loadYaml, toPlain, type PNode } from './yaml';

export const CONFIG_FILE = '.azp-local.yml';
const KNOWN_KEYS = ['pipelines', 'images', 'repositories', 'parameters', 'variables', 'variableGroups', 'tasks', 'workspace', 'dockerSocket'];

export function emptyConfig(): LocalConfig {
  return {
    pipelines: [],
    images: {},
    repositories: {},
    parameters: {},
    variables: {},
    variableGroups: {},
    tasks: {},
    workspace: 'copy',
    dockerSocket: false,
    diagnostics: [],
  };
}

export function parseConfig(text: string, file: string): LocalConfig {
  const config = emptyConfig();
  config.file = file;
  const { root, diagnostics } = loadYaml(text, file);
  config.diagnostics.push(...diagnostics);
  if (root === null) return config;
  const problem = (message: string, node: PNode, severity: Diagnostic['severity'] = 'error') =>
    config.diagnostics.push({ severity, message, source: node.src, code: 'config' });
  if (!isPMap(root)) {
    problem(`${CONFIG_FILE} must be a mapping.`, root);
    return config;
  }

  const stringMap = (key: string): Record<string, string> => {
    const node = get(root, key);
    const out: Record<string, string> = {};
    if (node === undefined) return out;
    if (!isPMap(node)) {
      problem(`'${key}' must be a mapping.`, node);
      return out;
    }
    for (const entry of node.entries) {
      if (isPScalar(entry.value)) out[entry.key.text] = entry.value.text;
      else problem(`'${key}.${entry.key.text}' must be text.`, entry.value);
    }
    return out;
  };

  for (const entry of root.entries) {
    if (!KNOWN_KEYS.includes(entry.key.text)) problem(`Unknown key '${entry.key.text}'.`, entry.key, 'warning');
  }

  const pipelines = get(root, 'pipelines');
  if (isPSeq(pipelines)) config.pipelines = pipelines.items.filter(isPScalar).map((item) => item.text);
  else if (pipelines) problem("'pipelines' must be a list of file paths.", pipelines);

  config.images = stringMap('images');
  config.repositories = stringMap('repositories');
  config.variables = stringMap('variables');

  const parameters = get(root, 'parameters');
  if (isPMap(parameters)) config.parameters = toPlain(parameters) as Record<string, unknown>;
  else if (parameters) problem("'parameters' must be a mapping.", parameters);

  const groups = get(root, 'variableGroups');
  if (isPMap(groups)) {
    for (const group of groups.entries) {
      const values: Record<string, { value?: string; secret: boolean }> = {};
      if (isPMap(group.value)) {
        for (const entry of group.value.entries) {
          if (isPScalar(entry.value)) values[entry.key.text] = { value: entry.value.text, secret: false };
          else if (isPMap(entry.value) && get(entry.value, 'secret')) {
            const secret = get(entry.value, 'secret');
            values[entry.key.text] = { secret: isPScalar(secret) && secret.value === true };
            if (get(entry.value, 'value')) problem('A secret must not have a value here; it is prompted for and kept in the keychain.', entry.value);
          } else problem(`'${entry.key.text}' must be a value or { secret: true }.`, entry.value);
        }
      } else problem(`Variable group '${group.key.text}' must be a mapping.`, group.value);
      config.variableGroups[group.key.text] = values;
    }
  } else if (groups) problem("'variableGroups' must be a mapping.", groups);

  const tasks = get(root, 'tasks');
  if (isPMap(tasks)) {
    for (const entry of tasks.entries) {
      let override: TaskOverride | undefined;
      if (isPScalar(entry.value)) {
        if (entry.value.text === 'skip') override = { action: 'skip' };
        else if (entry.value.text === 'fail') override = { action: 'fail' };
      } else if (isPMap(entry.value)) {
        const script = get(entry.value, 'script');
        const taskPath = get(entry.value, 'path');
        if (isPScalar(script)) override = { action: 'script', script: script.text };
        else if (isPScalar(taskPath)) override = { action: 'path', path: taskPath.text };
      }
      if (override) config.tasks[entry.key.text] = override;
      else problem(`Task '${entry.key.text}' must be skip, fail, { script: file } or { path: folder }.`, entry.value);
    }
  } else if (tasks) problem("'tasks' must be a mapping.", tasks);

  const workspace = get(root, 'workspace');
  if (isPScalar(workspace)) {
    if (workspace.text === 'copy' || workspace.text === 'mount') config.workspace = workspace.text;
    else problem("'workspace' must be copy or mount.", workspace);
  }
  const socket = get(root, 'dockerSocket');
  if (isPScalar(socket)) config.dockerSocket = socket.value === true;

  return config;
}

export function loadConfig(workspaceRoot: string, readFile?: (file: string) => string | undefined): LocalConfig {
  const file = path.join(workspaceRoot, CONFIG_FILE);
  let text: string | undefined;
  try {
    text = readFile ? readFile(file) : fs.readFileSync(file, 'utf8');
  } catch {
    text = undefined;
  }
  return text === undefined ? emptyConfig() : parseConfig(text, file);
}

/** Looks a task up by `Name@Version`, then by bare name. */
export function taskOverride(config: LocalConfig, name: string, version: string): TaskOverride | undefined {
  const wanted = [`${name}@${version}`.toLowerCase(), name.toLowerCase()];
  for (const want of wanted) {
    const key = Object.keys(config.tasks).find((k) => k.toLowerCase() === want);
    if (key) return config.tasks[key];
  }
  return undefined;
}
