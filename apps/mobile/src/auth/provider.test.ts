import { describe, expect, it } from 'vitest';
import { accountProviderOf } from './provider';

describe('accountProviderOf', () => {
  it('reads Apple, Google and the e-mail link from the providers of Firebase', () => {
    expect(accountProviderOf(['apple.com'])).toBe('apple');
    expect(accountProviderOf(['google.com'])).toBe('google');
    expect(accountProviderOf(['password'])).toBe('email');
  });

  it('says nothing for a provider it does not know', () => {
    expect(accountProviderOf([])).toBeNull();
    expect(accountProviderOf(['phone'])).toBeNull();
  });
});
