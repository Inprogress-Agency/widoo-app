import { legalPaths, type LegalPage } from '@/config/legal';
import type { SiteLocale } from '@/config/locales';
import { appName, site } from '@/config/site';
import { fill } from '@/lib/i18n/fill';
import { getMessages, readLocale } from '@/lib/i18n/messages';
import { legalNotice } from '@/lib/legal/notice';
import { getLegalText } from '@/lib/legal/source';
import type { LegalText } from '@/lib/legal/types';
import { buildMetadata, localizedPath } from '@/lib/seo';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import { LegalContainer } from './LegalContainer';

type Props = { params: Promise<{ locale: string }> };

/** One call to the API per request, shared by the metadata and the page. */
const loadLegalText = cache(getLegalText);

/** The text of a page: the legal notice is written in the site, the others come from the API. */
const textOf = async (page: LegalPage, locale: SiteLocale): Promise<LegalText | null> =>
  page === 'notice' ? legalNotice[locale] : loadLegalText(page, locale);

/**
 * Page and metadata of a legal text at one of its paths (`slug`, #242). A path of the other
 * language (`/en/conditions`) moves to the one of the page (`/en/terms`), for good; a text the API
 * does not serve is a missing page.
 */
export function legalRoute(page: LegalPage, slug: string) {
  async function read({ params }: Props) {
    const locale = readLocale((await params).locale);
    if (legalPaths[page][locale] !== slug) {
      permanentRedirect(localizedPath(locale, legalPaths[page][locale]));
    }
    return { locale, text: await textOf(page, locale) };
  }

  async function generateMetadata(props: Props): Promise<Metadata> {
    const { locale, text } = await read(props);
    const messages = getMessages(locale);
    return buildMetadata({
      siteUrl: site.SITE_URL,
      siteName: appName,
      indexable: site.SITE_INDEXABLE,
      locale,
      path: legalPaths[page][locale],
      paths: legalPaths[page],
      title: fill(messages.legal.meta.title, { name: messages.footer[page] }),
      description: messages.legal.meta[page],
      noIndex: text === null,
    });
  }

  async function Page(props: Props) {
    const { locale, text } = await read(props);
    if (!text) notFound();
    return <LegalContainer locale={locale} messages={getMessages(locale)} text={text} />;
  }

  return { generateMetadata, Page };
}
