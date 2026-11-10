// Runs the extension's integration tests in a real VS Code, against the demo
// application. The instance uses throwaway user-data and extensions folders, so it
// does not touch your own VS Code profile.
//   npm run test:extension            (from the repository root)
//   VSCODE_EXECUTABLE=/path/to/code   to choose the VS Code to use; otherwise the
//                                     installed one is used, or one is downloaded.
import { runTests } from '@vscode/test-electron';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const extensionDevelopmentPath = resolve(here, '..');
const workspace = resolve(process.env.AZP_TEST_WORKSPACE ?? join(here, '..', '..', '..', '..', 'demo-app'));

const installed = [
  process.env.VSCODE_EXECUTABLE,
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe'),
  process.env.ProgramFiles && join(process.env.ProgramFiles, 'Microsoft VS Code', 'Code.exe'),
  '/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
  '/usr/share/code/code',
].find((candidate) => candidate && existsSync(candidate));

const scratch = mkdtempSync(join(tmpdir(), 'azpl-vscode-'));
let failed = false;
try {
  await runTests({
    vscodeExecutablePath: installed,
    extensionDevelopmentPath,
    extensionTestsPath: join(here, 'suite', 'index.cjs'),
    launchArgs: [
      workspace,
      '--disable-extensions',
      '--disable-workspace-trust',
      '--skip-welcome',
      '--skip-release-notes',
      '--user-data-dir',
      join(scratch, 'user'),
      '--extensions-dir',
      join(scratch, 'extensions'),
    ],
  });
} catch (err) {
  failed = true;
  console.error(err?.message ?? err);
} finally {
  try {
    rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch {
    /* VS Code can still hold a file for a moment after exit */
  }
}
process.exit(failed ? 1 : 0);
