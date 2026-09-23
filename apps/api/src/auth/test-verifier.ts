import { randomUUID } from 'node:crypto';
import { InvalidTokenError, type TokenVerifier, type VerifiedIdentity } from './verifier';

/**
 * Stand-in for Firebase in tests: `issue()` returns an opaque token for an identity, and any
 * other token is refused. Only tests import this file, so it never reaches the build; `buildApp`
 * refuses an injected verifier in production anyway.
 */
export class TestTokenVerifier implements TokenVerifier {
  readonly #identities = new Map<string, VerifiedIdentity>();

  /** A token for a new identity (unique `uid`, Google, no e-mail unless given). */
  issue(identity: Partial<VerifiedIdentity> = {}): { token: string; uid: string } {
    const token = `test-token-${randomUUID()}`;
    const verified: VerifiedIdentity = {
      uid: `test-${randomUUID()}`,
      email: null,
      emailVerified: false,
      name: null,
      signInProvider: 'google.com',
      ...identity,
    };
    this.#identities.set(token, verified);
    return { token, uid: verified.uid };
  }

  async verify(token: string): Promise<VerifiedIdentity> {
    const identity = this.#identities.get(token);
    if (!identity) {
      throw new InvalidTokenError('auth/argument-error');
    }
    return identity;
  }
}
