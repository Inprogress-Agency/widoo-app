import { CertifiedSeal } from '@/components/moderation/CertifiedSeal';
import { WaitingTime } from '@/components/moderation/WaitingTime';
import { messages } from '@/messages/fr';
import { CrownSimpleIcon, MapPinIcon } from '@phosphor-icons/react/dist/ssr';
import type { ModerationRouteDetail } from '@widoo/shared';
import { StatusBadge } from '@widoo/ui';

const texts = messages.moderation.sheet;

type SheetHeaderProps = {
  route: ModerationRouteDetail;
  /** True when the route has been waiting for more than 72 hours. */
  isLate: boolean;
};

/** Top of the sheet: status, revision and Premium badges, title, author, city and waiting time. */
export function SheetHeader({ route, isLate }: SheetHeaderProps) {
  const isWaiting = route.status === 'pending' || route.status === 'changes_requested';
  return (
    <header className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center gap-8">
        <StatusBadge tone={route.status === 'pending' ? 'info' : 'neutral'}>
          {texts.statuses[route.status]}
        </StatusBadge>
        {route.isRevision ? (
          <StatusBadge tone="neutral">{messages.moderation.revision}</StatusBadge>
        ) : null}
        {route.isPremiumComputed ? (
          <>
            <StatusBadge
              tone="strong"
              icon={<CrownSimpleIcon aria-hidden weight="fill" className="size-16 text-amber" />}
            >
              {texts.premium}
            </StatusBadge>
            <span className="text-label text-muted-foreground">
              {texts.premiumComputed(route.premiumMinSteps)}
            </span>
          </>
        ) : null}
      </div>
      <h2 className="text-title-xl">{route.title}</h2>
      <div className="flex flex-wrap items-center gap-16 text-body-s text-muted-foreground">
        <span className="inline-flex items-center gap-6 text-foreground">
          {route.author ? (
            <>
              {route.author.firstName}
              {route.author.isCertified ? <CertifiedSeal /> : null}
            </>
          ) : (
            messages.moderation.noAuthor
          )}
        </span>
        <span className="inline-flex items-center gap-6">
          <MapPinIcon aria-hidden className="size-16" />
          {route.cityName}
        </span>
        {isWaiting ? (
          <span className="inline-flex items-center gap-6">
            {texts.waitingSince}
            <WaitingTime since={new Date(route.waitingSince)} isLate={isLate} />
          </span>
        ) : null}
      </div>
    </header>
  );
}
