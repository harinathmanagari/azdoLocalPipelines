// Which tier a task falls in (design section 7). The tier is shown before anything runs.
//   1: implemented by the engine
//   2: the task's own Node handler is run from its package
//   3: cannot run locally (needs a service connection, or has no agent at all)
import type { TaskTier } from './types';

/** Tier 1: lower-case task names the local engine implements itself. */
export const BUILT_IN_TASKS = new Set([
  'cmdline',
  'bash',
  'powershell',
  'usenode',
  'nodetool',
  'cache',
  'publishpipelineartifact',
  'downloadpipelineartifact',
  'publishbuildartifacts',
  'downloadbuildartifacts',
  'publishtestresults',
  'publishcodecoverageresults',
]);

const AGENTLESS = new Set(['manualvalidation', 'delay', 'invokerestapi', 'azurefunction', 'queryworkitems', 'azuremonitor', 'publishtoazureservicebus']);

const NEEDS_CONNECTION_BY_NAME = [
  /^azure/i,
  /^kubernetes/i,
  /^helm/i,
  /^servicefabric/i,
  /^sqlazure/i,
  /^iisweb/i,
  /^(npm|pip|twine|nuget|maven|cargo)authenticate$/i,
  /^(ssh|copyfilesoverssh|ftpupload|windowsmachinefilecopy|githubrelease|githubcomment)$/i,
  /^sonar(cloud|qube)prepare$/i,
  /^(downloadsecurefile|installsshkey|installapplecertificate|installappleprovisioningprofile)$/i,
  /^universalpackages$/i,
];

const CONNECTION_INPUT =
  /^(azureSubscription|azureResourceManagerConnection|connectedService\w*|\w*serviceConnection|\w*serviceEndpoint|containerRegistry|dockerRegistryEndpoint|gitHubConnection|externalEndpoints?|sshEndpoint|SonarCloud|SonarQube|azure_static_web_apps_api_token)$/i;

export function classifyTask(name: string, inputs: Record<string, string>): { tier: TaskTier; reason: string } {
  const lower = name.toLowerCase();
  if (BUILT_IN_TASKS.has(lower)) return { tier: 1, reason: 'Built into the local engine.' };
  if (AGENTLESS.has(lower)) return { tier: 3, reason: 'Agentless task: it runs on the Azure DevOps server, not on an agent.' };
  const input = Object.keys(inputs).find((key) => CONNECTION_INPUT.test(key));
  if (input) return { tier: 3, reason: `Needs a service connection or cloud credential (input '${input}').` };
  if (NEEDS_CONNECTION_BY_NAME.some((re) => re.test(name))) return { tier: 3, reason: 'Needs a service connection to an external service.' };
  return { tier: 2, reason: "Runs the task's own Node handler from its package." };
}
