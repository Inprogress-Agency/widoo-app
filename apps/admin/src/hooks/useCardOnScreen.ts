import { useState } from 'react';
import type { RemoteData } from './useRemoteData';
import { useIsSlow } from './useIsSlow';

/** A card that loads faster than this keeps the previous one on screen, without a gray panel. */
const skeletonDelayMs = 300;

/**
 * The card of the record the address names, open next to its list. The card shown last stays on
 * screen while the next one loads (`stale`), so that the panel does not disappear and the list
 * does not widen and narrow again at each click; only a wait longer than 300 ms gives it up
 * (`stale` is null: show a gray panel). `card` is the read of the card of `openId`.
 */
export function useCardOnScreen<Card extends { id: string }>(
  openId: string | null,
  card: RemoteData<Card | null>,
) {
  const fresh = card.status === 'ready' ? card.data : null;
  const [last, setLast] = useState<Card | null>(null);
  if (fresh && fresh !== last) {
    setLast(fresh);
  } else if (!openId && last) {
    setLast(null);
  }
  const isLoading = openId !== null && card.status === 'loading';
  const isSlow = useIsSlow(isLoading, skeletonDelayMs);
  return { fresh, isLoading, stale: isSlow ? null : last };
}
