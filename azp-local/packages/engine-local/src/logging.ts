// Logging commands: lines of the form `##vso[area.action key=value;key=value]data`
// that a step writes to its output to talk back to the agent.

export interface LoggingCommand {
  area: string;
  action: string;
  properties: Record<string, string>;
  data: string;
}

function unescapeValue(value: string): string {
  return value.replace(/%3B/gi, ';').replace(/%0D/gi, '\r').replace(/%0A/gi, '\n').replace(/%5D/gi, ']').replace(/%25/g, '%');
}

export function parseLoggingCommand(line: string): LoggingCommand | undefined {
  const start = line.indexOf('##vso[');
  if (start < 0) return undefined;
  const end = line.indexOf(']', start);
  if (end < 0) return undefined;
  const head = line.slice(start + 6, end);
  const space = head.indexOf(' ');
  const name = space < 0 ? head : head.slice(0, space);
  const dot = name.indexOf('.');
  if (dot <= 0) return undefined;
  const properties: Record<string, string> = {};
  if (space >= 0) {
    for (const pair of head.slice(space + 1).split(';')) {
      const eq = pair.indexOf('=');
      if (eq > 0) properties[pair.slice(0, eq).trim().toLowerCase()] = unescapeValue(pair.slice(eq + 1));
    }
  }
  return { area: name.slice(0, dot).toLowerCase(), action: name.slice(dot + 1).toLowerCase(), properties, data: unescapeValue(line.slice(end + 1)) };
}

/** `##[error]text`, `##[warning]text`, `##[group]name` and the rest of the formatting commands. */
export function parseFormatCommand(line: string): { kind: string; text: string } | undefined {
  const m = /^\s*##\[(group|endgroup|section|command|debug|error|warning)\](.*)$/.exec(line);
  return m ? { kind: m[1], text: m[2] } : undefined;
}

/** Replaces every known secret value with ***. Longer secrets first, so one cannot expose part of another. */
export function maskSecrets(line: string, secrets: string[]): string {
  if (secrets.length === 0) return line;
  let out = line;
  for (const secret of [...secrets].sort((a, b) => b.length - a.length)) {
    if (secret.length >= 1 && out.includes(secret)) out = out.split(secret).join('***');
  }
  return out;
}

/** Splits a byte stream into lines, holding back an unfinished last line. */
export class LineSplitter {
  private pending = '';

  constructor(private readonly onLine: (line: string) => void) {}

  push(chunk: Buffer | string): void {
    this.pending += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    let index: number;
    while ((index = this.pending.indexOf('\n')) >= 0) {
      this.onLine(this.pending.slice(0, index).replace(/\r$/, ''));
      this.pending = this.pending.slice(index + 1);
    }
  }

  flush(): void {
    if (this.pending.length > 0) this.onLine(this.pending.replace(/\r$/, ''));
    this.pending = '';
  }
}
