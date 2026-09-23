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
  'quota_exceeded',
  'premium_required',
  'internal_error',
] as const;

/** Single error body of the API. */
export const ApiError = z.object({
  code: z.enum(apiErrorCodes),
  message: z.string(),
  /** Field issues for `validation_error`; `limit` and `reason` for the 402 codes (E-17). */
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
