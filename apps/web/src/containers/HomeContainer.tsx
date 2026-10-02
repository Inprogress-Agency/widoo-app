import { Districts } from '@/components/home/districts/Districts';
import { HowItWorks } from '@/components/home/how-it-works/HowItWorks';
import { Ideas } from '@/components/home/ideas/Ideas';
import { ReviewStack } from '@/components/home/ReviewStack';
import { RouteSticker } from '@/components/home/RouteSticker';
import { BlueFrame } from '@/components/layout/BlueFrame';
import { PlanOverlay } from '@/components/plan/PlanOverlay';
import { RoutePlan } from '@/components/plan/RoutePlan';
import { JsonLd } from '@/components/seo/JsonLd';
import { QrLink } from '@/components/ui/QrLink';
import { StoreBadges } from '@/components/ui/StoreBadges';
import { examplePlan, exampleRoute } from '@/config/example-plan';
import type { SiteLocale } from '@/config/locales';
import { heroMotion } from '@/config/motion';
import { formatDuration } from '@/lib/format';
import { fill, plural } from '@/lib/i18n/fill';
import type { DistrictRoutes } from '@/lib/districts/types';
import type { IdeaRoutes } from '@/lib/ideas/types';
import type { AppReview } from '@/lib/reviews/types';
import type { StoreLinks } from '@/lib/store-links';
import type { Messages } from '@/messages';
import type { ReactNode } from 'react';

type Props = {
  locale: SiteLocale;
  messages: Messages;
  stores: StoreLinks;
  /** Address of `/app`, behind the QR code of the computer. */
  appLink: string;
  reviews: AppReview[];
  /** Example routes of the moods (E-21 › Envies), from the API. */
  ideaRoutes: IdeaRoutes;
  /** Example route of each district (E-21 › Quartiers), from the API. */
  districtRoutes: DistrictRoutes;
  now: Date;
  jsonLd: Record<string, unknown>;
};

/**
 * Home page of the site (E-21). The hero: title, line, stores and, on the computer, the QR code
 * of `/app`; the blue plan of the example route with its sticker and a review. The plan sits
 * behind the frame on the computer, under the text on the phone and the tablet. Then the sections:
 * « Comment ça marche », the moods and the districts (#237); the others arrive with #238.
 */
export function HomeContainer({
  locale,
  messages,
  stores,
  appLink,
  reviews,
  ideaRoutes,
  districtRoutes,
  now,
  jsonLd,
}: Props) {
  const texts = messages.home;
  const sticker = (
    <RouteSticker
      title={exampleRoute.title}
      meta={fill(texts.stickerMeta, {
        steps: plural(exampleRoute.stepCount, messages.sharedRoute.steps, locale),
        duration: formatDuration(exampleRoute.durationMin, locale),
      })}
    />
  );
  const review = (tilt?: 'rotate-review-phone') => (
    <ReviewStack reviews={reviews} locale={locale} now={now} texts={texts} tilt={tilt} />
  );
  return (
    <>
      <JsonLd data={jsonLd} />
      <BlueFrame
        column="hero"
        after={
          <>
            <HowItWorks texts={messages.howItWorks} />
            <Ideas locale={locale} messages={messages} routes={ideaRoutes} />
            <Districts locale={locale} texts={messages.districts} routes={districtRoutes} />
          </>
        }
        backdrop={<DesktopPlan walkText={messages.plan.walk} review={review()} sticker={sticker} />}
        below={
          <PhoneAndTabletPlan
            walkText={messages.plan.walk}
            phoneReview={review('rotate-review-phone')}
            tabletReview={review()}
            sticker={sticker}
          />
        }
      >
        <div className="flex flex-col gap-6 md:gap-8">
          <Rise order={0}>
            <h1 className="text-hero text-on-blue md:text-hero-l xl:text-hero-xl">{texts.title}</h1>
          </Rise>
          <Rise order={1}>
            <p className="text-lead text-on-blue max-md:max-w-tagline-phone md:max-w-tagline-tablet md:text-lead-l xl:max-w-lost-text xl:text-lead-xl">
              {texts.tagline}
            </p>
          </Rise>
        </div>
        <Rise order={2}>
          {/* 28 px under the text, 40 px on the computer (measured on E-21). */}
          <div className="mt-8 flex items-center gap-20 xl:mt-20">
            <StoreBadges layout="hero" locale={locale} texts={messages.stores} {...stores} />
            <div className="hidden xl:block">
              <QrLink link={appLink} label={texts.qrLabel} size="hero" />
            </div>
          </div>
        </Rise>
      </BlueFrame>
    </>
  );
}

/** The text of the hero rises 10 px, one block after the other (E-21 › Mouvement). */
function Rise({ order, children }: { order: number; children: ReactNode }) {
  return (
    <div
      className="animate-rise motion-reduce:animate-plan-fade"
      style={{ animationDelay: `${order * heroMotion.textStagger}ms` }}
    >
      {children}
    </div>
  );
}

const desktopAnchor = { x: '74%', y: '50%' };

/**
 * Computer: the plan of the shared link, at the same place (E-21), the review above the route on
 * the left and the sticker at the bottom right, measured from the anchor of the plan.
 */
function DesktopPlan({
  walkText,
  review,
  sticker,
}: {
  walkText: string;
  review: ReactNode;
  sticker: ReactNode;
}) {
  return (
    <div className="absolute hidden size-full xl:block">
      <RoutePlan
        plan={examplePlan}
        walkText={walkText}
        anchor={desktopAnchor}
        offset={{ x: -39, y: -1 }}
        fade="left"
        horizon
        className="absolute size-full"
      />
      <PlanOverlay anchor={desktopAnchor} offset={{ x: -283, y: -227 }}>
        {review}
      </PlanOverlay>
      <PlanOverlay anchor={desktopAnchor} offset={{ x: 213, y: 220 }}>
        {sticker}
      </PlanOverlay>
    </div>
  );
}

const belowAnchor = { x: '50%', y: '0%' };

/**
 * Phone: the plan under the text, short names, the review over its bottom. Tablet: the plan with
 * the walking times, the review at the top left and the sticker at the bottom right (E-21,
 * D-070). Heights and places measured on the mockups.
 */
function PhoneAndTabletPlan({
  walkText,
  phoneReview,
  tabletReview,
  sticker,
}: {
  walkText: string;
  phoneReview: ReactNode;
  tabletReview: ReactNode;
  sticker: ReactNode;
}) {
  return (
    <>
      <div className="relative h-plan-hero-phone md:hidden">
        <RoutePlan
          plan={examplePlan}
          anchor={belowAnchor}
          offset={{ x: 7, y: 145 }}
          scale={0.52}
          compact
          fade="top"
          horizon
          className="absolute size-full"
        />
        <PlanOverlay anchor={belowAnchor} offset={{ x: 6, y: 399 }}>
          {phoneReview}
        </PlanOverlay>
      </div>
      <div className="relative hidden h-plan-hero-tablet md:block xl:hidden">
        <RoutePlan
          plan={examplePlan}
          walkText={walkText}
          anchor={belowAnchor}
          offset={{ x: -7, y: 260 }}
          scale={0.83}
          fade="top"
          horizon
          className="absolute size-full"
        />
        <PlanOverlay anchor={belowAnchor} offset={{ x: -196, y: 61 }}>
          {tabletReview}
        </PlanOverlay>
        <PlanOverlay anchor={belowAnchor} offset={{ x: 240, y: 415 }}>
          {sticker}
        </PlanOverlay>
      </div>
    </>
  );
}
