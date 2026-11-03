import { PlannedRoute } from '@widoo/shared';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { plannedRoutes } from '../db/schema';
import { testConfig } from '../test-config';
import { signalFixtures } from '../verification/test-fixtures';

// The order of the locks of a step done, a place signal and a deletion sent at once from the same
// outing (the offline queue of the app): outing, account, place. On copies of the demo route moved
// to fictitious places: shared database, parallel files; deleted afterwards.
const verifier = new TestTokenVerifier();
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = signalFixtures(() => app, verifier);
beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier, directions: null });
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

const { visitor, route, outing, signal, signalsOn } = fixtures;

/**
 * Locks the outing in a transaction of its own until `release`: the requests sent meanwhile wait
 * behind it in the order they were sent, which makes the interleaving of a test certain.
 */
async function holdOuting(outingId: string) {
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let finished = Promise.resolve();
  const pid = await new Promise<number>((resolve, reject) => {
    finished = app.db.transaction(async (tx) => {
      await tx
        .select({ id: plannedRoutes.id })
        .from(plannedRoutes)
        .where(eq(plannedRoutes.id, outingId))
        .for('update');
      const [backend] = await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`);
      resolve(backend?.pid ?? 0);
      await released;
    });
    finished.catch(reject);
  });
  return { pid, release, finished };
}

/** The backends waiting for a lock held by `pids`, or behind them, once there are `count`. */
async function waitingBehind(pids: readonly number[], count: number): Promise<number[]> {
  const deadline = Date.now() + 5_000;
  for (;;) {
    const rows = await app.db.execute<{ pid: number }>(
      sql`select pid from pg_stat_activity where pg_blocking_pids(pid) && ${`{${pids.join(',')}}`}::int[]`,
    );
    if (rows.length >= count) return rows.map((row) => row.pid);
    if (Date.now() > deadline) throw new Error(`${rows.length} of ${count} requests waiting`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/**
 * Sends « Étape suivante » with a signal on the second step of the outing, waiting behind the
 * outing held by the test, then `other`, which waits too: both run once the outing is released.
 */
async function alongsideStepDone(
  headers: Record<string, string>,
  go: { id: string; stepIds: string[] },
  other: () => ReturnType<typeof signal>,
) {
  const blocker = await holdOuting(go.id);
  try {
    const stepDone = app.inject({
      method: 'POST',
      url: `/v1/me/planned/${go.id}/steps/${go.stepIds[1]}/done`,
      headers,
      payload: { signal: { kind: 'confirm' } },
    });
    const [donePid = 0] = await waitingBehind([blocker.pid], 1);
    const otherResponse = other();
    await waitingBehind([blocker.pid, donePid], 2);
    blocker.release();
    await blocker.finished;
    return await Promise.all([stepDone, otherResponse]);
  } finally {
    blocker.release();
  }
}

// Parallel files on the shared database can slow the setup down (#623).
const concurrent = { timeout: 20_000 };

describe('a step done and a signal or a deletion at once, from the same outing', () => {
  it(
    'records the step, its signal and the signal sent alongside, one after the other',
    concurrent,
    async () => {
      const { routeId, placeIds } = await route();
      const { headers } = await visitor();
      const go = await outing(headers, routeId, 'on_site');

      const [stepDone, signalSent] = await alongsideStepDone(headers, go, () =>
        signal(headers, placeIds[0], { kind: 'confirm', plannedRouteId: go.id }),
      );

      expect(stepDone.statusCode, stepDone.body).toBe(200);
      expect(PlannedRoute.parse(stepDone.json()).steps[1]?.doneAt).toEqual(expect.any(String));
      expect(signalSent.statusCode, signalSent.body).toBe(201);
      expect(await signalsOn(placeIds[0])).toHaveLength(1);
      expect(await signalsOn(placeIds[1])).toHaveLength(1);
    },
  );

  it(
    'records the step, then deletes the account with its outings and signals',
    concurrent,
    async () => {
      const { routeId, placeIds } = await route();
      const { headers } = await visitor();
      const go = await outing(headers, routeId, 'on_site');

      const [stepDone, deleted] = await alongsideStepDone(headers, go, () =>
        app.inject({ method: 'DELETE', url: '/v1/me', headers }),
      );

      expect(stepDone.statusCode, stepDone.body).toBe(200);
      expect(deleted.statusCode, deleted.body).toBe(204);
      expect(await app.db.select().from(plannedRoutes).where(eq(plannedRoutes.id, go.id))).toEqual(
        [],
      );
      expect(await signalsOn(placeIds[1])).toEqual([]);
    },
  );
});
