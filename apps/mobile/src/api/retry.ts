import { ApiRequestError } from '@widoo/api-client';

/** Attempts after the first one. */
const MAX_RETRIES = 2;

/**
 * Retries what may succeed a moment later: no answer, or a server error. A client error
 * (validation, 401, 404, 429...) or a body this build cannot read would fail again.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES || !(error instanceof ApiRequestError)) {
    return false;
  }
  if (error.kind === 'network' || error.kind === 'timeout') {
    return true;
  }
  return error.kind === 'http' && error.status !== null && error.status >= 500;
}
