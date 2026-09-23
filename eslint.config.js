import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Shared by every workspace: `eslint .` in a package resolves this file from the root.
export default defineConfig(
  globalIgnores(['**/dist/', '**/coverage/', '**/.turbo/']),
  js.configs.recommended,
  tseslint.configs.strict,
  prettier,
);
