import { routeFilterGroups, type RouteFilterGroup, type RouteSearchQuery } from '@widoo/shared';

/**
 * What the app asks of `GET /v1/routes/search`: the zone, and optionally filters, sort and page.
 * The sort and the page size default on the server.
 */
export type RouteSearchParams = Pick<RouteSearchQuery, 'bbox'> &
  Partial<Omit<RouteSearchQuery, 'bbox'>>;

/** What the app asks of `GET /v1/routes/search/count`: the zone and the filters of a search. */
export type RouteCountParams = Pick<RouteSearchParams, 'bbox' | RouteFilterGroup>;

/**
 * Query string of the search, as the API reads it: `bbox=w,s,e,n`, `near=lat,lng`, a list filter
 * as its key repeated (`moods=food&moods=nature`). Empty filters are left out.
 */
export function searchQueryString(params: RouteSearchParams): string {
  const { west, south, east, north } = params.bbox;
  const query = new URLSearchParams({ bbox: [west, south, east, north].join(',') });
  if (params.near) {
    query.set('near', `${params.near.lat},${params.near.lng}`);
  }
  for (const group of routeFilterGroups) {
    for (const value of params[group] ?? []) {
      query.append(group, value);
    }
  }
  if (params.sort) {
    query.set('sort', params.sort);
  }
  if (params.cursor) {
    query.set('cursor', params.cursor);
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  return query.toString();
}
