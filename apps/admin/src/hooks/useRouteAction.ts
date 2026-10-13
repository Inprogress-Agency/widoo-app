import { messages } from '@/messages/fr';
import { ApiRequestError } from '@widoo/api-client';
import { AlreadyDecidedDetails, labels } from '@widoo/shared';
import { showToast } from '@widoo/ui';
import { useState } from 'react';

const texts = messages.moderation.decisions.toasts;

/**
 * Sends an action of the team on a route and tells its result in a toast. `onSettled` is called
 * once the route is settled, by this action or by the one another member of the team took first
 * (409 `already_decided`, told with the status the route was given): the screen then moves on.
 */
export function useRouteAction(onSettled: () => void) {
  const [isBusy, setIsBusy] = useState(false);

  const send = async (action: () => Promise<unknown>, successTitle: string) => {
    setIsBusy(true);
    try {
      await action();
      showToast('success', { title: successTitle });
      onSettled();
    } catch (error) {
      const details =
        error instanceof ApiRequestError && error.code === 'already_decided'
          ? AlreadyDecidedDetails.safeParse(error.body?.details)
          : undefined;
      if (details?.success) {
        showToast('info', {
          title: texts.alreadyDecided(labels.fr.routeStatuses[details.data.status]),
        });
        onSettled();
      } else {
        showToast('error', { title: texts.failed });
      }
    } finally {
      setIsBusy(false);
    }
  };

  return { isBusy, send };
}
