import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { plannedFixtures } from '../planned/test-fixtures';
import { testConfig } from '../test-config';
import { routeRevisions, routes } from './schema';

// Migration 0008 (#48), on copies of a demo route deleted afterwards.
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = plannedFixtures(() => app, new TestTokenVerifier());

beforeAll(async () => {
  app = await buildApp(testConfig());
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

const revisionOf = (routeId: string, status: typeof routeRevisions.$inferInsert.status) =>
  app.db.insert(routeRevisions).values({ routeId, status, snapshot: {} });

describe('route_revisions', () => {
  it('holds one open revision per route, beside the decided ones', async () => {
    const routeId = await fixtures.copyDemoRoute();
    await revisionOf(routeId, 'published');
    await revisionOf(routeId, 'rejected');
    await revisionOf(routeId, 'draft');
    for (const status of ['draft', 'pending', 'changes_requested'] as const) {
      await expect(revisionOf(routeId, status)).rejects.toThrow();
    }
  });

  it('starts as a draft, and goes with its route', async () => {
    const routeId = await fixtures.copyDemoRoute();
    const [revision] = await app.db
      .insert(routeRevisions)
      .values({ routeId, snapshot: {} })
      .returning();
    expect(revision?.status).toBe('draft');
    await app.db.delete(routes).where(eq(routes.id, routeId));
    expect(
      await app.db.select().from(routeRevisions).where(eq(routeRevisions.routeId, routeId)),
    ).toEqual([]);
  });
});
