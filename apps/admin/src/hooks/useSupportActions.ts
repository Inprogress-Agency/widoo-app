import { notifyCountersStale } from '@/hooks/useAdminCounters';
import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import { ApiRequestError } from '@widoo/api-client';
import { showToast } from '@widoo/ui';
import { useState } from 'react';

const texts = messages.support.toasts;

/**
 * Marks a message of « Nous écrire » handled (A-13) and tells the result in a toast. `onSettled`
 * is called once it is handled, by this action or by another member of the team who got there
 * first (409 `already_decided`): the screen then reads the message again. The counter of the
 * navigation is read again at once.
 */
export function useSupportActions(onSettled: () => void) {
  const [isBusy, setIsBusy] = useState(false);
  const { api } = getSessionClients();

  const markHandled = async (messageId: string) => {
    setIsBusy(true);
    try {
      await api.markSupportMessageHandled(messageId);
      showToast('success', { title: texts.handled });
      notifyCountersStale();
      onSettled();
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'already_decided') {
        showToast('info', { title: texts.alreadyHandled });
        notifyCountersStale();
        onSettled();
      } else {
        showToast('error', { title: texts.failed });
      }
    } finally {
      setIsBusy(false);
    }
  };

  return { isBusy, markHandled };
}
