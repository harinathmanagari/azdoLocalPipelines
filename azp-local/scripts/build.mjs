// Bundles the command line and the VS Code extension. The core and the engine are
// plain TypeScript packages; both front ends are thin shells bundled over them.
import { build, context } from 'esbuild';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');
const pkg = (...parts) => join(root, 'packages', ...parts);

const common = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  logLevel: 'info',
  alias: {
    '@azp-local/core': pkg('core', 'src', 'index.ts'),
    '@azp-local/engine-local': pkg('engine-local', 'src', 'index.ts'),
  },
};

const targets = [
  { ...common, entryPoints: [pkg('cli', 'src', 'main.ts')], outfile: pkg('cli', 'dist', 'azp-local.cjs'), format: 'cjs' },
];

if (existsSync(pkg('vscode', 'src', 'extension.ts'))) {
  targets.push(
    { ...common, entryPoints: [pkg('vscode', 'src', 'extension.ts')], outfile: pkg('vscode', 'dist', 'extension.js'), format: 'cjs', external: ['vscode'] },
    {
      entryPoints: [pkg('vscode', 'src', 'webview', 'graph.ts')],
      outfile: pkg('vscode', 'media', 'graph.js'),
      bundle: true,
      platform: 'browser',
      target: 'es2022',
      format: 'iife',
      sourcemap: false,
      logLevel: 'info',
    },
  );
}

// Agent images are data: ship the Dockerfiles next to each front end.
for (const front of ['cli', 'vscode']) {
  if (!existsSync(pkg(front))) continue;
  const dest = pkg(front, 'dist', 'images');
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(pkg('images'), dest, { recursive: true });
}

if (watch) {
  for (const target of targets) await (await context(target)).watch();
} else {
  await Promise.all(targets.map((target) => build(target)));
}
