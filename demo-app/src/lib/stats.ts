import type { PipelineRun, RunStatus } from './runs';

export type StatusFilter = RunStatus | 'all';

/** 95 -> "1m 35s", 3720 -> "1h 2m". */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Share of finished runs that succeeded, as a whole percentage. Running runs are ignored. */
export function successRate(runs: PipelineRun[]): number {
  const finished = runs.filter((run) => run.status !== 'running');
  if (finished.length === 0) return 0;
  const succeeded = finished.filter((run) => run.status === 'succeeded').length;
  return Math.round((succeeded / finished.length) * 100);
}

export function averageDuration(runs: PipelineRun[]): number {
  const finished = runs.filter((run) => run.status !== 'running');
  if (finished.length === 0) return 0;
  return finished.reduce((sum, run) => sum + run.durationSeconds, 0) / finished.length;
}

export function filterRuns(runs: PipelineRun[], status: StatusFilter, query: string): PipelineRun[] {
  const needle = query.trim().toLowerCase();
  return runs.filter((run) => {
    if (status !== 'all' && run.status !== status) return false;
    if (!needle) return true;
    return [run.pipeline, run.branch, run.author, String(run.id)].some((field) => field.toLowerCase().includes(needle));
  });
}
