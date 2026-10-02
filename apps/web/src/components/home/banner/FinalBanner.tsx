import { QrLink } from '@/components/ui/QrLink';
import { StoreBadges } from '@/components/ui/StoreBadges';
import type { SiteLocale } from '@/config/locales';
import type { StoreLinks } from '@/lib/store-links';
import type { Messages } from '@/messages';
import { BannerW } from './BannerW';

/**
 * Final banner of the home page (E-21), target of « Télécharger l'app » and « Tout Paris est dans
 * l'app »: in a blue frame, the W of the logo turned, « Votre prochaine sortie commence ici », the
 * stores and, on the computer, the QR code of `/app`. Phone: the text under the W; tablet and
 * computer: on the left, centred in height.
 */
export function FinalBanner({
  locale,
  texts,
  storeTexts,
  qrLabel,
  stores,
  appLink,
}: {
  locale: SiteLocale;
  texts: Messages['banner'];
  storeTexts: Messages['stores'];
  qrLabel: string;
  stores: StoreLinks;
  appLink: string;
}) {
  return (
    <section id="telecharger" aria-labelledby="h-cta" className="px-12 pb-12 md:px-16 md:pb-16">
      <div className="rounded-banner-shell-phone bg-frame-shell p-6 md:rounded-panel md:p-8 md:shadow-map-edge">
        <div className="relative overflow-hidden rounded-banner-phone bg-blue md:flex md:h-banner-tablet md:items-center md:rounded-panel-tablet md:shadow-banner-edge xl:h-banner">
          <BannerW />
          <div className="relative flex flex-col gap-24 max-md:px-20 max-md:pb-36 max-md:pt-250 md:ml-gutter md:w-banner-text-tablet md:gap-28 xl:ml-frame xl:w-banner-text xl:gap-32">
            <div className="flex flex-col gap-10 md:gap-12">
              <h2
                id="h-cta"
                className="text-banner-title text-on-blue md:text-banner-title-l xl:text-section-title-xl"
              >
                {texts.title}
              </h2>
              <p className="text-lead text-on-blue md:text-lead-l xl:text-lead-xl">{texts.lead}</p>
            </div>
            <div className="flex items-center gap-20">
              <StoreBadges layout="banner" locale={locale} texts={storeTexts} {...stores} />
              <div className="hidden xl:block">
                <QrLink link={appLink} label={qrLabel} size="hero" raised />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
