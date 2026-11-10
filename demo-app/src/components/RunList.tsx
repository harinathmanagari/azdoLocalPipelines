import type { PipelineRun } from '../lib/runs';
import { formatDuration } from '../lib/stats';

export function RunList({ runs }: { runs: PipelineRun[] }) {
  if (runs.length === 0) {
    return <p className="empty">No runs match these filters.</p>;
  }
  return (
    <table className="runs">
      <thead>
        <tr>
          <th scope="col">Run</th>
          <th scope="col">Pipeline</th>
          <th scope="col">Branch</th>
          <th scope="col">Status</th>
          <th scope="col">Duration</th>
          <th scope="col">Author</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id} data-testid="run-row">
            <td>#{run.id}</td>
            <td>{run.pipeline}</td>
            <td>
              <code>{run.branch}</code>
            </td>
            <td>
              <span className={`badge badge-${run.status}`}>{run.status}</span>
            </td>
            <td>{formatDuration(run.durationSeconds)}</td>
            <td>{run.author}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
