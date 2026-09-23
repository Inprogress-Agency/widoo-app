import { useQuery } from '@tanstack/react-query';
import { api } from './client';

/** The API caches `/config` for 5 minutes (`Cache-Control: max-age=300`): so does the app. */
const CONFIG_STALE_TIME_MS = 5 * 60_000;

export function useAppConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: ({ signal }) => api.getConfig(signal),
    staleTime: CONFIG_STALE_TIME_MS,
  });
}
