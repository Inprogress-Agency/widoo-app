import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { useRouteSheetSource } from '../route/source';

/** The timeline of a start does not change within a minute: no new request when coming back. */
const TIMELINE_STALE_TIME_MS = 60_000;

export const timelineQueryKey = (routeId: string, startsAt: string, token?: string) =>
  ['routes', 'timeline', routeId, startsAt, token ?? null] as const;

/**
 * The timeline of `routeId` for `startsAt`, asked again at each change of the day or the time
 * (Ecrans › E-06, le programme); the previous one stays shown while the next one comes. Not asked
 * offline: the sheet then says the hours cannot be checked. `token`: a private route opened by its
 * link, whose timeline the API gives only with it.
 */
export function usePlanTimeline(
  routeId: string,
  startsAt: string,
  isEnabled: boolean,
  token?: string,
) {
  const source = useRouteSheetSource();
  const query = useQuery({
    queryKey: timelineQueryKey(routeId, startsAt, token),
    queryFn: isEnabled
      ? ({ signal }) => source.getTimeline(routeId, startsAt, { token, signal })
      : skipToken,
    placeholderData: keepPreviousData,
    staleTime: TIMELINE_STALE_TIME_MS,
    retry: 1,
  });
  return {
    timeline: query.data ?? null,
    isError: query.isError && !query.isFetching,
    retry: () => void query.refetch(),
  };
}
