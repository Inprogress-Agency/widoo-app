import { cp, readFile } from 'node:fs/promises';
import { build } from 'esbuild';

// Workspace packages ship TypeScript source, which Node cannot load: bundle them into the
// output. Third-party dependencies stay external and are installed next to it.
// Paths are relative to apps/api, where `pnpm build` runs.
const { dependencies } = JSON.parse(await readFile('package.json', 'utf8'));

await build({
  // dist/migrate.js applies the migrations before a deployment (`node dist/migrate.js`).
  entryPoints: { server: 'src/server.ts', migrate: 'src/migrate.ts' },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: Object.keys(dependencies).filter((name) => !name.startsWith('@widoo/')),
});

// Same path relative to dist/migrate.js as to src/migrate.ts.
await cp('src/db/generated/migrations', 'dist/db/generated/migrations', { recursive: true });
