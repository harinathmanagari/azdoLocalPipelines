import { describe, expect, it } from 'vitest';
import { sampleRuns, type PipelineRun } from './runs';
import { averageDuration, filterRuns, formatDuration, successRate } from './stats';

const run = (overrides: Partial<PipelineRun>): PipelineRun => ({
  id: 1,
  pipeline: 'web',
  branch: 'main',
  status: 'succeeded',
  durationSeconds: 60,
  startedAt: '2026-10-10T00:00:00Z',
  author: 'Ada',
  ...overrides,
});

describe('formatDuration', () => {
  it.each([
    [0, '0s'],
    [59, '59s'],
    [95, '1m 35s'],
    [3720, '1h 2m'],
    [-5, '0s'],
  ])('formats %d seconds as %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('successRate', () => {
  it('ignores runs that are still running', () => {
    const runs = [run({ status: 'succeeded' }), run({ status: 'failed' }), run({ status: 'running' })];
    expect(successRate(runs)).toBe(50);
  });

  it('is zero when nothing has finished', () => {
    expect(successRate([run({ status: 'running' })])).toBe(0);
    expect(successRate([])).toBe(0);
  });
});

describe('averageDuration', () => {
  it('averages finished runs only', () => {
    const runs = [run({ durationSeconds: 100 }), run({ durationSeconds: 200 }), run({ status: 'running', durationSeconds: 999 })];
    expect(averageDuration(runs)).toBe(150);
  });
});

describe('filterRuns', () => {
  it('filters by status', () => {
    expect(filterRuns(sampleRuns, 'failed', '').every((r) => r.status === 'failed')).toBe(true);
    expect(filterRuns(sampleRuns, 'all', '')).toHaveLength(sampleRuns.length);
  });

  it('matches pipeline, branch, author and id, ignoring case', () => {
    expect(filterRuns(sampleRuns, 'all', 'API-GATEWAY').every((r) => r.pipeline === 'api-gateway')).toBe(true);
    expect(filterRuns(sampleRuns, 'all', 'feature/')).toHaveLength(1);
    expect(filterRuns(sampleRuns, 'all', 'priya')).toHaveLength(2);
    expect(filterRuns(sampleRuns, 'all', '2412')).toHaveLength(1);
  });

  it('combines status and text', () => {
    expect(filterRuns(sampleRuns, 'succeeded', 'web-frontend')).toHaveLength(2);
  });
});
