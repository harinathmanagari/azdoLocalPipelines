// Integration tests, run inside the VS Code extension host with the demo application
// open (see ../run.mjs). No test framework: each check is a named async function.
const assert = require('node:assert');
const path = require('node:path');
const vscode = require('vscode');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(what, probe, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await probe();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`);
    await sleep(150);
  }
}

exports.run = async function run() {
  const extension = vscode.extensions.getExtension('azp-local.azp-local');
  assert.ok(extension, 'the extension is present');
  const api = await extension.activate();
  const results = [];
  const check = async (name, body) => {
    try {
      await body();
      results.push(`  ok    ${name}`);
    } catch (err) {
      results.push(`  FAIL  ${name}\n        ${String(err && err.message).split('\n').join('\n        ')}`);
    }
  };

  const entry = await until('the pipeline to be discovered', () => api.model.entries()[0]);
  const folder = entry.folder;
  const document = await vscode.workspace.openTextDocument(entry.file);
  await vscode.window.showTextDocument(document);

  await check('finds the pipeline by content and its templates by reference', async () => {
    assert.deepStrictEqual(api.model.entries().map((e) => path.basename(e.file)), ['azure-pipelines.yml']);
    assert.deepStrictEqual(folder.templates.map((t) => path.basename(t)).sort(), ['install.yml', 'variables.yml']);
    assert.deepStrictEqual(entry.loaded.pipeline.diagnostics, []);
    assert.strictEqual(folder.config.diagnostics.length, 0);
  });

  await check('contributes its commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    for (const { command } of extension.packageJSON.contributes.commands) assert.ok(commands.includes(command), `${command} is registered`);
  });

  await check('offers CodeLens above stages and jobs', async () => {
    const lenses = await until('CodeLens', async () => {
      const found = await vscode.commands.executeCommand('vscode.executeCodeLensProvider', document.uri);
      return found && found.length ? found : undefined;
    });
    const titles = lenses.map((lens) => lens.command && lens.command.title);
    for (const wanted of ['$(play) Run pipeline', '$(play) Run stage', 'Run from here', '$(play) Run job', '$(play) Run job (3 legs)', 'Show in graph']) {
      assert.ok(titles.includes(wanted), `a '${wanted}' lens exists (found: ${[...new Set(titles)].join(', ')})`);
    }
    const stageLine = document.getText().split(/\r?\n/).findIndex((line) => line.includes('- stage: Build'));
    assert.ok(lenses.some((lens) => lens.range.start.line === stageLine && lens.command.command === 'azpLocal.runStage'), 'Run stage sits on the stage line');
  });

  await check('offers the pipeline, its graph and the include line on a template', async () => {
    const template = path.join(folder.root, 'ci', 'templates', 'install.yml');
    assert.deepStrictEqual(api.model.pipelinesOf(template).map((e) => e.file), [entry.file]);
    const templateDoc = await vscode.workspace.openTextDocument(template);
    await vscode.window.showTextDocument(templateDoc);
    try {
      const lenses = await until('CodeLens on the template', async () => {
        const found = await vscode.commands.executeCommand('vscode.executeCodeLensProvider', templateDoc.uri);
        return found && found.length ? found : undefined;
      });
      const byTitle = new Map(lenses.map((lens) => [lens.command && lens.command.title, lens.command]));
      for (const wanted of ['$(references) Template of azure-pipelines.yml', '$(type-hierarchy-sub) Show graph', '$(play) Run pipeline']) {
        assert.ok(byTitle.has(wanted), `a '${wanted}' lens exists (found: ${[...byTitle.keys()].join(', ')})`);
      }
      assert.strictEqual(byTitle.get('$(type-hierarchy-sub) Show graph').arguments[1], 'Validate.lint', 'the graph focuses the first job that uses the template');
      assert.strictEqual(api.model.current() && api.model.current().file, entry.file, 'commands run from the template act on its pipeline');

      const back = byTitle.get('$(references) Template of azure-pipelines.yml');
      await vscode.commands.executeCommand(back.command, ...back.arguments);
      const editor = await until('the pipeline to open', () => {
        const active = vscode.window.activeTextEditor;
        return active && active.document.uri.fsPath.toLowerCase() === entry.file.toLowerCase() ? active : undefined;
      });
      assert.match(editor.document.lineAt(editor.selection.active.line).text, /- template: ci\/templates\/install\.yml/);
    } finally {
      await vscode.window.showTextDocument(document);
    }
  });

  await check('reports an expansion error from unsaved text, on the line that caused it', async () => {
    const text = document.getText();
    const offset = text.indexOf('ci/templates/install.yml');
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(document.positionAt(offset), document.positionAt(offset + 'ci/templates/install.yml'.length)), 'ci/templates/missing.yml');
    await vscode.workspace.applyEdit(edit);
    try {
      const diagnostics = await until('a diagnostic', () => {
        const found = vscode.languages.getDiagnostics(document.uri).filter((d) => d.source === 'Pipelines (local)');
        return found.length ? found : undefined;
      });
      assert.match(diagnostics[0].message, /File not found: .*missing\.yml/);
      assert.strictEqual(diagnostics[0].range.start.line, document.positionAt(offset).line);
      assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);

      // The error is also offered at the top of the file, where it opens the list of what to fix.
      const errorLens = (lenses) => lenses && lenses.find((lens) => lens.command && /^\$\(error\) \d+ errors?$/.test(lens.command.title));
      const lens = await until('the error CodeLens', async () => errorLens(await vscode.commands.executeCommand('vscode.executeCodeLensProvider', document.uri)));
      assert.strictEqual(lens.command.title, '$(error) 1 error');
      assert.strictEqual(lens.command.command, 'azpLocal.showGraph');
      assert.strictEqual(lens.range.start.line, 0);
    } finally {
      await vscode.commands.executeCommand('workbench.action.files.revert');
      await until('the diagnostics to clear', () => vscode.languages.getDiagnostics(document.uri).filter((d) => d.source === 'Pipelines (local)').length === 0);
    }
    const lenses = await vscode.commands.executeCommand('vscode.executeCodeLensProvider', document.uri);
    assert.ok(!lenses.some((lens) => lens.command && /^\$\(error\)/.test(lens.command.title)), 'the error CodeLens is gone once the file is fixed');
  });

  await check('expands to final YAML in a read-only document', async () => {
    await vscode.commands.executeCommand('azpLocal.expand', entry.file);
    const expanded = await until('the expanded document', () => vscode.workspace.textDocuments.find((d) => d.uri.scheme === 'azp-expanded'));
    assert.ok(!expanded.getText().includes('${{'), 'no template expressions are left');
    assert.ok(expanded.getText().includes('windows_node22'), 'the matrix leg added by ${{ if }} is there');
    assert.strictEqual(expanded.languageId, 'yaml');
  });

  await check('opens the graph in a webview panel', async () => {
    await vscode.commands.executeCommand('azpLocal.showGraph', entry.file);
    await until('the graph tab', () => vscode.window.tabGroups.all.flatMap((g) => g.tabs).find((tab) => tab.label === 'Graph: azure-pipelines.yml'));
  });

  await check('runs a job up to a step and shows its state, log and history', async () => {
    // The Windows leg runs in host mode (see the demo's .azp-local.yml), so this needs no Docker.
    // Stopping after Checkout keeps it quick: Initialize job and Checkout really run.
    const job = entry.loaded.pipeline.stages[0].jobs.find((j) => j.matrixLeg && j.matrixLeg.name === 'windows_node22');
    if (process.platform !== 'win32') return;
    const result = await api.runs.start(entry, { kind: 'step', jobId: job.id, stepId: 'checkout' });
    assert.strictEqual(result, 'succeeded');
    const shown = api.runs.shown;
    assert.strictEqual(shown.live, false);
    const view = shown.view.jobs.get(job.id);
    assert.strictEqual(view.state, 'succeeded');
    assert.deepStrictEqual(view.steps.slice(0, 3).map((s) => [s.id, s.state]), [['__init', 'succeeded'], ['checkout', 'succeeded'], ['step1', 'skipped']]);
    assert.strictEqual(shown.view.jobs.get('Validate.lint').state, 'omitted');

    await vscode.commands.executeCommand('azpLocal.openLog', { jobId: job.id, stepId: 'checkout' });
    const log = await until('the log document', () => vscode.workspace.textDocuments.find((d) => d.uri.scheme === 'azp-log'));
    assert.match(log.getText(), /Copying \d+ files/);
    assert.ok(!log.getText().includes('node_modules'), 'ignored files were not copied');
    assert.strictEqual(log.languageId, 'azp-log');

    const runs = folder.store.listRuns();
    assert.strictEqual(runs.length, 1);
    assert.strictEqual(runs[0].result, 'succeeded');
    assert.deepStrictEqual(runs[0].selection, { kind: 'step', jobId: job.id, stepId: 'checkout' });
  });

  await check('refuses to run a pipeline that has errors', async () => {
    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, new vscode.Position(document.lineCount, 0), '\n${{ if frobnicate() }}:\n  x: 1\n');
    await vscode.workspace.applyEdit(edit);
    try {
      const before = folder.store.listRuns().length;
      const result = await api.runs.start(entry, { kind: 'pipeline' });
      assert.strictEqual(result, undefined);
      assert.strictEqual(folder.store.listRuns().length, before);
    } finally {
      await vscode.window.showTextDocument(document);
      await vscode.commands.executeCommand('workbench.action.files.revert');
    }
  });

  console.log(`\nExtension integration tests\n${results.join('\n')}\n`);
  const failures = results.filter((line) => line.includes('FAIL')).length;
  if (failures) throw new Error(`${failures} of ${results.length} checks failed`);
};
