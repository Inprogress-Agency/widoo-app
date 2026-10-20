import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import { ApiRequestError } from '@widoo/api-client';
import type { B2bClient, B2bClientInput, B2bClientPatch } from '@widoo/shared';
import { showToast } from '@widoo/ui';
import { useState } from 'react';

const texts = messages.b2b.toasts;

/** The toast of a failed save: a slug taken, routes that cannot be chosen, a refused field, or any other failure. */
function failureTitleOf(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 409) {
      return error.body?.details?.reason === 'routes_unavailable'
        ? texts.routesUnavailable
        : texts.slugTaken;
    }
    if (error.status === 400 || error.status === 422) return texts.invalid;
  }
  return texts.failed;
}

/**
 * Registers or changes a B2B partner (A-10) and tells the result in a toast. `onSaved` is called
 * with the partner as saved: the list and its card are then read again.
 */
export function usePartnerActions(onSaved: (partner: B2bClient) => void) {
  const [isBusy, setIsBusy] = useState(false);
  const { api } = getSessionClients();

  const send = async (action: () => Promise<B2bClient>, successTitle: string) => {
    setIsBusy(true);
    try {
      const partner = await action();
      showToast('success', { title: successTitle });
      onSaved(partner);
    } catch (error) {
      showToast('error', { title: failureTitleOf(error) });
    } finally {
      setIsBusy(false);
    }
  };

  return {
    isBusy,
    create: (partner: B2bClientInput) => send(() => api.createB2bClient(partner), texts.created),
    update: (partnerId: string, patch: B2bClientPatch) =>
      send(() => api.updateB2bClient(partnerId, patch), texts.updated),
    setRoutes: (partnerId: string, routeIds: string[]) =>
      send(() => api.setB2bClientRoutes(partnerId, { routeIds }), texts.routesSaved),
  };
}
