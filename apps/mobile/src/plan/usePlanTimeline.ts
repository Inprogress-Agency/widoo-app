import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { useRouteSheetSource } from '../route/source';

/** The timeline of a start does not change within a minute: no new request when coming back. */
const TIMELINE_STALE_TIME_MS = 60_000;

export const timelineQueryKey = (routeId: string, startsAt: string) =>
  ['routes', 'timeline', routeId, startsAt] as const;

/**
 * The timeline of `routeId` for `startsAt`, asked again at each change of the day or the time
 * (Ecrans › E-06, le programme); the previous one stays shown while the next one comes. Not asked
 * offline: the sheet then says the hours cannot be checked.
 */
export function usePlanTimeline(routeId: string, startsAt: string, isEnabled: boolean) {
  const source = useRouteSheetSource();
  const query = useQuery({
    queryKey: timelineQueryKey(routeId, startsAt),
    queryFn: isEnabled ? ({ signal }) => source.getTimeline(routeId, startsAt, signal) : skipToken,
    placeholderData: keepPreviousData,
    staleTime: TIMELINE_STALE_TIME_MS,
    retry: 1,
  });
  // A timeline kept from the previous start is shown, never mistaken for this one's.
  const isCurrent = query.data?.startsAt === new Date(startsAt).toISOString();
  return {
    timeline: query.data ?? null,
    isCurrent,
    isError: query.isError && !query.isFetching,
    retry: () => void query.refetch(),
  };
}
