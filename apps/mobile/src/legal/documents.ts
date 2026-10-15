import { useQuery } from '@tanstack/react-query';
import { LegalDocument, type AppLocale, type LegalDoc } from '@widoo/shared';
import { useTranslation } from 'react-i18next';
import { createMMKV } from 'react-native-mmkv';
import { api } from '../api/client';
import bundledPrivacy from './generated/privacy.fr.json';
import bundledTerms from './generated/terms.fr.json';

/**
 * Copies shipped with the app, for a first opening without network (Ecrans › E-19, textes
 * légaux): the answers of `GET /v1/legal/:doc?locale=fr` of the version in force, written as is.
 * Only French exists while the texts are not translated (D-063).
 */
const bundled: Record<LegalDoc, LegalDocument> = {
  terms: LegalDocument.parse(bundledTerms),
  privacy: LegalDocument.parse(bundledPrivacy),
};

// MMKV, read synchronously: the last text received opens at once, offline included, no toast.
const storage = createMMKV({ id: 'legal' });
const keyOf = (doc: LegalDoc, locale: AppLocale) => `legal.${doc}.${locale}`;

/** The last text received in `locale`, checked against its schema; null when none reads. */
function keptDocument(doc: LegalDoc, locale: AppLocale): LegalDocument | null {
  const stored = storage.getString(keyOf(doc, locale));
  if (!stored) {
    return null;
  }
  try {
    const parsed = LegalDocument.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** What opens before any answer: the last text received, or the copy shipped with the app. */
export const shownBeforeAnswer = (doc: LegalDoc, locale: AppLocale): LegalDocument =>
  keptDocument(doc, locale) ?? bundled[doc];

/**
 * A legal text in the language of the app: the one kept on the phone at once, then the API's,
 * asked at each opening and kept in its turn. Offline or on a failure, the text kept stays,
 * without a word: it is always there.
 */
export function useLegalDocument(doc: LegalDoc): LegalDocument {
  const { i18n } = useTranslation();
  const locale: AppLocale = i18n.language === 'en' ? 'en' : 'fr';
  const query = useQuery({
    queryKey: ['legal', doc, locale],
    queryFn: async ({ signal }) => {
      const document = await api.getLegalDocument(doc, locale, signal);
      storage.set(keyOf(doc, locale), JSON.stringify(document));
      return document;
    },
    initialData: () => shownBeforeAnswer(doc, locale),
    // Stale from the start: asked once per opening when the network is there.
    initialDataUpdatedAt: 0,
    retry: false,
  });
  return query.data;
}
