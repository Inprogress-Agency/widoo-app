/** `pnpm db:seed:recette`: fictitious data for a local review of the admin. Refused in production. */
import { loadConfig } from '../config';
import { createDb, createSql } from './client';
import { seedAdminRecette } from './recette-seed';

const config = loadConfig(process.env);
if (config.isProduction) {
  throw new Error('db:seed:recette inserts fictitious data: refused with NODE_ENV=production');
}
const sql = createSql(config.databaseUrl);
try {
  const counts = await seedAdminRecette(createDb(sql));
  console.info(`Admin review data: ${JSON.stringify(counts)}`);
} finally {
  await sql.end({ timeout: 5 });
}
