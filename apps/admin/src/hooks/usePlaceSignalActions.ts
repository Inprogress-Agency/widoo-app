import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import { useRouteAction } from './useRouteAction';

const texts = messages.reports.places.toasts;

/**
 * The decisions on a place the community flagged (A-03): mark it verified, or close it, which
 * puts the published routes that go through it « à corriger ». `onSettled` is called once the
 * place has its new status, from this action or from another member of the team.
 */
export function usePlaceSignalActions(onSettled: () => void) {
  const { isBusy, send } = useRouteAction(onSettled);
  const { api } = getSessionClients();
  return {
    isBusy,
    verify: (placeId: string) => send(() => api.verifyPlace(placeId), texts.verified),
    close: (placeId: string, reason: string) =>
      send(() => api.closePlace(placeId, { reason }), texts.closed),
  };
}
