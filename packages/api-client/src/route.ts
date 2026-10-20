import { RouteRemovedDetails, type LatLng, type RouteDetail } from '@widoo/shared';
import { ApiRequestError } from './errors';

/**
 * What `GET /v1/routes/:id` gives the route sheet (E-05): the route as the caller may see it, or
 * the date it was withdrawn and its zone (the start rounded to about 1 km, for « Voir des parcours
 * proches »), a 410 the sheet shows as its own state (D-014, D-093). Any other failure is thrown
 * as an `ApiRequestError`.
 */
export type RouteSheetAnswer =
  { kind: 'route'; route: RouteDetail } | { kind: 'removed'; removedAt: string; near: LatLng };

export interface GetRouteOptions {
  /** `share_token` of a private route, from its shared link. */
  token?: string;
  signal?: AbortSignal;
}

export interface GetRouteTimelineOptions {
  /** `share_token` of a private route, from its shared link, as for its sheet. */
  token?: string;
  signal?: AbortSignal;
}

/** Path of a route sheet, with the token of a private route. */
export function routePath(id: string, token?: string): `/v1/${string}` {
  const path = `/v1/routes/${encodeURIComponent(id)}` as const;
  return token ? `${path}?${new URLSearchParams({ token }).toString()}` : path;
}

/** Path of the timeline of a route for a start, with the token of a private route. */
export function routeTimelinePath(id: string, startsAt: string, token?: string): `/v1/${string}` {
  const query = new URLSearchParams({ startsAt, ...(token && { token }) });
  return `/v1/routes/${encodeURIComponent(id)}/timeline?${query.toString()}`;
}

/** The withdrawal of a 410 `route_removed`; null for any other error. */
export function removedOf(error: unknown): RouteSheetAnswer | null {
  if (
    !(error instanceof ApiRequestError) ||
    error.status !== 410 ||
    error.code !== 'route_removed'
  ) {
    return null;
  }
  const details = RouteRemovedDetails.safeParse(error.body?.details);
  return details.success
    ? { kind: 'removed', removedAt: details.data.removedAt, near: details.data.near }
    : null;
}

/** Query of `GET /v1/routes/:id/ratings`, by pages. */
export interface RouteRatingsParams {
  cursor?: string;
  limit?: number;
}

/** Path of the reviews of a route, with its page. */
export function routeRatingsPath(id: string, { cursor, limit }: RouteRatingsParams = {}) {
  const query = new URLSearchParams();
  if (cursor) {
    query.set('cursor', cursor);
  }
  if (limit !== undefined) {
    query.set('limit', String(limit));
  }
  const text = query.toString();
  return `/v1/routes/${encodeURIComponent(id)}/ratings${text ? `?${text}` : ''}` as const;
}
