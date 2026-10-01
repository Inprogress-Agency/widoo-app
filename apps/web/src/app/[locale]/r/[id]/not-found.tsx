import { site } from '@/config/site';
import { SharedRouteContainer } from '@/containers/SharedRouteContainer';
import { getMessages, readLocale } from '@/lib/i18n/messages';
import { locale as localeParam } from 'next/root-params';

/**
 * A link `/r/` the API does not know (wrong or never existed): the notice of a removed route,
 * without date, rather than the missing page of the site (D-074), with its 404. The language is
 * a root parameter: a `not-found` receives no `params`.
 */
export default async function UnknownSharedRoute() {
  const locale = readLocale(await localeParam());
  const messages = getMessages(locale);
  return (
    <SharedRouteContainer
      kind="removed"
      body={messages.sharedRoute.removedBodyUndated}
      locale={locale}
      messages={messages}
      stores={{ appStoreUrl: site.APP_STORE_URL, playStoreUrl: site.PLAY_STORE_URL }}
    />
  );
}
