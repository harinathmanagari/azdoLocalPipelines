import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';
import { sampleRuns } from './lib/runs';

afterEach(cleanup);

describe('App', () => {
  it('lists every run by default', () => {
    render(<App />);
    expect(screen.getAllByTestId('run-row')).toHaveLength(sampleRuns.length);
    expect(screen.getByTestId('stat-runs').textContent).toBe(String(sampleRuns.length));
  });

  it('narrows the list when a status is chosen', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'failed' } });
    const failed = sampleRuns.filter((run) => run.status === 'failed').length;
    expect(screen.getAllByTestId('run-row')).toHaveLength(failed);
    expect(screen.getByTestId('stat-success').textContent).toBe('0%');
  });

  it('shows an empty state when nothing matches the search', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'no-such-pipeline' } });
    expect(screen.queryAllByTestId('run-row')).toHaveLength(0);
    expect(screen.getByText('No runs match these filters.')).toBeTruthy();
  });
});
