import type { PlannedRouteStatus } from '@widoo/shared';

/** Query of `GET /me/planned`: one status or all, by pages. */
export interface PlannedListParams {
  status?: PlannedRouteStatus;
  cursor?: string;
  limit?: number;
}

export function plannedQueryString({ status, cursor, limit }: PlannedListParams): string {
  const query = new URLSearchParams();
  if (status) {
    query.set('status', status);
  }
  if (cursor) {
    query.set('cursor', cursor);
  }
  if (limit !== undefined) {
    query.set('limit', String(limit));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

export const plannedPath = (id: string) => `/v1/me/planned/${encodeURIComponent(id)}` as const;

/** « Étape suivante » of a Go (E-07): the step marked done, once. */
export const plannedStepDonePath = (id: string, stepId: string) =>
  `${plannedPath(id)}/steps/${encodeURIComponent(stepId)}/done` as const;

/** « Itinéraire » of a Go (E-07, D-032): Google Maps on foot to the next step, never the route. */
export const plannedMapsUrlPath = (id: string) => `${plannedPath(id)}/maps-url` as const;

/** The rating of the route of an outing (E-15): created or changed. */
export const plannedRatingPath = (id: string) => `${plannedPath(id)}/rating` as const;
