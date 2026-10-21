import type { AppLocale, LegalDoc, LegalDocument, LegalVersions } from '@widoo/shared';
import { privacyFr } from './texts/privacy-fr';
import { termsFr } from './texts/terms-fr';

/**
 * A legal text in force: one version for all its languages, French always there. A new text is a
 * new version, so that the app fetches it again (`legal` of `GET /config`).
 */
type LegalSource = {
  version: string;
  updatedAt: string;
  texts: { fr: string } & Partial<Record<AppLocale, string>>;
};

const sources: Record<LegalDoc, LegalSource> = {
  terms: { version: '2026-10-21', updatedAt: '2026-10-21T00:00:00.000Z', texts: { fr: termsFr } },
  privacy: {
    version: '2026-10-21',
    updatedAt: '2026-10-21T00:00:00.000Z',
    texts: { fr: privacyFr },
  },
};

/** Title of the box of the privacy policy served apart, as `summary` (E-19). */
const SUMMARY_TITLE = "L'essentiel";

type ParsedText = Pick<LegalDocument, 'title' | 'summary' | 'sections'>;

/**
 * A text as the wiki writes it: `## ` its title, a « Mise à jour le » line (the date is
 * `updatedAt`), then `### ` articles. The « L'essentiel » article becomes `summary`, one sentence
 * per `- ` item. Throws on anything else, at startup.
 */
export function parseLegalText(markdown: string): ParsedText {
  const [head = '', ...articles] = markdown.trim().split(/^### /m);
  const headLines = head.split('\n').filter((line) => line.trim() !== '');
  const title = /^## (.+)$/.exec(headLines[0] ?? '')?.[1]?.trim();
  if (!title || headLines.slice(1).some((line) => !line.startsWith('Mise à jour le '))) {
    throw new Error('A legal text starts with its ## title and its « Mise à jour le » line');
  }
  let summary: string[] | undefined;
  const sections: ParsedText['sections'] = [];
  for (const article of articles) {
    const [heading = '', ...lines] = article.split('\n');
    const body = lines.join('\n').trim();
    if (heading.trim() === '' || body === '') {
      throw new Error(`Legal article without title or text: ${JSON.stringify(heading)}`);
    }
    if (heading.trim() === SUMMARY_TITLE) {
      summary = body.split('\n').map((line) => line.replace(/^- /, '').trim());
    } else {
      sections.push({ title: heading.trim(), body });
    }
  }
  if (sections.length === 0) {
    throw new Error('A legal text has at least one article');
  }
  return { title, ...(summary && { summary }), sections };
}

/** Every text parsed once, when the API starts. */
const parsed = Object.fromEntries(
  Object.entries(sources).map(([doc, source]) => [
    doc,
    Object.fromEntries(
      Object.entries(source.texts).map(([locale, text]) => [locale, parseLegalText(text)]),
    ),
  ]),
) as Record<LegalDoc, { fr: ParsedText } & Partial<Record<AppLocale, ParsedText>>>;

/** The text of `doc` in `locale`, or in French while it is not translated (`locale` says which). */
export function legalDocumentOf(doc: LegalDoc, locale: AppLocale): LegalDocument {
  const { version, updatedAt } = sources[doc];
  const texts = parsed[doc];
  const served = texts[locale] ? locale : 'fr';
  return { doc, version, updatedAt, locale: served, ...(texts[served] ?? texts.fr) };
}

/** Versions in force, for `GET /config`. */
export const legalVersions: LegalVersions = {
  terms: sources.terms.version,
  privacy: sources.privacy.version,
};
