import { z } from 'zod';

/** Stable codes of the wiki API page, plus `internal_error` for an unexpected 500. */
export const apiErrorCodes = [
  'validation_error',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'coherence_blocked',
  'premium_required',
  /** 410 of a withdrawn route, with `details.removedAt` (`RouteRemovedDetails`). */
  'route_removed',
  /** 403 on `/admin/*`: the session was opened without a second factor (D-087). */
  'mfa_required',
  /** 403 everywhere: the account was suspended by the team (wiki Admin-Web › A-06). */
  'account_suspended',
  /** 409 on a moderation decision: another member of the team decided first (D-087). */
  'already_decided',
  'internal_error',
] as const;

/** Single error body of the API. */
export const ApiError = z.object({
  code: z.enum(apiErrorCodes),
  message: z.string(),
  /**
   * Field issues for `validation_error`; `reason` for `premium_required` (E-17); `reason` and
   * `limit` for the `rate_limited` of a submission (D-073).
   */
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiError>;
export type ApiErrorCode = ApiError['code'];

/** One invalid field of a `validation_error`, listed in `details.issues`. */
export const ValidationIssue = z.object({
  location: z.enum(['body', 'querystring', 'params', 'headers']),
  /** Dotted path of the field (`steps.0.placeId`), empty for the whole part. */
  path: z.string(),
  /** Zod issue code (`too_big`, `invalid_value`...), for a message localized by the client. */
  code: z.string(),
  message: z.string(),
});
export type ValidationIssue = z.infer<typeof ValidationIssue>;
