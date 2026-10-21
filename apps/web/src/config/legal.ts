import type { SiteLocale } from './locales';

/** The legal texts of the site, the same as in the app (`GET /legal/:doc`, #206). */
export const legalDocs = ['terms', 'privacy'] as const;

export type LegalDoc = (typeof legalDocs)[number];

/**
 * The legal pages of the site: the texts of the API, and the legal notice, which only the site
 * shows (Mentions-legales, D-107, #590).
 */
export const legalPages = [...legalDocs, 'notice'] as const;

export type LegalPage = (typeof legalPages)[number];

/**
 * Path of each legal page under its language (#242, decision of 2026-10-02 on the proposal of
 * Ilan): French words in French, English words in English.
 */
export const legalPaths: Record<LegalPage, Record<SiteLocale, string>> = {
  terms: { fr: '/conditions', en: '/terms' },
  privacy: { fr: '/confidentialite', en: '/privacy' },
  notice: { fr: '/mentions-legales', en: '/legal-notice' },
};

/** The legal page a path leads to, in any language (`/conditions` and `/terms` alike). */
export function legalPageOfPath(path: string): LegalPage | null {
  return (
    legalPages.find((page) => Object.values(legalPaths[page]).includes(path.replace(/\/+$/, ''))) ??
    null
  );
}
