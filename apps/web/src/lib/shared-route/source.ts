import 'server-only';
import type { SiteLocale } from '@/config/locales';
import { site } from '@/config/site';
import { fetchSharedRoute, readSharedRouteKey } from './fetch';
import { sharedRouteFixtures } from './fixtures';
import type { SharedRouteResult } from './types';

/**
 * The route behind a shared link, read on the server only. Without API (`WIDOO_API_URL`), the
 * demo routes answer in development and every link is unknown elsewhere.
 */
export async function getSharedRoute(
  segment: string,
  token: string | undefined,
  locale: SiteLocale,
): Promise<SharedRouteResult> {
  if (!site.WIDOO_API_URL) {
    if (process.env.NODE_ENV === 'development') {
      return sharedRouteFixtures[segment] ?? { kind: 'unknown' };
    }
    return { kind: 'unknown' };
  }
  const key = readSharedRouteKey(segment, token);
  if (!key) return { kind: 'unknown' };
  return fetchSharedRoute(site.WIDOO_API_URL, key, locale);
}
