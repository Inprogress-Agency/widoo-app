import { b2bSourceOf } from '@widoo/shared';

/** The page of a partner on the public site (ticket #347): `<site>/p/<slug>`. */
export function partnerPageUrl(siteUrl: string, slug: string): string {
  return `${siteUrl}/p/${encodeURIComponent(slug)}`;
}

/**
 * The link of the stores with the source of measure of a partner: `<site>/app?src=b2b-<slug>`.
 * What the QR code of a hotel opens, so that its installs are counted under its name.
 */
export function partnerAppUrl(siteUrl: string, slug: string): string {
  return `${siteUrl}/app?src=${encodeURIComponent(b2bSourceOf(slug))}`;
}
