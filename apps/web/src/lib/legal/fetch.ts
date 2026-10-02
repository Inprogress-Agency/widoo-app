import type { LegalDoc } from '@/config/legal';
import { localeTags, type SiteLocale } from '@/config/locales';
import { toLegalText } from './from-api';
import type { LegalText } from './types';

/** A legal text changes rarely: kept an hour, refreshed by its tag when a version is published. */
export const legalTextTtlSeconds = 3600;

/**
 * `GET /v1/legal/:doc?locale=` (#206), from the server only. No text (404) or an invalid one:
 * null, the page is missing. The API down: an error, the page offers to try again.
 */
export async function fetchLegalText(
  apiUrl: string,
  doc: LegalDoc,
  locale: SiteLocale,
  fetchImpl: typeof fetch = fetch,
): Promise<LegalText | null> {
  const url = new URL(`/v1/legal/${doc}`, apiUrl);
  url.searchParams.set('locale', locale);
  const response = await fetchImpl(url, {
    headers: { accept: 'application/json', 'accept-language': localeTags[locale].lang },
    signal: AbortSignal.timeout(5000),
    next: { revalidate: legalTextTtlSeconds, tags: [`legal:${doc}`] },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GET /v1/legal/${doc}: ${response.status}`);
  return toLegalText(await response.json().catch(() => null));
}
