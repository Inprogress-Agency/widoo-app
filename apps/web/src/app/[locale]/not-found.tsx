import { defaultLocale, isSiteLocale } from '@/config/locales';
import { site } from '@/config/site';
import { NotFoundContainer } from '@/containers/NotFoundContainer';
import { getMessages } from '@/lib/i18n/messages';
import { locale as localeParam } from 'next/root-params';

/**
 * Missing page in the language of the address, with its 404 (Next.js adds `noindex`). The
 * language is a root parameter: a `not-found` receives no `params`.
 */
export default async function NotFound() {
  const segment = await localeParam();
  const locale = isSiteLocale(segment) ? segment : defaultLocale;
  return (
    <NotFoundContainer
      locale={locale}
      messages={getMessages(locale)}
      stores={{ appStoreUrl: site.APP_STORE_URL, playStoreUrl: site.PLAY_STORE_URL }}
    />
  );
}
