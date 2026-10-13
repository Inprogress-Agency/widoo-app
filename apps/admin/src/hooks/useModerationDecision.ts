import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import type { RejectionReason } from '@widoo/shared';
import { useRouteAction } from './useRouteAction';

const texts = messages.moderation.decisions.toasts;

/**
 * The decisions of a moderator on a pending route (A-02). `onSettled` is called once the route
 * has a decision, the moderator's own or the one another member of the team took first.
 */
export function useModerationDecision(routeId: string, onSettled: () => void) {
  const { isBusy, send } = useRouteAction(onSettled);
  const { api } = getSessionClients();
  return {
    isBusy,
    publish: () => send(() => api.publishRoute(routeId), texts.published),
    requestChanges: (message: string) =>
      send(() => api.requestRouteChanges(routeId, { message }), texts.changesRequested),
    reject: (reasonCode: RejectionReason, message: string) =>
      send(() => api.rejectRoute(routeId, { reasonCode, message }), texts.rejected),
  };
}
