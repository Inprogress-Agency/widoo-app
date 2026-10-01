export type Platform = 'ios' | 'android' | 'desktop';

/** Source of a link or a QR code (`?src=`, #187): short, lowercase, digits, `-` and `_`. */
const source = /^[a-z0-9_-]{1,40}$/;

export function readSource(value: string | undefined): string | undefined {
  const clean = value?.trim().toLowerCase();
  return clean && source.test(clean) ? clean : undefined;
}

/**
 * Platform of the browser. iPadOS announces itself as a Mac: a Mac with a touch screen is an iPad.
 */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  if (/macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  return 'desktop';
}

/** Link that opens a route in the installed app (#39): `widoo://route/<id>`. */
export function appRouteLink(scheme: string, routeId: string, token?: string): string {
  const link = `${scheme}://route/${encodeURIComponent(routeId)}`;
  return token ? `${link}?token=${encodeURIComponent(token)}` : link;
}

export type StoreLinks = { appStoreUrl?: string; playStoreUrl?: string };

/**
 * Store page for the phone, carrying the route and its source for the deferred link (#234): on
 * Google Play in the install referrer. The App Store keeps its plain address until #234 chooses
 * how iOS measures the source.
 */
export function storeLinkFor(
  platform: Platform,
  stores: StoreLinks,
  context: { routeId?: string; source?: string } = {},
): string | undefined {
  if (platform === 'ios') return stores.appStoreUrl;
  if (platform !== 'android' || !stores.playStoreUrl) return undefined;

  const referrer = new URLSearchParams();
  if (context.routeId) referrer.set('route', context.routeId);
  if (context.source) referrer.set('src', context.source);
  if (referrer.size === 0) return stores.playStoreUrl;
  const url = new URL(stores.playStoreUrl);
  url.searchParams.set('referrer', referrer.toString());
  return url.toString();
}
