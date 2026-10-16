import type { RouteCard } from '@widoo/shared';

type Rating = RouteCard['rating'];
type Shape = { id?: unknown; rating?: unknown; items?: unknown; pages?: unknown };

const isObject = (value: unknown): value is Shape => typeof value === 'object' && value !== null;

/**
 * `data` with the rating of `routeId` replaced: a card or a sheet of that route, a page of
 * cards (`items`), or the pages of a list (`pages`); anything else is returned as it is. The
 * average of the card follows a rating at once, without waiting for the cache of the search.
 */
export function withRouteRating<T>(data: T, routeId: string, rating: Rating): T {
  if (!isObject(data)) {
    return data;
  }
  if (data.id === routeId && isObject(data.rating)) {
    return { ...data, rating };
  }
  if (Array.isArray(data.items)) {
    return { ...data, items: data.items.map((item) => withRouteRating(item, routeId, rating)) };
  }
  if (Array.isArray(data.pages)) {
    return { ...data, pages: data.pages.map((page) => withRouteRating(page, routeId, rating)) };
  }
  return data;
}
