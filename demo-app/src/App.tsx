import { useMemo, useState } from 'react';
import { RunList } from './components/RunList';
import { StatsBar } from './components/StatsBar';
import { sampleRuns } from './lib/runs';
import { filterRuns, type StatusFilter } from './lib/stats';

const statuses: StatusFilter[] = ['all', 'succeeded', 'failed', 'running', 'canceled'];
const appVersion = import.meta.env.VITE_APP_VERSION ?? 'dev';

export default function App() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const visible = useMemo(() => filterRuns(sampleRuns, status, query), [status, query]);

  return (
    <main className="page">
      <header className="header">
        <h1>Pipeline Pulse</h1>
        <p className="tagline">Recent pipeline runs at a glance.</p>
      </header>

      <StatsBar runs={visible} />

      <section className="filters" aria-label="Filters">
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            {statuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input
            type="search"
            placeholder="pipeline, branch, author or run id"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </section>

      <RunList runs={visible} />

      <footer className="footer">Version {appVersion}</footer>
    </main>
  );
}
