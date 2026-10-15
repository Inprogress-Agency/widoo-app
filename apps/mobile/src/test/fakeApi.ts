import { createApiClient } from '@widoo/api-client';
import type { Me } from '@widoo/shared';
import type { Session } from '../auth/session';

type Reply = { status: number; body?: unknown };

const unauthorized = (message: string): Reply => ({
  status: 401,
  body: { code: 'unauthorized', message },
});

/**
 * The account routes of the API, as the server answers them: `GET /me` and `DELETE /me`, which
 * count their requests. Without token, « Missing bearer token »; after the deletion, the session
 * opened before it gets « Account deleted » (D-027) until a new sign-in, a new account.
 */
export function createFakeAccountApi(me: Me) {
  const server = { getMeCount: 0, deleteMeCount: 0, isDeleted: false };

  function answer(method: string, path: string, hasToken: boolean): Reply {
    if (path !== '/v1/me') {
      return { status: 404, body: { code: 'not_found', message: 'Not found' } };
    }
    if (method === 'GET') {
      server.getMeCount += 1;
    } else if (method === 'DELETE') {
      server.deleteMeCount += 1;
    }
    if (!hasToken) {
      return unauthorized('Missing bearer token');
    }
    if (server.isDeleted) {
      return unauthorized('Account deleted');
    }
    if (method === 'DELETE') {
      server.isDeleted = true;
      return { status: 204 };
    }
    return { status: 200, body: me };
  }

  const fetchFn = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
    // An answer comes back later, never within the same tick: a loop of requests shows as such.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const path = new URL(String(url)).pathname;
    const reply = answer(init?.method ?? 'GET', path, headers.authorization !== undefined);
    const text = reply.body === undefined ? '' : JSON.stringify(reply.body);
    return { status: reply.status, text: async () => text } as Response;
  };

  return {
    server,
    /** The API client of the app, on this server, with the token of `session`. */
    clientFor: (session: Session) =>
      createApiClient({
        baseUrl: 'http://api.test',
        getToken: session.getToken,
        fetch: fetchFn as typeof fetch,
      }),
    /** A new sign-in after the deletion: the API creates a new account (D-027, #128). */
    signInAfresh: () => {
      server.isDeleted = false;
    },
  };
}
