import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (pkg: string) => fileURLToPath(new URL(`./packages/${pkg}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@azp-local/core': src('core'),
      '@azp-local/engine-local': src('engine-local'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    exclude: ['packages/vscode/test/suite/**', '**/node_modules/**'],
    testTimeout: 30_000,
  },
});
