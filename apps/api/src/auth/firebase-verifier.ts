import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { FirebaseAuthError, getAuth } from 'firebase-admin/auth';
import { InvalidTokenError, type TokenVerifier } from './verifier';

/** Misconfiguration or failure on the SDK side, not a token to refuse. */
const serverErrorCodes = new Set(['auth/internal-error', 'auth/invalid-credential']);

/**
 * Verifies Firebase ID tokens: signature against Google's rotating public keys, audience and
 * issuer of `projectId`, expiry. Credentials come from Application Default Credentials (the
 * Cloud Run service account), never from a key file; verifying a token needs none of them.
 *
 * Revocation is not checked, which would cost a call to Firebase on every request: an ID token
 * lives one hour, and a deleted account is refused by the API itself (`users.deleted_at`).
 */
export function createFirebaseVerifier(projectId: string): TokenVerifier {
  const name = `widoo-api:${projectId}`;
  const app =
    getApps().find((existing) => existing.name === name) ??
    initializeApp({ projectId, credential: applicationDefault() }, name);
  const auth = getAuth(app);

  return {
    async verify(token) {
      try {
        const decoded = await auth.verifyIdToken(token);
        return {
          uid: decoded.uid,
          email: decoded.email ?? null,
          emailVerified: decoded.email_verified === true,
          name: typeof decoded.name === 'string' ? decoded.name : null,
          signInProvider: decoded.firebase.sign_in_provider,
        };
      } catch (error) {
        if (error instanceof FirebaseAuthError && !serverErrorCodes.has(error.code)) {
          throw new InvalidTokenError(error.code);
        }
        throw error;
      }
    },
  };
}
