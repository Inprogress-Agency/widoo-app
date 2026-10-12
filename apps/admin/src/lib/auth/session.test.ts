import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@widoo/api-client';
import type { Me } from '@widoo/shared';
import { readSession, sessionOfAccount } from './session';

const account = { firstName: 'Sarah', email: 'sarah@example.com' };

describe('sessionOfAccount', () => {
  it.each(['editor', 'moderator', 'admin'] as const)('lets a %s in', (role) => {
    expect(sessionOfAccount({ ...account, role })).toEqual({
      status: 'signedIn',
      member: { ...account, role },
    });
  });

  it('refuses an account without a team role, with the address used', () => {
    expect(sessionOfAccount({ ...account, role: 'user' })).toEqual({
      status: 'signedOut',
      refusal: { reason: 'noAccess', email: 'sarah@example.com' },
    });
  });
});

describe('readSession', () => {
  const me = (role: Me['role']) =>
    ({ ...account, role, id: '0', avatarUrl: null, plan: 'free' }) as unknown as Me;

  it('lets in the member of the team the API describes', async () => {
    await expect(readSession({ getMe: async () => me('moderator') })).resolves.toMatchObject({
      status: 'signedIn',
      member: { role: 'moderator' },
    });
  });

  it('refuses the account the API gives no team role', async () => {
    await expect(readSession({ getMe: async () => me('user') })).resolves.toMatchObject({
      status: 'signedOut',
      refusal: { reason: 'noAccess' },
    });
  });

  it('refuses the account the API says is suspended', async () => {
    const getMe = async () => {
      const body = { code: 'account_suspended' as const, message: 'Account suspended' };
      throw new ApiRequestError('http', 403, body);
    };
    await expect(readSession({ getMe })).resolves.toEqual({
      status: 'signedOut',
      refusal: { reason: 'suspended', email: null },
    });
  });

  it('lets nobody in when the API does not answer', async () => {
    const getMe = async () => {
      throw new Error('offline');
    };
    await expect(readSession({ getMe })).resolves.toEqual({ status: 'unavailable' });
  });
});
