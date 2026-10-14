import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatePlannedRoute, PlannedRoute, UpdatePlannedRoute } from '@widoo/shared';
import { api } from '../api/client';
import { session, useSession } from '../auth';

/** The plannings of `uid`: another account signed in on the phone never reads them. */
export const plannedQueryKey = (uid: string) => ['planned', uid] as const;

/** E-08 lists them by pages; the sheet only needs to know whether a route is planned. */
const PLANNED_PAGE = 50;

const listPlanned = ({ signal }: { signal?: AbortSignal }) =>
  api.listPlanned({ status: 'planned', limit: PLANNED_PAGE }, signal);

/**
 * The planning to come of a route, asked at the moment « Programmer » opens the sheet: right after
 * a sign-in, the account may already have planned it. Null when the API cannot say.
 */
export function usePlannedLookup() {
  const client = useQueryClient();
  return async (routeId: string): Promise<PlannedRoute | null> => {
    const uid = session.store.getState().user?.uid;
    if (!uid) {
      return null;
    }
    const list = await client
      .ensureQueryData({ queryKey: plannedQueryKey(uid), queryFn: listPlanned })
      .catch(() => null);
    return list?.items.find((planned) => planned.routeId === routeId) ?? null;
  };
}

/**
 * The planning to come of `routeId`, for the caller: on the route sheet, « Programmer » becomes
 * its date and opens it (Ecrans › E-05, barre collée). Null signed out, or when none.
 */
export function usePlannedRoute(routeId: string): PlannedRoute | null {
  const uid = useSession((state) => state.user?.uid ?? null);
  const { data } = useQuery({
    queryKey: plannedQueryKey(uid ?? ''),
    queryFn: listPlanned,
    enabled: uid !== null,
  });
  return uid ? (data?.items.find((planned) => planned.routeId === routeId) ?? null) : null;
}

/**
 * `POST /me/planned`, then the bookings ticked before it in one `PATCH`; or the move of a
 * planning, its start and its bookings together. The plannings shown take the answer.
 */
export function usePlanActions() {
  const client = useQueryClient();
  const uid = useSession((state) => state.user?.uid ?? null);
  const refresh = () => client.invalidateQueries({ queryKey: plannedQueryKey(uid ?? '') });

  return {
    async create(body: CreatePlannedRoute, checklist: UpdatePlannedRoute['checklist']) {
      let planned = await api.createPlanned(body);
      if (checklist && checklist.length > 0) {
        // The planning exists: a failure of the ticks loses them, never the planning.
        planned = await api.updatePlanned(planned.id, { checklist }).catch(() => planned);
      }
      await refresh();
      return planned;
    },
    async update(id: string, update: UpdatePlannedRoute) {
      const planned = await api.updatePlanned(id, update);
      await refresh();
      return planned;
    },
  };
}
