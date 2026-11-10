# Azure Pipelines Local Runner

Draws any Azure Pipelines YAML file as the Azure DevOps portal does, and runs its jobs on your machine: one Docker container per job, one process per step. It works offline, with no Azure DevOps account, on the file as it is in your editor.

It complements Microsoft's [Azure Pipelines](https://marketplace.visualstudio.com/items?itemName=ms-azure-devops.azure-pipelines) extension, which provides syntax highlighting, schema validation and IntelliSense.

## What you get

| | |
| --- | --- |
| **Pipelines view** | Every pipeline file in the workspace, with its stages, jobs and steps. Status icons and durations after a run. |
| **Graph** | Stages as columns, jobs as cards with their matrix legs, arrows for `dependsOn`, badges for conditions and task tiers. Live while running. |
| **Step logs** | Read-only documents with timestamps, folding `##[group]` sections, and file references that link to your source. |
| **Run summary** | Result, duration, test results, coverage, artifacts, uploaded summaries, and the list of what did not run as it would on Azure DevOps. |
| **Runs view** | Past local runs. Opening one restores its graph and logs. |
| **In the editor** | *Run pipeline / stage / job* and *Show in graph* above stages and jobs. Expansion errors and failed steps as diagnostics. |
| **Testing view** | JUnit results published by a step appear as test results, linked to source. |

## Commands

All under **Pipelines (local)** in the Command Palette:

- *Show pipeline graph*, *Expand to final YAML*
- *Run pipeline*, *Re-run failed jobs*, *Cancel run*. Run stage, run job and *Run step and those before it* are on the tree, the graph and CodeLens.
- *Set parameters and variables for this run*, *Manage secrets*
- *Doctor*: checks Docker, images and disk, and lists what a pipeline uses that needs a decision.

A run can also be a VS Code task:

```jsonc
{ "type": "azp-local", "pipeline": "azure-pipelines.yml", "job": "build", "label": "pipeline: build" }
```

## How a local run differs from Azure DevOps

A local pass means the steps work here. It does not satisfy a branch policy, and it does not prove the run passes on Azure DevOps.

- **The image is not the hosted image.** `ubuntu-*` pools run in a slim Ubuntu container the extension builds on first use (git, curl, Node.js, Python, PowerShell, Docker CLI). Pipelines that install their own tools are unaffected. Map another image in `.azp-local.yml`.
- **Tasks come in three tiers**, shown before anything runs. Tier 1 is built in: `script`, `bash`, `pwsh`, `powershell`, `checkout`, `download`, `publish`, `Cache@2`, `UseNode@1`, `NodeTool@0`, pipeline and build artifact tasks, `PublishTestResults@2` (JUnit), `PublishCodeCoverageResults`. Tier 2 runs a task's own Node handler from a folder you map. Tier 3 needs a service connection and cannot run locally.
- **A step that could not run is never counted as passed.** It is drawn in its own state, the job ends *succeeded with gaps*, and the summary lists it.
- **Windows jobs** run only in host mode (directly on a Windows machine, not isolated), and only when you opt in. **macOS jobs** do not run.
- **Triggers, approvals, checks and environments** are shown, not enforced.
- **Templates are expanded locally.** A construct the expander does not cover is an error on the line that uses it, never a guess.

## Configuration

A self-contained pipeline needs none. Anything specific to a repository goes in one optional file at its root, `.azp-local.yml`:

```yaml
images:                    # pool or vmImage label -> container image, or "host"
  windows-2025: host
  MyOnPremPool: ghcr.io/acme/onprem-agent:latest
repositories:              # resources.repositories alias -> local folder
  templates: ../shared-pipeline-templates
parameters:                # values for template parameters
  environment: dev
variables:                 # variables and predefined-variable overrides
  Build.Reason: PullRequest
variableGroups:
  release-settings:
    region: westeurope
    apiKey: { secret: true }   # prompted for, kept in the OS keychain
tasks:                     # tasks that cannot run locally
  AzureWebApp@1: skip
  AzureCLI@2: { script: ./ci/local/azure-cli-stub.sh }
  MyCompanyTask@3: { path: ../tasks/MyCompanyTask }
workspace: copy            # copy (default) | mount
```

Personal preferences are VS Code settings: `azpLocal.maxParallelJobs`, `azpLocal.keepContainersOnFailure`, `azpLocal.matchHostedHardware`, `azpLocal.dockerHost`, `azpLocal.codeLens`.

## Security

Running a pipeline executes code from the repository.

- Nothing runs in an untrusted workspace; only the graph is drawn.
- A job gets a **copy** of the files git tracks plus untracked files that are not ignored. Ignored files such as `.env` are not copied, and steps cannot change your working tree.
- Containers get no credentials: no Docker socket, no host network, no home directory.
- Secrets live in VS Code's secret storage, reach a step only through its `env:`, and are masked in logs.
- Host mode has no isolation. It is off unless `.azp-local.yml` maps a pool to `host`.
- **Settings that weaken isolation are asked about before a run.** `.azp-local.yml` is part of the repository, so anyone who can change the repository can change it. Before a run that maps a pool to `host`, sets `dockerSocket: true` or `workspace: mount`, or copies a folder or script from outside the repository (`repositories:`, `tasks:`), you are shown exactly what it allows and asked. "Allow for this repository" is kept in VS Code's own storage, never in the repository, and is asked again as soon as any of those settings change. The CLI asks in a terminal, keeps approvals in `~/.azp-local`, and elsewhere refuses such a run unless `--allow-unisolated` is passed.
- Artifact names are a single folder name: a name with a path separator, `..` or a drive letter is refused, so a step cannot read or write host files through it.

## Requirements

- Docker Desktop, Rancher Desktop (dockerd engine) or Podman's Docker-compatible socket, for running container jobs. The graph and expansion work without it.
- No telemetry is collected.
