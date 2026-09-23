/** Port of the local API (apps/api/.env.example). */
const LOCAL_API_PORT = 8080;

interface ApiUrlSources {
  /** `EXPO_PUBLIC_API_URL`, inlined at build time: set per EAS environment, or in `.env.local`. */
  envUrl: string | undefined;
  /** Host of the dev server as the device reaches it (`192.168.1.20:8081`), in development. */
  hostUri: string | undefined;
  isDev: boolean;
}

/**
 * Origin of the API. A build must set `EXPO_PUBLIC_API_URL`, over HTTPS since the Firebase token
 * travels with the requests. In development without it, the API is the one running on the
 * machine that serves the bundle, reached through the same address as Metro: the machine's IP
 * works from the simulators, the emulators and a device on the network.
 */
export function resolveApiUrl({ envUrl, hostUri, isDev }: ApiUrlSources): string {
  if (envUrl) {
    if (!isDev && !envUrl.startsWith('https://')) {
      throw new Error('EXPO_PUBLIC_API_URL must use https outside development');
    }
    return envUrl;
  }
  const host = hostUri?.replace(/:\d+$/, '');
  if (isDev && host) {
    return `http://${host}:${LOCAL_API_PORT}`;
  }
  throw new Error('EXPO_PUBLIC_API_URL is not set');
}
