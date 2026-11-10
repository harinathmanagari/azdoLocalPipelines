import type { PipelineRun } from '../lib/runs';
import { averageDuration, formatDuration, successRate } from '../lib/stats';

export function StatsBar({ runs }: { runs: PipelineRun[] }) {
  return (
    <dl className="stats" aria-label="Summary">
      <div className="stat">
        <dt>Runs</dt>
        <dd data-testid="stat-runs">{runs.length}</dd>
      </div>
      <div className="stat">
        <dt>Success rate</dt>
        <dd data-testid="stat-success">{successRate(runs)}%</dd>
      </div>
      <div className="stat">
        <dt>Average duration</dt>
        <dd data-testid="stat-duration">{formatDuration(averageDuration(runs))}</dd>
      </div>
    </dl>
  );
}
