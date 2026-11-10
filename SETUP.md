# Setup guide

How to build the Azure Pipelines Local Runner, install its VS Code extension, and run the demo application's pipeline on your machine. Follow the steps in order; each one says what you should see when it worked.

Paths are relative to the folder that holds this file. Commands work in PowerShell and in bash.

| Part | Steps | Needs Docker |
| --- | --- | --- |
| A. Build and install | 1 to 5 | No |
| B. First run with the demo app | 6 to 12 | Only from step 10 |
| C. Command line | 13 | Only for Linux jobs |
| D. Your own repository | 14 | Only for Linux jobs |

> **State of this build.** Building, testing and packaging (steps 2 to 4) have been run as written on Windows 10, apart from the install command itself. The extension has been exercised inside VS Code by its automated tests, not yet by hand. The Windows job of step 9 has run end to end from the command line. Steps 10 and 11 run jobs in real containers. The whole demo pipeline (all six Linux jobs) has been run that way from the command line on Windows 10 with Rancher Desktop (dockerd): the agent image built, 14 of 14 tests passed, and the run ended as *succeeded with gaps*. It has not been done from the extension by hand, nor on macOS, Linux, Docker Desktop or Podman, so expect first-run problems there and see [Troubleshooting](#troubleshooting).

---

## Part A. Build and install

### Step 1. Check what you need

| Tool | Version | Needed for | Check |
| --- | --- | --- | --- |
| Node.js | 22.13 or newer | Building the tool, the command line | `node --version` |
| npm | Comes with Node.js | Installing dependencies | `npm --version` |
| VS Code | 1.96 or newer | The extension | `code --version` |
| A Docker engine | Any recent | Running Linux jobs (step 10 onward) | `docker version` |
| Git for Windows | Any recent | `bash:` steps in Windows host mode | `git --version` |

Docker can be Docker Desktop, Rancher Desktop with the **dockerd (moby)** engine, or Podman with its Docker-compatible socket. On Windows it needs WSL 2. You do not need Docker for the graph, the expanded YAML, Doctor, or the Windows test leg.

No Azure DevOps account is needed for anything in this guide.

### Step 2. Build the tool

```bash
cd azp-local
```

```bash
npm install
```

```bash
npm run build
```

**You should see** three bundles reported, with no errors and sizes close to these:

```
packages\vscode\media\graph.js        21.2kb
packages\cli\dist\azp-local.cjs      804.0kb
packages\vscode\dist\extension.js    846.0kb
```

npm may warn that `esbuild` and `@vscode/vsce-sign` have install scripts "not yet covered by allowScripts". The build and the packaging work without them; you can ignore the warning.

### Step 3. Run the tests (optional)

```bash
npm test
```

**You should see** `Tests  163 passed`. These run real pipelines in host mode and need no Docker. One test, *says how to fix it when no daemon answers*, fails while Docker is running, because the client then finds the daemon by itself; stop Docker or ignore that one.

```bash
npm run test:extension
```

**You should see** nine lines starting with `ok`. This opens a VS Code window for about half a minute with a throwaway profile; your own VS Code settings and extensions are not touched.

### Step 4. Install the extension

Package it:

```bash
npm run package
```

**You should see** `DONE  Packaged: ...\packages\vscode\azp-local-0.1.0.vsix`.

Install it:

```bash
code --install-extension packages/vscode/azp-local-0.1.0.vsix --force
```

`--force` replaces an earlier install of the same version; without it a rebuilt VSIX is not installed. If the `code` command is not on your PATH, do it from inside VS Code instead: open the Extensions view, choose **…** at its top right, then **Install from VSIX…**, and pick the file.

**You should see** *Azure Pipelines Local Runner* in the Extensions view. Reload any VS Code window that was already open.

To try the extension without installing it, open the `azp-local` folder in VS Code and press **F5** (*Run extension (demo app)*). A second window opens with the extension loaded and the demo app as its workspace.

### Step 5. Start Docker (for Linux jobs)

Skip this step if you only want the graph and the Windows leg for now.

1. Start Docker Desktop or Rancher Desktop.
2. In Rancher Desktop, open **Preferences → Container Engine** and choose **dockerd (moby)**. The containerd option does not provide the Docker API the tool uses.
3. Wait until it reports that it is running, then check:

```bash
docker version
```

**You should see** a `Server:` section under the `Client:` section. If you see only `Client:` and a line beginning `failed to connect`, the daemon is not running yet.

---

## Part B. First run with the demo app

### Step 6. Open the demo app

```bash
code demo-app
```

When VS Code asks whether you trust the authors of the files, choose **Yes, I trust the authors**. Without trust the extension draws the graph but refuses to run anything, because running a pipeline executes code from the repository.

**You should see** a new icon in the activity bar, three small boxes joined by lines, titled **Pipelines (local)**.

### Step 7. Look at the pipeline

1. Click the **Pipelines (local)** icon. The **Pipelines** view lists `azure-pipelines.yml` with its stages **Validate**, **Build** and **Deploy (staging)**. Expand them to see jobs and steps.
2. Hover over `azure-pipelines.yml` in that view and click **Show pipeline graph**.
3. Open `azure-pipelines.yml` in the editor. Above the first line, and above each stage and job, there are links such as **Run pipeline**, **Run stage**, **Run job** and **Show in graph**.
4. Click **Expand to final YAML** above the first line.

**You should see:**

- The graph: three columns joined by arrows. **Unit tests** is drawn as one box holding three legs. The `windows_node22` leg carries a *host, not isolated* badge, **Production build** a *tier 2* badge, and **Deploy static site** a *tier 3* badge.
- The expanded YAML: one document with no `${{ }}` and no `template:` left in it.

Nothing has run yet. All of this works without Docker.

### What is checked

The extension reads every pipeline and template as you type, saved or not, and reports problems on the line that causes them (editor squiggles, the **Problems** view, and an *N errors* link at the top of the file that opens the list in the graph panel).

| Reported as an error, so the graph waits | Reported as a warning, the graph is still drawn |
| --- | --- |
| YAML that cannot be read; a key written twice | A key that Azure Pipelines has no use for in that place, such as `displayname` or `dependOn`, with the one it looks like |
| A template that is missing, or a required parameter that is not given | A job with no steps, or a stage with no jobs |
| A `dependsOn` that names nothing, or jobs or stages that wait for each other in a loop | A task without a version |
| A `condition:` that is not a valid expression | |
| A step name used twice in a job; a step that is no step | |

A file called `azure-pipelines.yml` (or `azure-pipelines-*.yml`, `vsts-ci.yml`) is always treated as a pipeline, so if it is empty or has no `stages`, `jobs` or `steps` you are told so instead of the file being ignored.

### Step 8. Run Doctor

In the **Pipelines** view title bar, click the **Doctor** button (the pulse icon), or run **Pipelines (local): Doctor** from the Command Palette.

**You should see** a report in the Output panel. With Docker running it starts with `[ok] Docker ...`; without it, with `[fail] Docker is not reachable`. The rest is the same either way:

```
Pools
  [ok]   ubuntu-24.04 -> azp-local/agent-ubuntu:24.04 (6 jobs)
  [warn] windows-2025 -> host mode (1 job). Steps run on this machine without isolation.
Variable groups
  [ok]   demo-release-settings: 2 value(s), secrets prompted for: deployToken
Tasks
  [info] BundleSizeReport@1 (tier 2) -> task code in ./ci/tasks/BundleSizeReport
  [warn] AzureStaticWebApp@0 (tier 3) -> script ./ci/local/deploy-stub.sh. A replacement script runs instead of the real task.
```

The warnings are expected. They describe decisions the demo's `.azp-local.yml` already makes.

### Step 9. Run a job without Docker (Windows only)

The demo maps the `windows-2025` pool to host mode, so this leg runs directly on your machine in a scratch folder under your temp directory. It is not isolated.

1. In the **Pipelines** view, expand **Validate**.
2. Hover over **Unit tests windows_node22** and click **Run job** (the play icon).
3. Click any step while it runs to open its log.

**You should see** the job's icon spin, steps turn green one by one, and after two to three minutes on a first run a notification: *Local run of job test: succeeded*. The steps **Run unit tests with coverage** and **Publish coverage** are skipped on this leg; that is their condition, not a fault. The **Testing** view shows 14 passed tests.

The first run downloads Node.js 22 and the npm packages. Later runs reuse both.

On macOS or Linux this leg is shown as *not runnable locally*. Go to step 10.

### Step 10. Run a job in a container

Docker must be running (step 5).

1. In the **Pipelines** view, hover over **Lint and typecheck** and click **Run job**.
2. Click **Initialize job** to watch the log.

**You should see**, the first time only, the agent image `azp-local/agent-ubuntu:24.04` being built. That takes several minutes and needs internet access. Then the steps run: **Checkout**, **Use Node 22.x**, **Cache npm**, **Install dependencies**, **ESLint**, **Extra check: typecheck**.

The same job has run in a container from the command line (see the state of this build above), but not yet from the extension by hand. If it fails, the log of **Initialize job** or of the failing step says why; check [Troubleshooting](#troubleshooting).

### Step 11. Run the whole pipeline

1. Click **Run pipeline** next to `azure-pipelines.yml` in the **Pipelines** view, or **▶ Run pipeline** in the graph.
2. When the Deploy job starts you are asked for **Secret 'deployToken' of variable group 'demo-release-settings'**. Type any value, or leave it empty to run without it. A value you enter is kept in your operating system's keychain, never in the workspace.

**You should see** jobs run two at a time, stage by stage, and the run end as **succeeded with gaps**. The gap is intended: `AzureStaticWebApp@0` cannot run locally, so the demo's `.azp-local.yml` replaces it with a script that only checks the artifact. The tool never reports that as a plain pass.

### Step 12. Read the result

| Where | What it shows |
| --- | --- |
| Graph, below the stages | Result, duration, test totals, coverage, the `web` artifact, the release notes summary, and the list headed *Did not run as it would on Azure DevOps* |
| **Pipelines** view | A status icon and duration on every stage, job and step. Click a step for its log |
| **Runs** view | Every past local run. Click one to restore its graph and logs |
| **Testing** view | Published JUnit results, linked to the test files |
| **Problems** view | What is wrong in the YAML, and a failed step, each on the line that defines it |

Things to try next:

- **Re-run failed**, in the graph or the **Runs** view, runs only what did not pass and keeps the rest.
- Hover over a step in the **Pipelines** view and click **Run step and those before it** to stop a job part-way.
- **Parameters**, in the graph, changes pipeline parameters for local runs. Set `includeWindows` to `false` and the Windows leg disappears from the graph.
- Turn on the setting `azpLocal.keepContainersOnFailure`. A failed container job then keeps its container, and **Open a shell in the job container** appears on that job.

---

## Part C. Command line

### Step 13. Use `azp-local` in a terminal

The command line does everything the extension does. From the `azp-local` folder, after step 2:

```bash
node packages/cli/bin/azp-local.cjs graph -C ../demo-app
```

```bash
node packages/cli/bin/azp-local.cjs doctor -C ../demo-app
```

```bash
node packages/cli/bin/azp-local.cjs run -C ../demo-app --job test.windows_node22
```

```bash
node packages/cli/bin/azp-local.cjs run -C ../demo-app
```

**You should see**, for `graph`, the stages, jobs and steps as indented text; for `run`, live logs prefixed with the job name and a summary at the end.

| Option | Effect |
| --- | --- |
| `-C <dir>` | The repository to work on. Default: the current folder |
| `--stage <name>` / `--from-stage <name>` | Run one stage, or that stage and every later one |
| `--job <name>` | Run one job. `--job test.linux_node22` runs one matrix leg |
| `--step <job>:<step>` | Run a job up to and including a step |
| `--rerun-failed` | Run again what did not pass in the last run |
| `--param name=value`, `--var name=value` | Pipeline parameters and variables |
| `--yes` | Do not prompt |
| `--keep-on-failure` | Keep a failed job's container |

Secrets are read from `AZP_SECRET_<NAME>` environment variables (for the demo, `AZP_SECRET_DEPLOYTOKEN`), from a `--secrets <file>` kept outside the repository, or prompted for.

Exit codes: `0` passed, `1` failed, `3` passed but something could not run locally (`--allow-gaps` makes that `0`), `130` canceled.

---

## Part D. Your own repository

### Step 14. Adopt it in another repository

1. Open the repository in VS Code and trust it. Any YAML file with top-level `stages`, `jobs`, `steps` or `extends` appears in the **Pipelines** view, whatever it is called.
2. Run **Doctor**. It lists every pool, template repository, variable group and task that needs a decision.
3. Create `.azp-local.yml` in the repository root and answer those. All keys are optional:

```yaml
images:                    # pool or vmImage label -> container image, or "host"
  MyOnPremPool: ghcr.io/acme/onprem-agent:latest
repositories:              # resources.repositories alias -> local folder
  templates: ../shared-pipeline-templates
parameters:                # values for pipeline parameters
  environment: dev
variables:                 # variables and predefined-variable overrides
  Build.Reason: PullRequest
variableGroups:
  release-settings:
    region: westeurope
    apiKey: { secret: true }   # prompted for, kept in the keychain
tasks:                     # tasks that cannot run locally
  AzureWebApp@1: skip
  AzureCLI@2: { script: ./ci/local/azure-cli-stub.sh }
  MyCompanyTask@3: { path: ../tasks/MyCompanyTask }
```

4. Run **Doctor** again until nothing unexpected is left, then commit the file so that teammates get the same local behaviour.
5. Run a job.

A pipeline that uses only `ubuntu-*` pools, script steps and the built-in tasks needs no `.azp-local.yml` at all.

---

## Settings

Personal preferences are VS Code settings. Search for `azpLocal` in **Settings**.

| Setting | Default | Effect |
| --- | --- | --- |
| `azpLocal.maxParallelJobs` | `2` | Jobs that run at the same time |
| `azpLocal.keepContainersOnFailure` | `false` | Keep a failed job's container for a shell |
| `azpLocal.matchHostedHardware` | `false` | Limit containers to 2 CPUs and 7 GB, as hosted agents have |
| `azpLocal.dockerHost` | empty | Address of the Docker daemon. Empty finds it automatically |
| `azpLocal.codeLens` | `true` | Show the Run links above stages and jobs |

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| *Docker is not reachable* in **Initialize job** or Doctor | The daemon is not running. Start Docker Desktop or Rancher Desktop and repeat step 5. In Rancher Desktop the engine must be **dockerd (moby)** |
| Docker is running but still not found | Set `azpLocal.dockerHost`, for example `npipe:////./pipe/docker_engine` on Windows or `unix:///var/run/docker.sock` elsewhere. For the command line use `--docker-host` |
| Building `azp-local/agent-ubuntu` fails | The build downloads from Docker Hub, nodejs.org, packages.microsoft.com and download.docker.com. Check network access, or map the pool to an image you already have under `images:` in `.azp-local.yml` |
| *This workspace is not trusted* | Run **Workspaces: Manage Workspace Trust** and trust the folder |
| *The pipeline has N error(s), so nothing was run* | Open the graph, which lists the errors instead of drawing the pipeline, or the **Problems** view. Each error is on the line that causes it, and for templates it names the include chain |
| The graph shows a list of errors instead of the pipeline | The pipeline has errors, so the graph waits. Fix them in the editor, or click one to jump to it; the graph appears by itself when none are left. **Show graph anyway** draws what could be read, for an error that is really a construct the local expander does not cover |
| The **Pipelines** view is empty | The file is not shaped like a pipeline, or it is included by another file and so counts as a template. List it under `pipelines:` in `.azp-local.yml`, then click **Refresh** |
| A job shows *not runnable locally* | Its pool has no local stand-in. Windows and macOS pools run only when mapped to `host` on that operating system; self-hosted pools need an entry under `images:` |
| A step shows *not run locally* and the run ends *succeeded with gaps* | The task needs a service connection or has no package available. Decide in `.azp-local.yml` under `tasks:` whether to `skip` it, `fail` it, or replace it with a script |
| *Bash was not found on this machine* in host mode | Install Git for Windows. The `bash` that ships with Windows is the WSL launcher and cannot see Windows paths |
| A shell script fails with `\r: command not found` | The script has Windows line endings. Add a `.gitattributes` with `* text=auto eol=lf` and re-save the file. Inside a git repository with `core.autocrlf` on, the tool converts line endings itself |
| No **Run** links above stages and jobs | Check the setting `azpLocal.codeLens`, and that the file is listed in the **Pipelines** view. A template has links when a listed pipeline includes it: they name that pipeline, open the line that includes the template, and show its graph |
| The secret prompt does not come back | A stored value is reused. Change or clear it with **Pipelines (local): Manage secrets** |
| A second run does not start | Only one run at a time. Cancel the current one with **Cancel run** |
| `npm install` warns about `allowScripts` | Harmless here; see step 2 |
| `code` is not recognised | Install the VSIX from the Extensions view instead; see step 4 |

---

## Where things are kept

| What | Location |
| --- | --- |
| Runs, logs, artifacts and `Cache@2` entries (extension) | VS Code's workspace storage for that folder. Doctor prints the exact path |
| Downloaded Node.js versions for host mode (extension) | VS Code's global storage for `azp-local.azp-local` |
| Everything the command line stores | `.azp-local` in your home folder |
| Host-mode scratch folders | `azpl` in your temp folder. Removed when each job ends |
| Secrets | The operating system keychain, through VS Code |
| Agent image | Docker image `azp-local/agent-ubuntu:<release>` |
| Tool cache for container jobs | Docker volume `azp-local-tools` |
| Job containers | Named `azpl-…`, labelled `azp-local=true`. Removed when each job ends unless kept on failure |

## Clean up and uninstall

Delete past runs from VS Code with **Delete all runs** in the **Runs** view.

Remove kept containers, the tool cache and the agent image (PowerShell):

```powershell
docker ps -aq --filter "label=azp-local" | ForEach-Object { docker rm -f $_ }
```

```powershell
docker volume rm azp-local-tools
```

```powershell
docker rmi azp-local/agent-ubuntu:24.04
```

Uninstall the extension:

```bash
code --uninstall-extension azp-local.azp-local
```

Then delete `.azp-local` from your home folder if you used the command line.
