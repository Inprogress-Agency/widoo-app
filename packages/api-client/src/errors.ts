import type { ApiError, ApiErrorCode } from '@widoo/shared';

/** Why a request failed. */
export type ApiFailureKind =
  /** The API answered a non-2xx status; `body` holds its error when it matches `ApiError`. */
  | 'http'
  /** No answer: offline, DNS failure, connection refused. */
  | 'network'
  /** No complete answer within the client timeout. */
  | 'timeout'
  /** A 2xx whose body does not match the expected schema (API ahead of the build, proxy page). */
  | 'invalid_response';

/**
 * The only error the client throws. Its message never quotes a response body: an `ApiError`
 * message is written by the API for developers and may not be shown as is to the user.
 */
export class ApiRequestError extends Error {
  override readonly name = 'ApiRequestError';
  readonly kind: ApiFailureKind;
  /** HTTP status, null without an answer. */
  readonly status: number | null;
  /** Error body of the API, validated by `ApiError`; null when absent or malformed. */
  readonly body: ApiError | null;

  constructor(
    kind: ApiFailureKind,
    status: number | null,
    body: ApiError | null,
    options?: ErrorOptions,
  ) {
    super(`API request failed: ${kind}${status === null ? '' : ` ${status}`}`, options);
    this.kind = kind;
    this.status = status;
    this.body = body;
  }

  /** Stable code of the API (`not_found`, `quota_exceeded`...), null outside `kind: 'http'`. */
  get code(): ApiErrorCode | null {
    return this.body?.code ?? null;
  }
}

// Message of the 401 sent by `requireAuth` (apps/api/src/auth/plugin.ts) for a deleted account.
const ACCOUNT_DELETED = 'Account deleted';

/** The account was deleted by its owner: the app signs out instead of refreshing the token. */
export function isAccountDeleted(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    error.status === 401 &&
    error.body?.message === ACCOUNT_DELETED
  );
}
