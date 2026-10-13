import type { CatalogRoutesQuery } from '@widoo/shared';

/** Query string of the routes of the catalog, as the API reads it; what is not set is left out. */
export function catalogQueryString(params: Partial<CatalogRoutesQuery>): string {
  const query = new URLSearchParams();
  for (const key of ['q', 'status', 'access', 'sort', 'direction', 'cursor'] as const) {
    const value = params[key];
    if (value) {
      query.set(key, value);
    }
  }
  return query.toString();
}
