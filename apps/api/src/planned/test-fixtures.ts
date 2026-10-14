import { eq, inArray } from 'drizzle-orm';
import type { buildApp } from '../app';
import type { TestTokenVerifier } from '../auth/test-verifier';
import { routeUnlocks, routes, steps, users } from '../db/schema';
import { seed, seedId } from '../db/seed';
import { uuidv7 } from '../db/uuid';

type App = Awaited<ReturnType<typeof buildApp>>;

/** Saturday 24 October 2026, 10:00 in Paris: Merci opens at 10:30, L'As du Fallafel is closed. */
export const saturdayTen = '2026-10-24T10:00:00+02:00';

/**
 * Test data of the planning tests, on copies of the demo route: shared database, parallel
 * files. Every route and account created here is deleted by `cleanUp`; the demo is untouched.
 */
export function plannedFixtures(app: () => App, verifier: TestTokenVerifier) {
  const routeIds: string[] = [];
  const uids: string[] = [];

  /** A copy of the demo route, its first step to book (fictitious link). */
  async function copyDemoRoute(values: Partial<typeof routes.$inferInsert> = {}) {
    await seed(app().db);
    const demoId = seedId('route:marais-gourmand');
    const [demo] = await app().db.select().from(routes).where(eq(routes.id, demoId));
    if (!demo) throw new Error('Demo route missing from the seed');
    const id = uuidv7();
    routeIds.push(id);
    await app()
      .db.insert(routes)
      .values({ ...demo, id, shareToken: null, ...values });
    const demoSteps = await app().db.select().from(steps).where(eq(steps.routeId, demoId));
    await app()
      .db.insert(steps)
      .values(
        demoSteps.map((step) => ({
          ...step,
          id: uuidv7(),
          routeId: id,
          ...(step.position === 0 && {
            bookingRequired: true,
            bookingUrl: 'https://example.com/reserver',
          }),
        })),
      );
    return id;
  }

  /** A signed-in account of the given plan, created on its first request. */
  async function signIn(values: Partial<typeof users.$inferInsert> = {}) {
    const { token, uid } = verifier.issue();
    uids.push(uid);
    await app()
      .db.insert(users)
      .values({ firebaseUid: uid, ...values });
    return { authorization: `Bearer ${token}` };
  }

  /** The route bought alone by the signed-in account (D-073), with a fictitious transaction. */
  async function unlock(headers: Record<string, string>, routeId: string) {
    const me = await app().inject({ url: '/v1/me', headers });
    await app()
      .db.insert(routeUnlocks)
      .values({
        userId: me.json<{ id: string }>().id,
        routeId,
        storeTransactionId: `fictitious-${uuidv7()}`,
      });
  }

  async function cleanUp() {
    if (uids.length > 0) await app().db.delete(users).where(inArray(users.firebaseUid, uids));
    if (routeIds.length > 0) await app().db.delete(routes).where(inArray(routes.id, routeIds));
  }

  return { copyDemoRoute, signIn, unlock, cleanUp };
}
