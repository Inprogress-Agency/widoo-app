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

/**
 * The codes of the admin (wiki Admin-Web), not yet cited by API › Conventions: until that page
 * lists them (#618), the test compares to both lists.
 */
const adminCodes = [
  'mfa_required',
  'recent_sign_in_required',
  'account_suspended',
  'already_decided',
];

describe('apiErrorCodes', () => {
  it('holds the stable codes of the wiki, those of the admin, `internal_error`, and no other', () => {
    expect([...apiErrorCodes].toSorted()).toEqual([...wikiCodes, ...adminCodes].toSorted());
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
