import type {
  AdminRatingsQuery,
  AdminReportsQuery,
  AdminSignalsQuery,
  AdminSupportQuery,
} from '@widoo/shared';

/** A query string from the values that are set, in the order of `keys`. */
function queryStringOf(
  params: Record<string, string | number | undefined>,
  keys: readonly string[],
): string {
  const query = new URLSearchParams();
  for (const key of keys) {
    const value = params[key];
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  return query.toString();
}

/** Query string of the open reports of routes, as the API reads it. */
export const reportsQueryString = (params: Partial<AdminReportsQuery>) =>
  queryStringOf(params, ['reason', 'cursor']);

/** Query string of the flagged places, as the API reads it. */
export const signalsQueryString = (params: Partial<AdminSignalsQuery>) =>
  queryStringOf(params, ['cursor']);

/** Query string of the ratings with a comment, as the API reads it. */
export const ratingsQueryString = (params: Partial<AdminRatingsQuery>) =>
  queryStringOf(params, ['rating', 'routeId', 'cursor']);

/** Query string of the support messages, as the API reads it. */
export const supportQueryString = (params: Partial<AdminSupportQuery>) =>
  queryStringOf(params, ['status', 'cursor']);
