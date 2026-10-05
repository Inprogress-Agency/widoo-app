/**
 * `node dist/demo-seed.js load` in the API image: loads the demo dataset on staging
 * (`demo-seed.ts`), as an execution of the migration job with overridden arguments. Refused
 * without DEMO_SEED=staging and outside the widoo-staging project. Locally, the demo dataset
 * comes from `pnpm db:seed`.
 */
import { loadConfig } from '../config';
import { createDb, createSql } from './client';
import { demoSeedActions, gcpProjectId, runDemoSeed, type DemoSeedAction } from './demo-seed';

const action = process.argv[2];
if (!demoSeedActions.includes(action as DemoSeedAction)) {
  throw new Error(`Usage: node dist/demo-seed.js ${demoSeedActions.join('|')}`);
}
const config = loadConfig(process.env);
const target = { optIn: process.env.DEMO_SEED, projectId: await gcpProjectId() };
const sql = createSql(config.databaseUrl);
try {
  const result = await runDemoSeed(action as DemoSeedAction, target, createDb(sql));
  // Counts only: no row content, no connection string.
  console.info(`Demo dataset ${result.action} on ${target.projectId}: ${JSON.stringify(result)}`);
} finally {
  await sql.end({ timeout: 5 });
}
