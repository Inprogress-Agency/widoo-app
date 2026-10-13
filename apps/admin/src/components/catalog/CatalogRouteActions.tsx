import { SideCard } from '@/components/moderation/sheet/SideCard';
import { messages } from '@/messages/fr';
import {
  ArrowCounterClockwiseIcon,
  ProhibitIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react/dist/ssr';
import { Button } from '@widoo/ui';

const texts = messages.catalog.routes.sheet;

type CatalogRouteActionsProps = {
  /** Absent when the action does not apply to the route, or is not for the role. */
  onUnpublish?: () => void;
  onRepublish?: () => void;
  onReassign?: () => void;
  isBusy: boolean;
};

/**
 * What the team may do to a route of the catalog (A-04): take it down, put it back online, hand
 * it over to the Widoo team. Each one opens a window that names its effect.
 */
export function CatalogRouteActions({
  onUnpublish,
  onRepublish,
  onReassign,
  isBusy,
}: CatalogRouteActionsProps) {
  const hasAction = Boolean(onUnpublish ?? onRepublish ?? onReassign);
  return (
    <SideCard title={texts.actions}>
      {hasAction ? (
        <div className="flex flex-col gap-8">
          {onRepublish ? (
            <Button onClick={onRepublish} disabled={isBusy}>
              <ArrowCounterClockwiseIcon aria-hidden className="size-18" />
              {texts.republish}
            </Button>
          ) : null}
          {onReassign ? (
            <Button variant="outline" onClick={onReassign} disabled={isBusy}>
              <UsersThreeIcon aria-hidden className="size-18" />
              {texts.reassign}
            </Button>
          ) : null}
          {onUnpublish ? (
            <Button variant="destructiveOutline" onClick={onUnpublish} disabled={isBusy}>
              <ProhibitIcon aria-hidden className="size-18" />
              {texts.unpublish}
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-body-s text-muted-foreground">{texts.noAction}</p>
      )}
    </SideCard>
  );
}
