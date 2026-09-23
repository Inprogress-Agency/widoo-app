/** What the API takes from a verified ID token. Roles and custom claims are deliberately absent. */
export type VerifiedIdentity = {
  /** Firebase user ID, `users.firebase_uid`. */
  uid: string;
  email: string | null;
  /** True when the provider verified the address; the API keeps verified addresses only. */
  emailVerified: boolean;
  /** Display name given by the provider (Google), often a full name. */
  name: string | null;
  /** `firebase.sign_in_provider`: `apple.com`, `google.com`, `password`, `anonymous`... */
  signInProvider: string;
};

/**
 * Checks an ID token. Firebase at runtime (`createFirebaseVerifier`), `TestTokenVerifier` in
 * tests. Throws `InvalidTokenError` for a token to refuse (401); any other error is an outage
 * or a misconfiguration (500).
 */
export interface TokenVerifier {
  verify(token: string): Promise<VerifiedIdentity>;
}

export class InvalidTokenError extends Error {
  /** `reason`: a code such as `auth/id-token-expired`, safe to log, never the token itself. */
  constructor(readonly reason: string) {
    super('Invalid token');
    this.name = 'InvalidTokenError';
  }
}
