import { z } from 'zod';
import { AppLocale } from './me';

/**
 * Legal texts served by `GET /legal/:doc` (E-19, D-063): the app keeps the last version received,
 * ships a copy for the first launch, and widoo.app publishes the same text (D-068).
 */
export const legalDocs = ['terms', 'privacy'] as const;
export const LegalDoc = z.enum(legalDocs);
export type LegalDoc = z.infer<typeof LegalDoc>;

/** Version of a text: the date it was written, `YYYY-MM-DD`, with an optional `-n` suffix. */
export const LegalVersion = z.string().regex(/^\d{4}-\d{2}-\d{2}(-\d+)?$/);

/** Params of `GET /legal/:doc`. */
export const LegalParams = z.strictObject({ doc: LegalDoc });

/** Query of `GET /legal/:doc`: the language of the app, French by default. */
export const LegalQuery = z.strictObject({ locale: AppLocale.default('fr') });

/** An article: its numbered title (« 1. Qui nous sommes ») and its text. */
export const LegalSection = z.object({
  title: z.string().min(1),
  /**
   * Markdown as written in the wiki: paragraphs separated by a blank line, `- ` lists, tables
   * and `**bold**`; no HTML, no image.
   */
  body: z.string().min(1),
});

/** Body of `GET /legal/:doc`. */
export const LegalDocument = z.object({
  doc: LegalDoc,
  version: LegalVersion,
  updatedAt: z.iso.datetime(),
  /**
   * Language of the text served: the one asked for, or French while a translation does not
   * exist (the English texts are still to translate, D-063).
   */
  locale: AppLocale,
  title: z.string().min(1),
  /** « L'essentiel » of the privacy policy: three sentences, in order; absent elsewhere. */
  summary: z.array(z.string().min(1)).optional(),
  sections: z.array(LegalSection).min(1),
});
export type LegalDocument = z.infer<typeof LegalDocument>;

/** Versions of the texts in force, in `GET /config`: the app fetches a text whose version changed. */
export const LegalVersions = z.object({ terms: LegalVersion, privacy: LegalVersion });
export type LegalVersions = z.infer<typeof LegalVersions>;
