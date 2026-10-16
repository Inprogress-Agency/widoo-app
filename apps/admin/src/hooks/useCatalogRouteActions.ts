import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import type { RejectionReason } from '@widoo/shared';
import { useRouteAction } from './useRouteAction';

const texts = messages.catalog.routes.toasts;

/**
 * The actions of the team on a route of the catalog (A-04): take it down, put it back online,
 * hand it over to the Widoo team. `onSettled` is called once the route changed.
 */
export function useCatalogRouteActions(routeId: string, onSettled: () => void) {
  const { isBusy, send } = useRouteAction(onSettled);
  const { api } = getSessionClients();
  return {
    isBusy,
    unpublish: (reasonCode: RejectionReason, message: string) =>
      send(() => api.unpublishRoute(routeId, { reasonCode, message }), texts.unpublished),
    republish: (message: string) =>
      send(() => api.republishRoute(routeId, { message }), texts.republished),
    reassign: () => send(() => api.reassignRoute(routeId), texts.reassigned),
  };
}
