import { defineConfig, mergeConfig } from 'vitest/config';
import base from '../../vitest.config.ts';

// The engine is pure and its rules are the product: its coverage stays above 90 % (#35).
const minimum = 90;

export default mergeConfig(
  base,
  defineConfig({
    test: {
      coverage: {
        thresholds: { statements: minimum, branches: minimum, functions: minimum, lines: minimum },
      },
    },
  }),
);
