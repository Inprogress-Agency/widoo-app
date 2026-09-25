/** `pnpm db:seed`: inserts the fictitious demo data. Refused in production. */
import { loadConfig } from '../config';
import { createDb, createSql } from './client';
import { seed } from './seed';

const config = loadConfig(process.env);
if (config.isProduction) {
  throw new Error('db:seed inserts fictitious data: refused with NODE_ENV=production');
}
const sql = createSql(config.databaseUrl);
try {
  const { routeIds } = await seed(createDb(sql));
  console.info(`Database seeded: Paris and ${routeIds.length} demo routes`);
} finally {
  await sql.end({ timeout: 5 });
}
