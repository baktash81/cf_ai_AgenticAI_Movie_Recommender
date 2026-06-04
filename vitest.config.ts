import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    reporters: ['verbose'],
    pool: 'forks',
    fileParallelism: true,
    sequence: {
      concurrent: false,
    },
  },
});
