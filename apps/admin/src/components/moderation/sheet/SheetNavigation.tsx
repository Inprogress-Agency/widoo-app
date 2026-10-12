import { sectionPaths } from '@/config/navigation';
import { messages } from '@/messages/fr';
import { ArrowLeftIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react/dist/ssr';
import type { ModerationRouteDetail } from '@widoo/shared';
import { cn } from '@widoo/ui';
import Link from 'next/link';

const texts = messages.moderation.sheet;

/** Address of the moderation sheet of a route. */
export const sheetPathOf = (routeId: string) => `${sectionPaths.moderation}/${routeId}`;

type NeighbourLinkProps = { routeId: string | null; label: string; direction: 'previous' | 'next' };

/** Arrow to the previous or next route of the queue; grayed out at either end. */
function NeighbourLink({ routeId, label, direction }: NeighbourLinkProps) {
  const Icon = direction === 'previous' ? CaretLeftIcon : CaretRightIcon;
  const className = 'flex size-32 items-center justify-center rounded-pill';
  if (!routeId) {
    return (
      <span aria-hidden className={cn(className, 'text-control-border-disabled')}>
        <Icon className="size-16" />
      </span>
    );
  }
  return (
    <Link
      href={sheetPathOf(routeId)}
      aria-label={label}
      className={cn(className, 'hover:bg-accent')}
    >
      <Icon aria-hidden className="size-16" />
    </Link>
  );
}

/** Above the sheet: back to the queue, « Parcours 1 sur 14 », and the arrows to its neighbours. */
export function SheetNavigation({ queue }: { queue: ModerationRouteDetail['queue'] }) {
  return (
    <nav aria-label={texts.back} className="flex items-center gap-16">
      <Link
        href={sectionPaths.moderation}
        className="inline-flex items-center gap-8 rounded-pill text-control hover:underline"
      >
        <ArrowLeftIcon aria-hidden className="size-16" />
        {texts.back}
      </Link>
      {queue ? (
        <>
          <span className="text-body-s text-muted-foreground">
            {texts.position(queue.position, queue.total)}
          </span>
          <span className="flex items-center gap-4">
            <NeighbourLink routeId={queue.previousId} label={texts.previous} direction="previous" />
            <NeighbourLink routeId={queue.nextId} label={texts.next} direction="next" />
          </span>
        </>
      ) : null}
    </nav>
  );
}
