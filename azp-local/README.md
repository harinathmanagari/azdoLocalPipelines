# azp-local: Azure Pipelines Local Runner

Draws any Azure Pipelines YAML file as the Azure DevOps portal does, and runs its jobs on your machine. A core library with two front ends: a VS Code extension and a command line.

This repository is the tool. It knows nothing about any application; the sample application it is tried on lives beside it in [`../demo-app`](../demo-app).

Design: [`../local-azure-pipelines-runner-design.md`](../local-azure-pipelines-runner-design.md). This is the first build of phases 1 to 3 (see, run, widen). Phase 4 (connecting to an Azure DevOps organisation) is not built.

## Layout

```
packages/
  core/          model, expressions, template expansion, planner, engine contract, run store (no vscode import)
  engine-local/  Docker Engine API client, job backends, step runner, logging commands, tier 1 tasks
  cli/           azp-local: graph, expand, run, doctor, runs
  vscode/        the extension: tree views, graph webview, logs, CodeLens, diagnostics, tasks
  images/        Dockerfile of the slim ubuntu agent image
corpus/          pipelines from other ecosystems with their recorded expansions
scripts/         build (esbuild) and a static server for the graph harness
```

## Build and test

```bash
npm install
```

```bash
npm run build
```

```bash
npm test
```

```bash
npm run test:extension
```

- `npm test` runs the unit and engine tests (Vitest). The engine tests run real pipelines in host mode, so they need no Docker.
- `npm run test:extension` runs the integration tests inside a real VS Code with the demo application open, using throwaway profile folders.
- `npm run package` builds `packages/vscode/azp-local-0.1.0.vsix`.

## Try it

The command line, against the demo application:

```bash
node packages/cli/bin/azp-local.cjs graph -C ../demo-app
```

```bash
node packages/cli/bin/azp-local.cjs doctor -C ../demo-app
```

```bash
node packages/cli/bin/azp-local.cjs run -C ../demo-app --job lint
```

The extension: open this folder in VS Code and press F5 (*Run extension (demo app)*), or install the packaged VSIX:

```bash
code --install-extension packages/vscode/azp-local-0.1.0.vsix
```

## Command line

```
azp-local graph  [file]            stages, jobs and steps, as text or --json
azp-local expand [file]            the YAML after template expansion
azp-local run    [file] [options]  --stage, --from-stage, --job, --step job:step, --rerun-failed
azp-local doctor                   Docker, images, disk, and what needs a decision
azp-local runs                     past local runs
```

`azp-local run` exits 0 on success, 1 on failure, 3 when everything that ran passed but something could not run locally (`--allow-gaps` turns that into 0), and 130 when canceled.

Secrets for variable groups come from `AZP_SECRET_<NAME>` environment variables, a `--secrets` file kept outside the repository, or a prompt.

## What is built, against the design

| Design area | State |
| --- | --- |
| Model: shorthand forms, templates for stages/jobs/steps/variables, `extends`, templates from other repositories, matrix, `parallel`, `dependsOn`, conditions, variables at every level, variable groups, deployment jobs (`runOnce`, `rolling`, `canary` flattened) | Built |
| Expressions: literals, contexts, `a.b`, `a['b']`, `a.*.b`, the function table, status functions, `if` / `elseif` / `else`, `each`, `insert` | Built. Anything else is a diagnostic naming the construct |
| Source positions through expansion, with the include chain (D2) | Built |
| Planner: whole pipeline, stage, "from here", job, step, re-run failed; reuse of earlier results | Built |
| Local engine: container per job, exec per step, logging commands, step controls, output variables across jobs and stages, artifacts, `Cache@2`, service containers, container jobs, cancellation, timeouts, retries | Built. Tested in host mode and against a stand-in Docker daemon, and run in real containers on one setup; see "Not yet verified" |
| Tier 1 tasks: script family, `checkout`, `download`, `publish`, `Cache@2`, `UseNode@1`, `NodeTool@0`, pipeline/build artifact tasks, `PublishTestResults@2` (JUnit), `PublishCodeCoverageResults` (Cobertura, lcov) | Built |
| Tier 2: a task's own Node handler | From a folder mapped in `.azp-local.yml`. Downloading packages from an organisation is phase 4 |
| Tier 3 and D6: unsupported steps drawn as such, job "succeeded with gaps", summary lists them | Built |
| Windows host mode, opt-in | Built and run end to end on Windows 10 |
| `.azp-local.yml`, Doctor | Built |
| Extension: tree, graph, step logs, run summary, history, CodeLens, diagnostics, Testing API, task provider, Workspace Trust, secret storage | Built |
| Azure DevOps engine (option A), sign-in, Preview API comparison, variable group import | Not built (phase 4) |

### Not yet verified

- **Runs in real containers on other setups.** `packages/images/ubuntu/Dockerfile` has been built and the whole demo pipeline run in real containers from the command line, on Windows 10 with Rancher Desktop (dockerd): six Linux jobs, 14 of 14 tests, 100% line coverage, ending as *succeeded with gaps*. The container path has not been run on macOS, Linux, Docker Desktop or Podman. The extension has run the whole demo pipeline in a real VS Code window, driven by scripted clicks rather than by a person.
- **Expansion against Azure DevOps.** The recorded expansions in `corpus/expected` come from this expander and were read through by hand. The design's oracle is the Preview API, which needs an organisation.
- **How the agent passes inputs to tasks** (design section 7) is implemented as described there (`INPUT_<NAME>` environment variables, `##vso` commands on standard output) and exercised with the demo's in-house task. It has not been checked against a Microsoft task package.

### Known limits

- `${{ variables.x }}` in a template expression sees pipeline-level and predefined variables, not stage- or job-level ones.
- A matrix computed at run time (`matrix: $[ ... ]`) is shown as a single leg.
- `PublishTestResults@2` reads JUnit only; other formats are reported as not run.
- Doctor does not yet list commands a pipeline calls that the image lacks.
- Reusing an earlier job result does not check whether the YAML changed since.
- Multi-root workspaces are handled per folder; one run at a time.
