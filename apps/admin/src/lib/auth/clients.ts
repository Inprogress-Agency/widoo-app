import { publicEnv } from '@/config/public-env';
import { createApiClient, type ApiClient } from '@widoo/api-client';
import type { AuthClient } from './auth-client';
import { createFirebaseAuthClient } from './firebase-client';

type SessionClients = { auth: AuthClient; api: ApiClient };

let clients: SessionClients | undefined;

/**
 * The identity provider and the API client of the admin, created on first use: in the browser
 * only (effects and event handlers), never while a page is rendered on the server.
 */
export function getSessionClients(): SessionClients {
  if (!clients) {
    const auth = createFirebaseAuthClient({
      apiKey: publicEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: publicEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: publicEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      emulatorUrl: publicEnv.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL,
    });
    const api = createApiClient({
      baseUrl: publicEnv.NEXT_PUBLIC_API_URL,
      getToken: auth.getToken,
    });
    clients = { auth, api };
  }
  return clients;
}
