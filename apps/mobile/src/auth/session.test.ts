import { ApiRequestError } from '@widoo/api-client';
import { describe, expect, it, vi } from 'vitest';
import type { AuthProvider, AuthUser } from './provider';
import { createSession } from './session';

const camille: AuthUser = { uid: 'uid-1', email: 'camille@exemple.fr', displayName: 'Camille' };

/** Firebase as the session sees it: a user to set, and a token per call. */
function fakeProvider() {
  let listener: ((user: AuthUser | null) => void) | undefined;
  const provider: AuthProvider = {
    onUserChanged: (next) => {
      listener = next;
      return () => undefined;
    },
    getIdToken: vi.fn(async (forceRefresh: boolean) => (forceRefresh ? 'token-2' : 'token-1')),
    signInWithGoogle: vi.fn(async () => null),
    sendEmailLink: vi.fn(async () => undefined),
    isEmailLink: () => false,
    signInWithEmailLink: vi.fn(async () => ({
      user: camille,
      method: 'email' as const,
      isNewUser: false,
    })),
    signOut: vi.fn(async () => undefined),
  };
  return { provider, setUser: (user: AuthUser | null) => listener?.(user) };
}

describe('session', () => {
  it('waits for the session kept on the device, then reads it without a change of rights', () => {
    const { provider, setUser } = fakeProvider();
    const onSignedInChange = vi.fn();
    const session = createSession(provider, { onSignedInChange });
    expect(session.store.getState().status).toBe('loading');
    setUser(camille);
    expect(session.store.getState()).toEqual({ status: 'signedIn', user: camille });
    expect(onSignedInChange).not.toHaveBeenCalled();
  });

  it('tells each sign-in and sign-out, once', () => {
    const { provider, setUser } = fakeProvider();
    const onSignedInChange = vi.fn();
    createSession(provider, { onSignedInChange });
    setUser(null);
    setUser(camille);
    setUser(camille);
    setUser(null);
    expect(onSignedInChange.mock.calls).toEqual([[true], [false]]);
  });

  it('gives no token when signed out, and asks Firebase again after a 401', async () => {
    const { provider, setUser } = fakeProvider();
    const session = createSession(provider, { onSignedInChange: () => undefined });
    setUser(null);
    expect(await session.getToken({ forceRefresh: false })).toBeNull();
    expect(provider.getIdToken).not.toHaveBeenCalled();
    setUser(camille);
    expect(await session.getToken({ forceRefresh: false })).toBe('token-1');
    expect(await session.getToken({ forceRefresh: true })).toBe('token-2');
  });

  it('fails as the network when Firebase cannot give the token', async () => {
    const { provider, setUser } = fakeProvider();
    vi.mocked(provider.getIdToken).mockRejectedValueOnce(new Error('unreachable'));
    const session = createSession(provider, { onSignedInChange: () => undefined });
    setUser(camille);
    const error = await session
      .getToken({ forceRefresh: false })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ kind: 'network' });
  });
});
