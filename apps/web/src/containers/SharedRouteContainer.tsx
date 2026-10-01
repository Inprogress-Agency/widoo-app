import { BlueFrame } from '@/components/layout/BlueFrame';
import { RoutePlan } from '@/components/plan/RoutePlan';
import { OpenInAppButton } from '@/components/shared-route/OpenInAppButton';
import { QrLink } from '@/components/ui/QrLink';
import { RemovedNotice } from '@/components/shared-route/RemovedNotice';
import { SharedRouteCard } from '@/components/shared-route/SharedRouteCard';
import { StoreBadges } from '@/components/ui/StoreBadges';
import type { SiteLocale } from '@/config/locales';
import { examplePlan, lockPlan, type Plan } from '@/config/example-plan';
import type { SharedRouteDisplay } from '@/lib/shared-route/display';
import type { SharedRoute } from '@/lib/shared-route/types';
import type { StoreLinks } from '@/lib/store-links';
import type { Messages } from '@/messages';
import { ShareFatIcon } from '@phosphor-icons/react/ssr';
import type { ReactNode } from 'react';

type Shared = {
  kind: 'shared';
  route: SharedRoute;
  display: SharedRouteDisplay;
  isPrivate: boolean;
  /** `widoo://route/<id>`. */
  appLink: string;
  /** Address of this page, for the QR code of the computer. */
  shareLink: string;
  source?: string;
};

type Removed = { kind: 'removed'; body: string };

type Props = (Shared | Removed) & { locale: SiteLocale; messages: Messages; stores: StoreLinks };

/**
 * Page of a shared link (E-21), in the blue frame: the card and « Ouvrir dans l'app » on the
 * phone and the tablet, the QR code and the stores on the computer; the notice of a removed route
 * followed by the pitch of the app. The blue plan goes with it: under the content on the phone
 * and the tablet, behind the whole frame on the computer. The layout of the computer starts at
 * 1280 px: below, the card and the route do not fit side by side, and the layout of the tablet
 * (stacked) is kept. Header and landing below arrive with #236 to #238.
 */
export function SharedRouteContainer(props: Props) {
  const { messages, stores } = props;
  const texts = messages.sharedRoute;
  const plan =
    props.kind === 'shared' && props.route.access === 'premium'
      ? lockPlan(examplePlan, messages.placeCategories)
      : examplePlan;
  return (
    <BlueFrame
      backdrop={<DesktopPlan plan={plan} walkText={messages.plan.walk} />}
      below={<PhoneAndTabletPlan plan={plan} walkText={messages.plan.walk} />}
    >
      {props.kind === 'shared' ? (
        <>
          <p className="flex items-center gap-8 text-title-s text-on-blue">
            <ShareFatIcon aria-hidden weight="fill" className="size-icon-l xl:hidden" />
            {texts.heading}
          </p>
          <SharedRouteCard
            route={props.route}
            display={props.display}
            isPrivate={props.isPrivate}
            texts={texts}
          />
          <div className="flex flex-col gap-12 md:flex-row md:items-center md:gap-24 xl:hidden">
            <div className="md:shrink-0">
              <OpenInAppButton
                label={texts.openInApp}
                appLink={props.appLink}
                stores={stores}
                routeId={props.route.id}
                source={props.source}
              />
            </div>
            <p className="text-center text-body text-on-blue md:text-left">{texts.openInAppHint}</p>
          </div>
          <Desktop>
            <QrLink link={props.shareLink} label={texts.qrLabel} />
            <div className="flex flex-col gap-16">
              <p className="max-w-scan-text text-body-medium text-on-blue">{texts.scanHint}</p>
              <StoreBadges locale={props.locale} texts={messages.stores} {...stores} />
            </div>
          </Desktop>
        </>
      ) : (
        <>
          <RemovedNotice title={texts.removedTitle} body={props.body} />
          <div className="flex flex-col gap-12">
            <p className="text-title-xl text-on-blue">{messages.home.title}</p>
            <p className="text-body text-on-blue">{messages.home.tagline}</p>
          </div>
          <StoreBadges locale={props.locale} texts={messages.stores} {...stores} />
        </>
      )}
    </BlueFrame>
  );
}

/**
 * Computer: the plan fills the whole frame behind the content, its streets fading out under the
 * card, the route on the right (E-21).
 */
function DesktopPlan({ plan, walkText }: { plan: Plan; walkText: string }) {
  return (
    <RoutePlan
      plan={plan}
      walkText={walkText}
      anchor={{ x: '74%', y: '50%' }}
      offset={{ x: -39, y: -1 }}
      fade="left"
      horizon
      className="absolute hidden size-full xl:block"
    />
  );
}

/**
 * Phone and tablet: the plan under the content (E-21), the drawing of the computer at 52 % on the
 * phone and 88 % on the tablet, its streets fading in under the text and the route cut by the
 * bottom of the frame, as measured on the mockups.
 */
function PhoneAndTabletPlan({ plan, walkText }: { plan: Plan; walkText: string }) {
  return (
    <>
      <RoutePlan
        plan={plan}
        walkText={walkText}
        anchor={{ x: '50%', y: '0%' }}
        offset={{ x: 0, y: 150 }}
        scale={0.52}
        compact
        fade="top"
        className="relative h-plan-phone md:hidden"
      />
      <RoutePlan
        plan={plan}
        walkText={walkText}
        anchor={{ x: '50%', y: '0%' }}
        offset={{ x: -17, y: 242 }}
        scale={0.88}
        walks={false}
        fade="top"
        className="relative hidden h-plan-tablet md:block xl:hidden"
      />
    </>
  );
}

function Desktop({ children }: { children: ReactNode }) {
  // 40 px under the card, as on the mockup: the gap of the column, plus 20.
  return <div className="hidden items-center gap-20 xl:mt-20 xl:flex">{children}</div>;
}
