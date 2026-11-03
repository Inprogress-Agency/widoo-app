import { PlannedRoute } from '@widoo/shared';
import { asc, eq } from 'drizzle-orm';
import type { buildApp } from '../app';
import type { TestTokenVerifier } from '../auth/test-verifier';
import { placeSignals, places } from '../db/schema';
import { plannedFixtures, saturdayTen } from '../planned/test-fixtures';

type App = Awaited<ReturnType<typeof buildApp>>;
type Headers = Record<string, string>;

const dayMs = 24 * 60 * 60 * 1000;

/**
 * Test data of the place signals, on copies of the demo route whose steps go to fictitious places
 * of their own (`ownPlaces`): shared database, parallel files, and the demo places left alone.
 * Accounts, routes and places are deleted by `cleanUp`, their signals and outings with them.
 */
export function signalFixtures(app: () => App, verifier: TestTokenVerifier) {
  const planned = plannedFixtures(app, verifier);

  /** A signed-in account two days old (a younger one weighs less), and its id. */
  async function visitor(createdAt = new Date(Date.now() - 2 * dayMs)) {
    const headers = await planned.signIn({ createdAt });
    const me = await app().inject({ url: '/v1/me', headers });
    return { headers, id: me.json<{ id: string }>().id };
  }

  /**
   * A copy of the demo route on fictitious places, in a zone of its own, far from the searches of
   * other files: its id and its places, in step order.
   */
  async function route() {
    const routeId = await planned.copyDemoRoute({
      startLocation: { lat: -45, lng: -45 },
      bounds: { west: -45, south: -45, east: -44.99, north: -44.99 },
    });
    return { routeId, placeIds: await planned.ownPlaces(routeId) };
  }

  const patch = (headers: Headers, id: string, status: string) =>
    app().inject({
      method: 'PATCH',
      url: `/v1/me/planned/${id}`,
      headers,
      payload: { status },
    });

  /**
   * An outing of the visitor on the route: only planned, under way at its first step (« J'y
   * suis »), or completed. Its id and the ids of its steps.
   */
  async function outing(
    headers: Headers,
    routeId: string,
    state: 'planned' | 'on_site' | 'completed',
  ) {
    const response = await app().inject({
      method: 'POST',
      url: '/v1/me/planned',
      headers,
      payload: { routeId, startsAt: saturdayTen },
    });
    const { id, route: snapshot } = PlannedRoute.parse(response.json());
    const stepIds = snapshot.steps.map((step) => step.id);
    if (state !== 'planned') await patch(headers, id, 'in_progress');
    if (state === 'on_site') {
      const url = `/v1/me/planned/${id}/steps/${stepIds[0]}/arrived`;
      await app().inject({ method: 'POST', url, headers });
    }
    if (state === 'completed') await patch(headers, id, 'completed');
    return { id, stepIds };
  }

  const signal = (headers: Headers, placeId: string | undefined, payload: object) =>
    app().inject({ method: 'POST', url: `/v1/places/${placeId}/signals`, headers, payload });

  /** The place as stored, after `values` when given. */
  async function placeOf(
    placeId: string | undefined,
    values?: Partial<typeof places.$inferInsert>,
  ) {
    const ofPlace = eq(places.id, placeId ?? '');
    if (values) await app().db.update(places).set(values).where(ofPlace);
    const [place] = await app().db.select().from(places).where(ofPlace);
    if (!place) throw new Error('Place missing');
    return place;
  }

  const signalsOn = (placeId: string | undefined) =>
    app()
      .db.select()
      .from(placeSignals)
      .where(eq(placeSignals.placeId, placeId ?? ''))
      .orderBy(asc(placeSignals.createdAt));

  return {
    visitor,
    route,
    outing,
    patch,
    signal,
    placeOf,
    signalsOn,
    cleanUp: planned.cleanUp,
  };
}
