import 'server-only';
import type { LegalDoc } from '@/config/legal';
import type { SiteLocale } from '@/config/locales';
import { site } from '@/config/site';
import { fetchLegalText } from './fetch';
import { legalFixtures } from './fixtures';
import type { LegalText } from './types';

/**
 * A legal text, read on the server only. Without API (`WIDOO_API_URL`), the excerpts of the drafts
 * answer in development and the page is missing elsewhere: no text is ever published that the API
 * did not serve.
 */
export async function getLegalText(doc: LegalDoc, locale: SiteLocale): Promise<LegalText | null> {
  if (!site.WIDOO_API_URL) {
    return process.env.NODE_ENV === 'development' ? legalFixtures[doc][locale] : null;
  }
  return fetchLegalText(site.WIDOO_API_URL, doc, locale);
}
