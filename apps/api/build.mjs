import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

// Workspace packages ship TypeScript source, which Node cannot load: bundle them into the
// output. Third-party dependencies stay external and are installed next to it.
// Paths are relative to apps/api, where `pnpm build` runs.
const { dependencies } = JSON.parse(await readFile('package.json', 'utf8'));

await build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: Object.keys(dependencies).filter((name) => !name.startsWith('@widoo/')),
});
