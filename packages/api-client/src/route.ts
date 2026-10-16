import { RouteRemovedDetails, type RouteDetail } from '@widoo/shared';
import { ApiRequestError } from './errors';

/**
 * What `GET /v1/routes/:id` gives the route sheet (E-05): the route as the caller may see it, or
 * the date it was withdrawn, a 410 the sheet shows as its own state (D-014). Any other failure is
 * thrown as an `ApiRequestError`.
 */
export type RouteSheetAnswer =
  { kind: 'route'; route: RouteDetail } | { kind: 'removed'; removedAt: string };

export interface GetRouteOptions {
  /** `share_token` of a private route, from its shared link. */
  token?: string;
  signal?: AbortSignal;
}

/** Path of a route sheet, with the token of a private route. */
export function routePath(id: string, token?: string): `/v1/${string}` {
  const path = `/v1/routes/${encodeURIComponent(id)}` as const;
  return token ? `${path}?${new URLSearchParams({ token }).toString()}` : path;
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
  return details.success ? { kind: 'removed', removedAt: details.data.removedAt } : null;
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
