// Starts a plan on an engine and tees its events to the run store and to a listener.
import { isolationFingerprint, isolationRisks, type IsolationRisk } from './isolation';
import type { RunStore } from './runstore';
import type { Engine, JobResult, LocalConfig, RunEvent, RunHandle, RunPlan } from './types';

export interface HostHooks {
  getSecret(name: string, group?: string): Promise<string | undefined>;
  confirm(message: string): Promise<boolean>;
  /**
   * Asked before anything runs when .azp-local.yml weakens isolation for this run (see
   * isolation.ts). The host remembers approvals outside the repository, by fingerprint,
   * and asks again when the fingerprint changes. Resolving false means nothing runs.
   */
  approveIsolation(risks: IsolationRisk[], fingerprint: string): Promise<boolean>;
}

export interface RunSession {
  runId: string;
  runDir: string;
  cancel(): Promise<void>;
  done: Promise<{ result: JobResult; gaps: string[] }>;
}

export const ISOLATION_DECLINED = 'Not run: .azp-local.yml weakens isolation for this run and that was not approved.';

export function startRun(args: {
  engine: Engine;
  plan: RunPlan;
  store: RunStore;
  workspaceRoot: string;
  config: LocalConfig;
  hooks: HostHooks;
  onEvent?: (event: RunEvent) => void;
}): RunSession {
  const { engine, plan, store } = args;
  const risks = isolationRisks(plan, args.config, args.workspaceRoot);
  const { runId, runDir } = store.createRun(plan, engine.id);
  let handle: RunHandle | undefined;
  let canceled = false;

  const record = (event: RunEvent) => {
    store.append(runId, event);
    try {
      args.onEvent?.(event);
    } catch {
      /* a view failing must not stop the run being recorded */
    }
  };

  const done = (async () => {
    // The approval comes before the engine starts: a declined run never creates a container or touches a host path.
    const approved = risks.length === 0 || (!canceled && (await args.hooks.approveIsolation(risks, isolationFingerprint(risks)).catch(() => false)));
    if (!approved || canceled) {
      const at = Date.now();
      const message = canceled ? 'The run was canceled before it started.' : ISOLATION_DECLINED;
      const gaps = canceled ? [] : [ISOLATION_DECLINED, ...risks.map((r) => r.message)];
      record({ type: 'run.started', runId, at });
      for (const pj of plan.jobs) if (pj.action === 'run') record({ type: 'job.finished', jobId: pj.job.id, result: 'canceled', message, at });
      record({ type: 'run.finished', result: 'canceled', gaps, at });
      return { result: 'canceled' as JobResult, gaps };
    }

    handle = engine.start(plan, {
      runId,
      runDir,
      workspaceRoot: args.workspaceRoot,
      config: args.config,
      getSecret: args.hooks.getSecret,
      confirm: args.hooks.confirm,
      resolveRunDir: (id) => store.runDir(id),
    });
    let outcome: { result: JobResult; gaps: string[] } = { result: 'failed', gaps: [] };
    for await (const event of handle.events) {
      record(event);
      if (event.type === 'run.finished') outcome = { result: event.result, gaps: event.gaps };
    }
    return outcome;
  })();

  return {
    runId,
    runDir,
    cancel: async () => {
      canceled = true;
      await handle?.cancel();
    },
    done,
  };
}
