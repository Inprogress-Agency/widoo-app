import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Shared by every workspace: `eslint .` in a package resolves this file from the root.
export default defineConfig(
  globalIgnores([
    '**/dist/',
    '**/coverage/',
    '**/.turbo/',
    // Expo: generated types, and native folders written by prebuild (never versioned).
    '**/.expo/',
    'apps/mobile/ios/',
    'apps/mobile/android/',
  ]),
  js.configs.recommended,
  tseslint.configs.strict,
  {
    // React Native app: rules of hooks and React Compiler checks. eslint-config-expo is left
    // out: its React and import plugins do not support ESLint 10 yet.
    files: ['apps/mobile/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    rules: {
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  prettier,
);
