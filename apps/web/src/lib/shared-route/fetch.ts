import { localeTags, type SiteLocale } from '@/config/locales';
import { toSharedRouteResult } from './from-api';
import type { SharedRouteKey, SharedRouteResult } from './types';

const routeId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const shareToken = /^[A-Za-z0-9_-]{8,128}$/;

/** Public routes are kept 5 minutes (Site-Web › Rendu et cache); private links never. */
export const publicRouteTtlSeconds = 300;

/**
 * Reads the address of a shared link, `/r/<id>` or `/r/<id>?token=<token>` (#36). Anything else
 * is unknown without calling the API.
 */
export function readSharedRouteKey(
  segment: string,
  token: string | undefined,
): SharedRouteKey | null {
  if (!routeId.test(segment)) return null;
  if (token === undefined) return { id: segment.toLowerCase() };
  if (!shareToken.test(token)) return null;
  return { id: segment.toLowerCase(), token };
}

/** `GET /v1/routes/:id` (#36), with the token of a private link, from the server only. */
export async function fetchSharedRoute(
  apiUrl: string,
  key: SharedRouteKey,
  locale: SiteLocale,
  fetchImpl: typeof fetch = fetch,
): Promise<SharedRouteResult> {
  const url = new URL(`/v1/routes/${key.id}`, apiUrl);
  if (key.token) url.searchParams.set('token', key.token);

  const response = await fetchImpl(url, {
    headers: { accept: 'application/json', 'accept-language': localeTags[locale].lang },
    signal: AbortSignal.timeout(5000),
    ...(key.token
      ? { cache: 'no-store' }
      : { next: { revalidate: publicRouteTtlSeconds, tags: [`route:${key.id}`] } }),
  });
  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  return toSharedRouteResult(response.status, body);
}
