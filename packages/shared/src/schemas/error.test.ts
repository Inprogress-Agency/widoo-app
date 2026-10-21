import { describe, expect, it } from 'vitest';
import { ApiError, apiErrorCodes } from './error';

/** The stable codes of the wiki API › Conventions, with `internal_error` of an unexpected 500. */
const wikiCodes = [
  'validation_error',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'coherence_blocked',
  'link_expired',
  'premium_required',
  'route_removed',
  'account_required',
  'internal_error',
];

describe('apiErrorCodes', () => {
  it('holds the stable codes of the wiki, `internal_error`, and no other', () => {
    expect([...apiErrorCodes].toSorted()).toEqual(wikiCodes.toSorted());
  });
});

describe('ApiError', () => {
  it.each(['link_expired', 'account_required'])('accepts the code %s', (code) => {
    expect(ApiError.parse({ code, message: 'Refused' })).toEqual({ code, message: 'Refused' });
  });

  it('refuses a code the wiki does not list', () => {
    expect(ApiError.safeParse({ code: 'link_gone', message: 'Refused' }).success).toBe(false);
  });
});
