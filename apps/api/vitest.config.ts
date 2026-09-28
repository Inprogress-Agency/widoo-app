import { defineConfig, mergeConfig } from 'vitest/config';
import base from '../../vitest.config.ts';

// Creates and migrates the test database before the tests (src/test-database.ts).
export default mergeConfig(
  base,
  defineConfig({ test: { globalSetup: ['src/test-global-setup.ts'] } }),
);
