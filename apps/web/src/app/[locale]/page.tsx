import { appName, publisher, site } from '@/config/site';
import { HomeContainer } from '@/containers/HomeContainer';
import { getMessages, readLocale } from '@/lib/i18n/messages';
import { homeJsonLd } from '@/lib/json-ld';
import { getIdeaRoutes } from '@/lib/ideas/source';
import { getHeroReviews } from '@/lib/reviews/source';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = readLocale((await params).locale);
  const { meta } = getMessages(locale);
  return buildMetadata({
    siteUrl: site.SITE_URL,
    siteName: appName,
    indexable: site.SITE_INDEXABLE,
    locale,
    path: '/',
    title: meta.home.title,
    description: meta.home.description,
  });
}

export default async function HomePage({ params }: Props) {
  const locale = readLocale((await params).locale);
  const messages = getMessages(locale);
  const jsonLd = homeJsonLd({
    siteUrl: site.SITE_URL,
    locale,
    appName,
    publisherName: publisher.name,
    appDescription: messages.structuredData.appDescription,
    appStoreUrl: site.APP_STORE_URL,
    playStoreUrl: site.PLAY_STORE_URL,
  });
  return (
    <HomeContainer
      locale={locale}
      messages={messages}
      stores={{ appStoreUrl: site.APP_STORE_URL, playStoreUrl: site.PLAY_STORE_URL }}
      appLink={new URL('/app', site.SITE_URL).toString()}
      reviews={await getHeroReviews()}
      ideaRoutes={await getIdeaRoutes()}
      now={new Date()}
      jsonLd={jsonLd}
    />
  );
}
