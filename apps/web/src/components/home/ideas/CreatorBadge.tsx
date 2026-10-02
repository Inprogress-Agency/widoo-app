import { WidooIcon } from '@/components/ui/WidooIcon';

/**
 * Who made an example route (E-21 › Envies): the initial of the creator in a white disc, or the
 * logo of Widoo for a route of the team. Decorative: « par … » is written beside it.
 */
export function CreatorBadge({ initial }: { initial: string | null }) {
  if (!initial) return <WidooIcon className="size-credit-logo" />;
  return (
    <span
      aria-hidden
      className="flex size-avatar-s shrink-0 items-center justify-center rounded-pill bg-bg text-credit-initial text-blue-ink"
    >
      {initial}
    </span>
  );
}
