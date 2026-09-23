import { defineConfig } from 'drizzle-kit';

// `pnpm db:generate` diffs src/db/schema.ts against the last snapshot and writes the next
// migration. Generation needs no database; `pnpm db:migrate` applies them.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/generated/migrations',
});
