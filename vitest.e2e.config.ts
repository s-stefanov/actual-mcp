import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Reason: e2e suite is Docker-backed and slow; it is fully independent of
// vitest.config.ts (which stays mocked + fast). Timeouts must absorb image
// pull, container boot, budget seed, and per-call downloadBudget round-trips.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['e2e/**/*.e2e.test.ts'],
    globals: true,
    globalSetup: ['e2e/global-setup.ts'],
    // One file at a time: all files share one budget on one container.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1', // Handle .js imports in TypeScript
    },
    testTransformMode: {
      web: ['\\.tsx?$'],
    },
  },
});
