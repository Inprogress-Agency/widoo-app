import {
  defaultBucketThresholds,
  defaultNotificationPrefs,
  labels,
  taxonomies,
  type Me,
} from '@widoo/shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, createApiClient, isAccountDeleted, type ApiClientOptions } from '.';

const config = {
  minAppVersion: '1.2.0',
  taxonomies,
  labels,
  thresholds: defaultBucketThresholds,
};

// Fictitious account.
const me: Me = {
  id: '01890000-0000-7000-8000-000000000001',
  email: null,
  firstName: 'Alex',
  avatarUrl: null,
  role: 'user',
  plan: 'free',
  planExpiresAt: null,
  isPublic: true,
  notificationPrefs: defaultNotificationPrefs,
  createdAt: '2026-09-01T10:00:00.000Z',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A client whose `fetch` answers in turn with `responses` and records each call. */
function setup(responses: Response[], options: Partial<ApiClientOptions> = {}) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => {
    const response = responses.shift();
    if (!response) {
      throw new Error('Unexpected request');
    }
    return response;
  });
  const client = createApiClient({ baseUrl: 'http://10.0.2.2:8080/', fetch, ...options });
  const header = (call: number, name: string) =>
    (fetch.mock.calls[call]?.[1]?.headers as Record<string, string> | undefined)?.[name];
  return { client, fetch, header };
}

async function failure(promise: Promise<unknown>): Promise<ApiRequestError> {
  const error = await promise.then(
    () => undefined,
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(ApiRequestError);
  return error as ApiRequestError;
}

describe('getConfig', () => {
  it('reads the public config without a token, the base URL trailing slash removed', async () => {
    const getToken = vi.fn(async () => 'token-1');
    const { client, fetch, header } = setup([json(200, config)], { getToken });
    await expect(client.getConfig()).resolves.toEqual(config);
    expect(fetch.mock.calls[0]?.[0]).toBe('http://10.0.2.2:8080/v1/config');
    expect(fetch.mock.calls[0]?.[1]?.method).toBe('GET');
    expect(header(0, 'authorization')).toBeUndefined();
    expect(getToken).not.toHaveBeenCalled();
  });

  it('exposes the API error body and its stable code', async () => {
    const body = { code: 'rate_limited', message: 'Too many requests' };
    const error = await failure(setup([json(429, body)]).client.getConfig());
    expect(error).toMatchObject({ kind: 'http', status: 429, body, code: 'rate_limited' });
    expect(error.message).not.toContain('Too many requests');
  });

  it('keeps the status when the error body is not an ApiError', async () => {
    const page = new Response('<html>Bad gateway</html>', { status: 502 });
    const error = await failure(setup([page]).client.getConfig());
    expect(error).toMatchObject({ kind: 'http', status: 502, body: null, code: null });
  });

  it('rejects a 2xx body that does not match the schema', async () => {
    const error = await failure(
      setup([json(200, { ...config, minAppVersion: '1.2' })]).client.getConfig(),
    );
    expect(error).toMatchObject({ kind: 'invalid_response', status: 200 });
  });

  it('reports a network failure', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const client = createApiClient({ baseUrl: 'http://10.0.2.2:8080', fetch });
    const error = await failure(client.getConfig());
    expect(error).toMatchObject({ kind: 'network', status: null });
    expect(error.cause).toBeInstanceOf(TypeError);
  });

  it('aborts after the timeout, and rethrows a cancellation by the caller as is', async () => {
    const fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const client = createApiClient({ baseUrl: 'http://10.0.2.2:8080', fetch, timeoutMs: 5 });
    expect(await failure(client.getConfig())).toMatchObject({ kind: 'timeout', status: null });

    const slow = createApiClient({ baseUrl: 'http://10.0.2.2:8080', fetch, timeoutMs: 60_000 });
    const controller = new AbortController();
    const request = slow.getConfig(controller.signal);
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('authenticated routes', () => {
  const unauthorized = (message: string) => json(401, { code: 'unauthorized', message });

  it('sends the bearer token from getToken', async () => {
    const getToken = vi.fn(async () => 'token-1');
    const { client, header } = setup([json(200, me)], { getToken });
    await expect(client.getMe()).resolves.toEqual(me);
    expect(header(0, 'authorization')).toBe('Bearer token-1');
    expect(getToken).toHaveBeenCalledWith({ forceRefresh: false });
  });

  it('refreshes the token once after a 401 and retries', async () => {
    const getToken = vi.fn(async ({ forceRefresh }: { forceRefresh: boolean }) =>
      forceRefresh ? 'token-2' : 'token-1',
    );
    const { client, fetch, header } = setup([unauthorized('Invalid token'), json(200, me)], {
      getToken,
    });
    await expect(client.getMe()).resolves.toEqual(me);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(header(1, 'authorization')).toBe('Bearer token-2');
  });

  it('gives up after a second 401', async () => {
    const getToken = vi.fn(async () => 'token-1');
    const responses = [unauthorized('Invalid token'), unauthorized('Invalid token')];
    const { client, fetch } = setup(responses, { getToken });
    const error = await failure(client.getMe());
    expect(error).toMatchObject({ status: 401, code: 'unauthorized' });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(isAccountDeleted(error)).toBe(false);
  });

  it('does not retry a deleted account, flagged for sign-out', async () => {
    const getToken = vi.fn(async () => 'token-1');
    const { client, fetch } = setup([unauthorized('Account deleted')], { getToken });
    const error = await failure(client.getMe());
    expect(isAccountDeleted(error)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it('sends no header and does not retry when signed out', async () => {
    const { client, fetch, header } = setup([unauthorized('Missing bearer token')]);
    expect(await failure(client.getMe())).toMatchObject({ status: 401 });
    expect(header(0, 'authorization')).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('patches as JSON and deletes without body', async () => {
    const getToken = async () => 'token-1';
    const updated = { ...me, isPublic: false };
    const responses = [json(200, updated), new Response(null, { status: 204 })];
    const { client, fetch, header } = setup(responses, { getToken });
    await expect(client.updateMe({ isPublic: false })).resolves.toEqual(updated);
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method: 'PATCH', body: '{"isPublic":false}' });
    expect(header(0, 'content-type')).toBe('application/json');
    await expect(client.deleteMe()).resolves.toBeUndefined();
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: 'DELETE', body: undefined });
  });
});
