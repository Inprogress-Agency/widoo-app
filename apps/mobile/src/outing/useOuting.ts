import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlannedRoute, PlannedRouteList } from '@widoo/shared';
import { useState } from 'react';
import { api } from '../api/client';
import { OFFLINE_MAX_AGE_MS } from '../api/search-cache';
import { useSession } from '../auth';
import { plannedQueryKey } from '../plan/planned';

/**
 * One planning, under the key of the plannings: « Programmer », « Annuler » and the Go refresh it
 * with the lists of E-08.
 */
export const outingQueryKey = (uid: string, id: string) =>
  [...plannedQueryKey(uid), 'outing', id] as const;

/**
 * The outing of « Votre sortie »: at once from « À venir » when the list holds it, then from
 * `GET /me/planned/:id`. Null while it loads; `isError` when it cannot be read.
 */
export function useOuting(id: string) {
  const client = useQueryClient();
  const uid = useSession((state) => state.user?.uid ?? null);
  const query = useQuery({
    queryKey: outingQueryKey(uid ?? '', id),
    queryFn: ({ signal }) => api.getPlanned(id, signal),
    enabled: uid !== null,
    gcTime: OFFLINE_MAX_AGE_MS,
    initialData: () =>
      client
        .getQueryData<PlannedRouteList>(plannedQueryKey(uid ?? ''))
        ?.items.find((outing) => outing.id === id),
    initialDataUpdatedAt: () => client.getQueryState(plannedQueryKey(uid ?? ''))?.dataUpdatedAt,
  });
  return {
    outing: query.data ?? null,
    isError: query.isError && !query.data,
    retry: () => void query.refetch(),
  };
}

/**
 * « À préparer » of the page: each box sent as it is ticked, so that it stays ticked when the page
 * opens again; a failure gives the box back its state. « À venir » then counts what is left.
 */
export function useOutingChecklist(outing: PlannedRoute | null, onFailed: () => void) {
  const client = useQueryClient();
  const uid = useSession((state) => state.user?.uid ?? '');
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  // Read once per outing opened: a refetch must not undo a box ticked meanwhile.
  const [readId, setReadId] = useState<string | null>(null);
  if (outing && outing.id !== readId) {
    setReadId(outing.id);
    setChecked(new Set(outing.checklist.filter((item) => item.isChecked).map((i) => i.stepId)));
  }

  const set = (stepId: string, isChecked: boolean) =>
    setChecked((current) => {
      const next = new Set(current);
      if (isChecked) {
        next.add(stepId);
      } else {
        next.delete(stepId);
      }
      return next;
    });

  const toggle = async (stepId: string) => {
    if (!outing) {
      return false;
    }
    const isChecked = !checked.has(stepId);
    set(stepId, isChecked);
    try {
      const saved = await api.updatePlanned(outing.id, { checklist: [{ stepId, isChecked }] });
      client.setQueryData(outingQueryKey(uid, outing.id), saved);
      void client.invalidateQueries({ queryKey: plannedQueryKey(uid), exact: true });
      return isChecked;
    } catch {
      set(stepId, !isChecked);
      onFailed();
      return false;
    }
  };
  return { checked, toggle };
}
