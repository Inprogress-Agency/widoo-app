import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import { useRouteAction } from './useRouteAction';

const texts = messages.reports.ratings.toasts;

/**
 * The decisions on a rating (A-03): mask it, or restore it. `onSettled` is called once the rating
 * has its new status, from this action or from another member of the team.
 */
export function useRatingActions(onSettled: () => void) {
  const { isBusy, send } = useRouteAction(onSettled);
  const { api } = getSessionClients();
  return {
    isBusy,
    hide: (ratingId: string, reason: string) =>
      send(() => api.hideRating(ratingId, { reason }), texts.hidden),
    unhide: (ratingId: string) => send(() => api.unhideRating(ratingId), texts.unhidden),
  };
}
