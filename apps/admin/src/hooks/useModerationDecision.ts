import { notifyCountersStale } from '@/hooks/useAdminCounters';
import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import { ApiRequestError } from '@widoo/api-client';
import {
  AlreadyDecidedDetails,
  labels,
  type ModerationDecision,
  type RejectionReason,
} from '@widoo/shared';
import { showToast } from '@widoo/ui';
import { useState } from 'react';

const texts = messages.moderation.decisions.toasts;

/**
 * Sends the decisions of a moderator on a route and tells the result in a toast. `onSettled` is
 * called once the route has a decision, the moderator's own or the one another member of the
 * team took first (409 `already_decided`): the screen then moves on.
 */
export function useModerationDecision(
  routeId: string,
  onSettled: (outcome: 'published' | 'other') => void,
) {
  const [isBusy, setIsBusy] = useState(false);

  const send = async (
    decide: () => Promise<ModerationDecision>,
    successTitle: string,
    outcome: 'published' | 'other',
  ) => {
    setIsBusy(true);
    try {
      await decide();
      showToast('success', { title: successTitle });
      notifyCountersStale();
      onSettled(outcome);
    } catch (error) {
      const details =
        error instanceof ApiRequestError && error.code === 'already_decided'
          ? AlreadyDecidedDetails.safeParse(error.body?.details)
          : undefined;
      if (details?.success) {
        showToast('info', {
          title: texts.alreadyDecided(labels.fr.routeStatuses[details.data.status]),
        });
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

  const { api } = getSessionClients();
  return {
    isBusy,
    publish: () => send(() => api.publishRoute(routeId), texts.published, 'published'),
    requestChanges: (message: string) =>
      send(() => api.requestRouteChanges(routeId, { message }), texts.changesRequested, 'other'),
    reject: (reasonCode: RejectionReason, message: string) =>
      send(() => api.rejectRoute(routeId, { reasonCode, message }), texts.rejected, 'other'),
  };
}
