# Pipeline Pulse (demo application)

A small React + Vite + TypeScript frontend: a table of recent pipeline runs with a status filter, a search box and summary figures. It exists to give the Azure Pipelines Local Runner in [`../azp-local`](../azp-local) a realistic pipeline to draw and run. The application knows nothing about the tool, and the tool knows nothing about the application.

## The application

```bash
npm install
```

```bash
npm run dev
```

| Script | Does |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (14 tests) |
| `npm run test:ci` | Vitest with a JUnit report in `test-results/` |
| `npm run test:coverage` | The same, plus Cobertura and lcov in `coverage/` |
| `npm run build` | Production bundle in `dist/` |

## The pipeline

[`azure-pipelines.yml`](azure-pipelines.yml) is an ordinary Azure Pipelines definition. Nothing in it is there for the local runner.

| Stage | Job | Exercises |
| --- | --- | --- |
| Validate | `lint` | A steps template with a parameter, `UseNode@1`, `Cache@2`, `${{ each }}` over an object parameter |
| Validate | `test` (3 matrix legs) | A matrix with a leg added by `${{ if }}`, a pool taken from a matrix variable, step conditions, `PublishTestResults@2`, `PublishCodeCoverageResults@2` |
| Build | `build` | An output variable, a logging command, step `env:`, an in-house task (`BundleSizeReport@1`), `publish` |
| Build | `release_notes` | `dependsOn`, a runtime expression over another job's output, `checkout: none`, `download`, `task.uploadsummary` |
| Deploy | `deploy_web` | A stage condition, a deployment job with an environment, a variable group with a secret, `stageDependencies`, a task that needs Azure (`AzureStaticWebApp@0`) |

Also in the file: a `name:` run-number format, CI, PR and scheduled triggers, typed parameters with allowed values, and a variables template.

## Local-run settings

[`.azp-local.yml`](.azp-local.yml) is the only file here that concerns the local runner. It makes four decisions:

- `windows-2025` runs in host mode (on this machine, not isolated). Remove the line and that leg is reported as not runnable.
- The variable group `demo-release-settings` gets a local `region` and a secret `deployToken`, which is prompted for and never stored in the repository.
- `BundleSizeReport@1` runs its real code from [`ci/tasks/BundleSizeReport`](ci/tasks/BundleSizeReport).
- `AzureStaticWebApp@0` is replaced by [`ci/local/deploy-stub.sh`](ci/local/deploy-stub.sh), which checks the artifact and deploys nothing. The run reports this as a gap.

## Try it

With the command line built in `../azp-local`:

```bash
node ../azp-local/packages/cli/bin/azp-local.cjs graph
```

```bash
node ../azp-local/packages/cli/bin/azp-local.cjs run --job test.windows_node22
```

```bash
node ../azp-local/packages/cli/bin/azp-local.cjs run
```

The first needs nothing. The second runs in host mode on Windows and needs no Docker. The third runs every stage and needs a Docker daemon for the Linux jobs.
