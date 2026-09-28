/** Where the accepted events go: PostHog, the local log, or nowhere. */
export type AnalyticsSink = 'posthog' | 'log' | 'none';

interface AnalyticsSinkSources {
  /** `EXPO_PUBLIC_APP_ENV`, set per build profile in `eas.json`; empty in local development. */
  appEnv: string | undefined;
  /** `EXPO_PUBLIC_POSTHOG_KEY`, from the EAS environment of the `preview` or `production` build. */
  posthogKey: string | undefined;
  /** `__DEV__` and `EXPO_PUBLIC_ANALYTICS_DEBUG=1`: the local journal of the events. */
  isDebugLog: boolean;
}

/** The only environments with a PostHog project (wiki Architecture-Technique, D-059). */
const POSTHOG_ENVIRONMENTS: ReadonlySet<string> = new Set(['preview', 'production']);

/**
 * Only a `preview` or `production` build sends events, to its own PostHog project. Anywhere
 * else (empty, `development` or unknown environment), a key is ignored even when present, so
 * that no development session feeds the staging or production data: the events go to the
 * local log when asked, or nowhere.
 */
export function chooseAnalyticsSink({
  appEnv,
  posthogKey,
  isDebugLog,
}: AnalyticsSinkSources): AnalyticsSink {
  if (appEnv !== undefined && POSTHOG_ENVIRONMENTS.has(appEnv) && posthogKey) {
    return 'posthog';
  }
  return isDebugLog ? 'log' : 'none';
}
