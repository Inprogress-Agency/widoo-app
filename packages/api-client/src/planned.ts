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
