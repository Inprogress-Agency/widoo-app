import { notifyCountersStale } from '@/hooks/useAdminCounters';
import { messages } from '@/messages/fr';
import { conflictStatusLabel } from '@/lib/conflict-status';
import { ApiRequestError } from '@widoo/api-client';
import { showToast } from '@widoo/ui';
import { useState } from 'react';

const texts = messages.moderation.decisions.toasts;

/** How an action ended: the route was published (the sheet stays), or anything else. */
export type RouteActionOutcome = 'published' | 'other';

/**
 * Sends an action of the team on a route, a report or a place and tells its result in a toast.
 * `onSettled` is called once it is settled, by this action or by the one another member of the
 * team took first (409 `already_decided`, told with the status it was given): the screen then
 * moves on. The counters of the navigation are read again at once.
 */
export function useRouteAction(onSettled: (outcome: RouteActionOutcome) => void) {
  const [isBusy, setIsBusy] = useState(false);

  const send = async (
    action: () => Promise<unknown>,
    successTitle: string,
    outcome: RouteActionOutcome = 'other',
  ) => {
    setIsBusy(true);
    try {
      await action();
      showToast('success', { title: successTitle });
      notifyCountersStale();
      onSettled(outcome);
    } catch (error) {
      const conflict =
        error instanceof ApiRequestError && error.code === 'already_decided'
          ? conflictStatusLabel(error.body?.details)
          : null;
      if (conflict) {
        showToast('info', { title: texts.alreadyDecided(conflict) });
        notifyCountersStale();
        onSettled('other');
      } else {
        const isInvalidMessage =
          error instanceof ApiRequestError && error.code === 'validation_error';
        showToast('error', { title: isInvalidMessage ? texts.invalidMessage : texts.failed });
      }
    } finally {
      setIsBusy(false);
    }
  };

  return { isBusy, send };
}
