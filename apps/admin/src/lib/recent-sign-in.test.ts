import { ApiRequestError } from '@widoo/api-client';
import { describe, expect, it } from 'vitest';
import { isRecentSignInRequired } from './recent-sign-in';

const refusal = (code: 'recent_sign_in_required' | 'forbidden') =>
  new ApiRequestError('http', 403, { code, message: 'Refused' });

describe('isRecentSignInRequired', () => {
  it('recognises the refusal of an old sign-in, and no other 403', () => {
    expect(isRecentSignInRequired(refusal('recent_sign_in_required'))).toBe(true);
    expect(isRecentSignInRequired(refusal('forbidden'))).toBe(false);
  });

  it('is false for anything that is not an answer of the API', () => {
    expect(isRecentSignInRequired(new Error('network'))).toBe(false);
    expect(isRecentSignInRequired(undefined)).toBe(false);
  });
});
