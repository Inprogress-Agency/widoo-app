import { ApiError } from '@widoo/shared';
import type { z } from 'zod';
import { ApiRequestError, isAccountDeleted } from './errors';

export interface GetTokenOptions {
  /** True after a 401: the token must come from Firebase again, not from its cache. */
  forceRefresh: boolean;
}

/** Firebase ID token of the signed-in user, null when signed out. Provided by the app. */
export type GetToken = (options: GetTokenOptions) => Promise<string | null>;

export interface ApiClientOptions {
  /** Origin of the API, without `/v1`: `http://192.168.1.20:8080`, `https://api.example.com`. */
  baseUrl: string;
  /** Called before each authenticated request; errors it throws propagate unchanged. */
  getToken?: GetToken;
  /** Per attempt, response body included, in milliseconds. */
  timeoutMs?: number;
  /** The global `fetch` by default; injected by tests. */
  fetch?: typeof fetch;
}

export interface Request {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: `/v1/${string}`;
  /** Serialized as JSON. */
  body?: unknown;
  /** Sends the bearer token, refreshed and retried once after a 401. */
  auth?: boolean;
  /** Cancellation by the caller (TanStack Query passes one): rethrown as is, not wrapped. */
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function readJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

function httpFailure(status: number, json: unknown): ApiRequestError {
  const body = ApiError.safeParse(json);
  return new ApiRequestError('http', status, body.success ? body.data : null);
}

export function createTransport(options: ApiClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchFn = options.fetch ?? fetch;
  const getToken = options.getToken ?? (async () => null);

  async function attempt(request: Request, token: string | null) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const cancel = () => controller.abort();
    request.signal?.addEventListener('abort', cancel);
    const headers: Record<string, string> = { accept: 'application/json' };
    if (request.body !== undefined) {
      headers['content-type'] = 'application/json';
    }
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    try {
      const response = await fetchFn(`${baseUrl}${request.path}`, {
        method: request.method,
        headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: controller.signal,
      });
      return { status: response.status, json: readJson(await response.text()) };
    } catch (error) {
      if (request.signal?.aborted) {
        throw error;
      }
      throw new ApiRequestError(timedOut ? 'timeout' : 'network', null, null, { cause: error });
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', cancel);
    }
  }

  /** JSON body of a 2xx answer; any other outcome throws an `ApiRequestError`. */
  async function send(request: Request): Promise<{ status: number; json: unknown }> {
    const token = request.auth ? await getToken({ forceRefresh: false }) : null;
    let response = await attempt(request, token);
    if (response.status === 401 && token) {
      const failure = httpFailure(401, response.json);
      if (isAccountDeleted(failure)) {
        throw failure;
      }
      const refreshed = await getToken({ forceRefresh: true });
      if (!refreshed) {
        throw failure;
      }
      response = await attempt(request, refreshed);
    }
    if (response.status < 200 || response.status > 299) {
      throw httpFailure(response.status, response.json);
    }
    return response;
  }

  return {
    /** Answer validated by `schema`, which also drops fields this build does not know. */
    async request<T>(request: Request & { schema: z.ZodType<T> }): Promise<T> {
      const { status, json } = await send(request);
      const parsed = request.schema.safeParse(json);
      if (!parsed.success) {
        throw new ApiRequestError('invalid_response', status, null, { cause: parsed.error });
      }
      return parsed.data;
    },
    /** Answer without body (204). */
    async requestEmpty(request: Request): Promise<void> {
      await send(request);
    },
  };
}
