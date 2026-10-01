import type { SiteLocale } from '@/config/locales';
import { appName, appScheme, site } from '@/config/site';
import { SharedRouteContainer } from '@/containers/SharedRouteContainer';
import { formatShortDate } from '@/lib/format';
import { fill } from '@/lib/i18n/fill';
import { getMessages, readLocale } from '@/lib/i18n/messages';
import { buildMetadata } from '@/lib/seo';
import { describeSharedRoute } from '@/lib/shared-route/display';
import { getSharedRoute } from '@/lib/shared-route/source';
import { appRouteLink, readSource } from '@/lib/store-links';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** One call to the API per request, shared by the metadata and the page. */
const loadSharedRoute = cache(getSharedRoute);

async function readProps({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  const query = await searchParams;
  const locale = readLocale(segment);
  const token = first(query.token);
  return {
    locale,
    id,
    token,
    source: readSource(first(query.src)),
    result: await loadSharedRoute(id, token, locale),
  };
}

/** Address of the shared link, the token of a private link included. */
function shareLink(id: string, token: string | undefined): string {
  const link = new URL(`/r/${encodeURIComponent(id)}`, site.SITE_URL);
  if (token) link.searchParams.set('token', token);
  return link.toString();
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, id, token, result } = await readProps(props);
  const messages = getMessages(locale);
  const texts = messages.sharedRoute;
  const base = { siteUrl: site.SITE_URL, siteName: appName, indexable: site.SITE_INDEXABLE };
  // Pages `/r/` are never indexed (E-21); the preview in messaging apps still reads them. An
  // unknown link shows the notice of a removed route (D-074).
  if (result.kind === 'removed' || result.kind === 'unknown') {
    return withPreviewImage(
      buildMetadata({
        ...base,
        locale,
        path: `/r/${id}`,
        title: fill(texts.metaTitle, { title: texts.removedTitle }),
        noIndex: true,
      }),
      locale,
      id,
    );
  }

  const display = describeSharedRoute(result.route, locale, messages);
  const details = [display.place, display.duration, display.budget.text]
    .filter(Boolean)
    .join(' · ');
  const metadata = buildMetadata({
    ...base,
    locale,
    path: `/r/${id}`,
    title: fill(texts.metaTitle, { title: result.route.title }),
    description: fill(texts.metaDescription, { details }),
    noIndex: true,
  });
  // The preview of a private link must open the same link, its token included.
  return withPreviewImage(
    { ...metadata, openGraph: { ...metadata.openGraph, url: shareLink(id, token) } },
    locale,
    id,
  );
}

/**
 * Image of the link preview (`preview-image`), at its full address from SITE_URL, for Open Graph
 * and the Twitter card.
 */
function withPreviewImage(metadata: Metadata, locale: SiteLocale, id: string): Metadata {
  const url = new URL(`/${locale}/r/${encodeURIComponent(id)}/preview-image`, site.SITE_URL);
  const image = { url: url.toString(), width: 1200, height: 630, alt: appName };
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images: [image] },
    twitter: { ...metadata.twitter, images: [image] },
  };
}

export default async function SharedRoutePage(props: Props) {
  const { locale, id, token, source, result } = await readProps(props);
  const messages = getMessages(locale);
  const stores = { appStoreUrl: site.APP_STORE_URL, playStoreUrl: site.PLAY_STORE_URL };

  // Status 404, with the notice of a removed route (`not-found.tsx` of this segment, D-074).
  if (result.kind === 'unknown') notFound();
  if (result.kind === 'removed') {
    const texts = messages.sharedRoute;
    // « 20 sept. » ends with the dot of the abbreviation: the sentence brings its own.
    const body = result.removedAt
      ? fill(texts.removedBody, {
          date: formatShortDate(result.removedAt, locale).replace(/\.$/, ''),
        })
      : texts.removedBodyUndated;
    return (
      <SharedRouteContainer
        kind="removed"
        body={body}
        locale={locale}
        messages={messages}
        stores={stores}
      />
    );
  }

  const isPrivate = result.kind === 'private';
  return (
    <SharedRouteContainer
      kind="shared"
      locale={locale}
      route={result.route}
      display={describeSharedRoute(result.route, locale, messages, { isPrivate })}
      isPrivate={isPrivate}
      appLink={appRouteLink(appScheme, result.route.id, token)}
      shareLink={shareLink(id, token)}
      source={source}
      messages={messages}
      stores={stores}
    />
  );
}
