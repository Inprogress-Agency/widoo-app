import { RouteDetail } from '@widoo/shared';
import { z } from 'zod';
import type { SharedRoute, SharedRouteResult } from './types';

/**
 * The fields of `GET /v1/routes/:id` (#36) the page needs. The steps are only counted: their
 * content is never read, so a Premium route, whose steps are reduced, reads like any other.
 */
const SharedRouteResponse = RouteDetail.pick({
  id: true,
  title: true,
  coverUrl: true,
  isOfficial: true,
  author: true,
  access: true,
  moods: true,
  district: true,
  neighborhood: true,
  durationMin: true,
  budgetPerPersonEur: true,
  distanceM: true,
  rating: true,
  status: true,
}).extend({ steps: z.array(z.unknown()) });

/** Body of a `410` (#36): the date of the removal, when the API gives it. */
const RemovedResponse = z.object({ removedAt: z.iso.datetime().optional() }).loose();

export function toSharedRoute(body: unknown): SharedRoute {
  const route = SharedRouteResponse.parse(body);
  return {
    id: route.id,
    title: route.title,
    coverUrl: route.coverUrl,
    mood: route.moods[0] ?? null,
    district: route.district,
    neighborhood: route.neighborhood,
    durationMin: route.durationMin,
    // The API sends a single exact sum since D-032 (#170); the upper bound until then.
    budgetPerPersonEur: route.budgetPerPersonEur.max,
    distanceM: route.distanceM,
    stepCount: route.steps.length,
    rating:
      route.rating.average === null
        ? null
        : { average: route.rating.average, count: route.rating.count },
    author:
      route.isOfficial || !route.author
        ? { kind: 'widoo' }
        : { kind: 'member', firstName: route.author.firstName },
    access: route.access,
  };
}

/**
 * Reads the answer of `GET /v1/routes/:id` (#36): `200` a route, public or private, `410` a
 * removed route, `404` an unknown one. Any other answer is an error of the API, left to the error
 * page.
 */
export function toSharedRouteResult(status: number, body: unknown): SharedRouteResult {
  if (status === 404) return { kind: 'unknown' };
  if (status === 410) {
    const removed = RemovedResponse.safeParse(body);
    return {
      kind: 'removed',
      removedAt: removed.success ? (removed.data.removedAt ?? null) : null,
    };
  }
  if (status !== 200) throw new Error(`Unexpected answer of the API for a shared route: ${status}`);

  const route = toSharedRoute(body);
  const { status: routeStatus } = SharedRouteResponse.pick({ status: true }).parse(body);
  if (routeStatus === 'private') return { kind: 'private', route };
  // `needs_fix`: published route flagged by the nightly check, still public (D-032).
  if (routeStatus === 'published' || routeStatus === 'needs_fix') return { kind: 'public', route };
  // A route the API still sends but that is no longer public (unpublished, to fix…).
  return { kind: 'removed', removedAt: null };
}
