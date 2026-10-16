import type { AdminUsersQuery } from '@widoo/shared';

/** Query string of the list of users, as the API reads it. */
export function usersQueryString(params: Partial<AdminUsersQuery>): string {
  const query = new URLSearchParams();
  for (const key of ['q', 'cursor'] as const) {
    const value = params[key];
    if (value !== undefined && value !== '') {
      query.set(key, value);
    }
  }
  return query.toString();
}
