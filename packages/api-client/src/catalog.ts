import type { CatalogPlacesQuery, CatalogRoutesQuery } from '@widoo/shared';

/** A query string from the values that are set, in the order of `keys`. */
function queryStringOf<Params extends Record<string, string | undefined>>(
  params: Params,
  keys: readonly (keyof Params & string)[],
): string {
  const query = new URLSearchParams();
  for (const key of keys) {
    const value = params[key];
    if (value) {
      query.set(key, value);
    }
  }
  return query.toString();
}

/** Query string of the routes of the catalog, as the API reads it; what is not set is left out. */
export const catalogQueryString = (params: Partial<CatalogRoutesQuery>) =>
  queryStringOf(params, ['q', 'status', 'access', 'sort', 'direction', 'cursor']);

/** Query string of the places of the catalog, as the API reads it. */
export const catalogPlacesQueryString = (params: Partial<CatalogPlacesQuery>) =>
  queryStringOf(params, ['q', 'category', 'status', 'sort', 'direction', 'cursor']);
