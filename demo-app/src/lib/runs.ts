export type RunStatus = 'succeeded' | 'failed' | 'running' | 'canceled';

export interface PipelineRun {
  id: number;
  pipeline: string;
  branch: string;
  status: RunStatus;
  durationSeconds: number;
  startedAt: string;
  author: string;
}

export const sampleRuns: PipelineRun[] = [
  { id: 2412, pipeline: 'web-frontend', branch: 'main', status: 'succeeded', durationSeconds: 312, startedAt: '2026-10-10T08:14:00Z', author: 'Priya' },
  { id: 2411, pipeline: 'web-frontend', branch: 'feature/filters', status: 'failed', durationSeconds: 97, startedAt: '2026-10-10T07:52:00Z', author: 'Marco' },
  { id: 2410, pipeline: 'api-gateway', branch: 'main', status: 'succeeded', durationSeconds: 545, startedAt: '2026-10-10T07:30:00Z', author: 'Lena' },
  { id: 2409, pipeline: 'design-tokens', branch: 'main', status: 'running', durationSeconds: 41, startedAt: '2026-10-10T07:28:00Z', author: 'Priya' },
  { id: 2408, pipeline: 'api-gateway', branch: 'fix/timeouts', status: 'canceled', durationSeconds: 12, startedAt: '2026-10-09T17:05:00Z', author: 'Jonas' },
  { id: 2407, pipeline: 'web-frontend', branch: 'main', status: 'succeeded', durationSeconds: 298, startedAt: '2026-10-09T16:40:00Z', author: 'Lena' },
  { id: 2406, pipeline: 'design-tokens', branch: 'chore/deps', status: 'failed', durationSeconds: 63, startedAt: '2026-10-09T15:12:00Z', author: 'Marco' },
  { id: 2405, pipeline: 'api-gateway', branch: 'main', status: 'succeeded', durationSeconds: 520, startedAt: '2026-10-09T14:01:00Z', author: 'Jonas' },
];
