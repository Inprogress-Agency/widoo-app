import { defineConfig } from 'vitest/config';

// Base config for every workspace: a package re-exports it from its own vitest.config.ts,
// or extends it with mergeConfig when it needs more (database setup, React Native, ...).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
    },
  },
});
