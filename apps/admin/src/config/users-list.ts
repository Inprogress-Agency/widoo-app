import type { ListQuery, ListQueryOptions } from '@/lib/list-query';
import type { AdminUsersQuery } from '@widoo/shared';

/** The accounts are read newest first, with no filter and no column to sort by: only the search. */
export type UserFilter = never;
export type UserColumn = 'inscription';
export type UsersListQuery = ListQuery<UserFilter, UserColumn>;

export const usersListOptions: ListQueryOptions<UserFilter, UserColumn> = {
  filters: [],
  sortableColumns: [],
  defaultSort: { column: 'inscription', direction: 'desc' },
};

/** What to ask the API for the list shown at an address. */
export function toUsersParams(query: UsersListQuery): Partial<AdminUsersQuery> {
  return { q: query.search || undefined, cursor: query.cursor ?? undefined };
}
