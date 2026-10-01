import { BlueFrame } from '@/components/layout/BlueFrame';
import { RoutePlan } from '@/components/plan/RoutePlan';
import { UnknownPin } from '@/components/plan/UnknownPin';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { StoreBadges } from '@/components/ui/StoreBadges';
import { unfinishedPlan } from '@/config/example-plan';
import type { SiteLocale } from '@/config/locales';
import { localizedPath } from '@/lib/seo';
import type { StoreLinks } from '@/lib/store-links';
import type { Messages } from '@/messages';

/**
 * Missing page (E-21, D-074), for any unknown address outside `/r/`: in the blue frame, « Cette
 * page n'existe pas », a line, the white button to the home page and the stores; the plan of the
 * example route stopping halfway on a question mark, without labels. Behind the frame on the
 * computer, under the text on the phone and the tablet. The header arrives with #236.
 */
export function NotFoundContainer({
  locale,
  messages,
  stores,
}: {
  locale: SiteLocale;
  messages: Messages;
  stores: StoreLinks;
}) {
  const texts = messages.notFound;
  return (
    <BlueFrame backdrop={<DesktopPlan />} below={<PhoneAndTabletPlan />}>
      <title>{messages.meta.notFound.title}</title>
      <div className="flex flex-col gap-8 max-md:pt-12 xl:gap-4">
        <h1 className="text-display-m text-on-blue xl:text-display-xl">{texts.title}</h1>
        <p className="text-lead text-on-blue xl:max-w-lost-text xl:text-lead-l">{texts.body}</p>
      </div>
      {/* Measured on E-21: on the phone, a full-width button 24 px under the text; on the
          computer, a 48 px button as wide as its text, 36 px under it. The tablet keeps the
          button of the phone, as wide as its text (as « Ouvrir dans l'app »). */}
      <div className="flex flex-col gap-16 max-md:mt-4 xl:mt-16">
        <ButtonLink
          href={localizedPath(locale, '/')}
          className="md:self-start xl:flex xl:h-button-h xl:items-center xl:justify-center xl:px-28"
        >
          {texts.ideas}
        </ButtonLink>
        <StoreBadges locale={locale} texts={messages.stores} {...stores} />
      </div>
    </BlueFrame>
  );
}

/** Computer: the plan of the shared link, at the same place, the route stopping halfway. */
function DesktopPlan() {
  return (
    <RoutePlan
      plan={unfinishedPlan}
      anchor={{ x: '74%', y: '50%' }}
      offset={{ x: -39, y: -1 }}
      fade="left"
      horizon
      labels={false}
      end={<UnknownPin />}
      className="absolute hidden size-full xl:block"
    />
  );
}

/**
 * Phone and tablet: the plan under the text, the question mark near its top and the start cut by
 * the bottom of the frame (E-21, phone; the tablet follows the phone).
 */
function PhoneAndTabletPlan() {
  return (
    <>
      <RoutePlan
        plan={unfinishedPlan}
        anchor={{ x: '50%', y: '0%' }}
        offset={{ x: 1, y: 144 }}
        scale={0.52}
        compact
        fade="top"
        labels={false}
        end={<UnknownPin small />}
        className="relative h-plan-phone md:hidden"
      />
      <RoutePlan
        plan={unfinishedPlan}
        anchor={{ x: '50%', y: '0%' }}
        offset={{ x: 37, y: 215 }}
        scale={0.88}
        fade="top"
        labels={false}
        end={<UnknownPin />}
        className="relative hidden h-plan-tablet md:block xl:hidden"
      />
    </>
  );
}
