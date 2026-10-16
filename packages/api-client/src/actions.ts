import type { AdminActionsQuery } from '@widoo/shared';

/** Query string of the journal of the admin, as the API reads it. */
export function actionsQueryString(params: Partial<AdminActionsQuery>): string {
  const query = new URLSearchParams();
  for (const key of ['actorId', 'action', 'targetType', 'targetId', 'period', 'cursor'] as const) {
    const value = params[key];
    if (value !== undefined && value !== '') {
      query.set(key, value);
    }
  }
  return query.toString();
}
