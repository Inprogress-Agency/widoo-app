import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import base from '../../vitest.config.ts';

// The `@/` alias of the app, and `server-only` replaced by an empty module: outside Next.js,
// importing it throws.
export default mergeConfig(
  base,
  defineConfig({
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('src', import.meta.url)),
        'server-only': fileURLToPath(new URL('src/test/empty-module.ts', import.meta.url)),
      },
    },
  }),
);
