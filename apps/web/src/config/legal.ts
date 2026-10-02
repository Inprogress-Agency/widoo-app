import type { SiteLocale } from './locales';

/** The legal texts of the site, the same as in the app (`GET /legal/:doc`, #206). */
export const legalDocs = ['terms', 'privacy'] as const;

export type LegalDoc = (typeof legalDocs)[number];

/**
 * Path of each legal page under its language (#242, decision of 2026-10-02 on the proposal of
 * Ilan): French words in French, English words in English.
 */
export const legalPaths: Record<LegalDoc, Record<SiteLocale, string>> = {
  terms: { fr: '/conditions', en: '/terms' },
  privacy: { fr: '/confidentialite', en: '/privacy' },
};

/** The legal text a path leads to, in any language (`/conditions` and `/terms` alike). */
export function legalDocOfPath(path: string): LegalDoc | null {
  return (
    legalDocs.find((doc) => Object.values(legalPaths[doc]).includes(path.replace(/\/+$/, ''))) ??
    null
  );
}
