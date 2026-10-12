import type { GetToken } from '@widoo/api-client';

/** Why a sign-in attempt failed, as far as the page can tell the person. */
export type SignInFailure = 'popupBlocked' | 'linkInvalid' | 'linkOtherDevice' | 'generic';

export class SignInError extends Error {
  constructor(
    readonly failure: SignInFailure,
    options?: ErrorOptions,
  ) {
    super(`Sign-in failed: ${failure}`, options);
    this.name = 'SignInError';
  }
}

/**
 * What the admin needs from the identity provider. Firebase at runtime (`firebase-client.ts`);
 * the session and the screens only know this interface.
 */
export interface AuthClient {
  /** Calls `listener` now and at every change: an identifier when someone is signed in. */
  onUserChanged(listener: (uid: string | null) => void): () => void;
  /** ID token of the signed-in user for the API, null when signed out. */
  getToken: GetToken;
  /** Opens the Google window. Resolves once signed in; false when the person closed it. */
  signInWithGoogle(): Promise<boolean>;
  /** Sends the sign-in link, which comes back to the sign-in page with `returnPath`. */
  sendSignInLink(email: string, returnPath: string): Promise<void>;
  /** Signs in when `url` is a sign-in link; false when it is not one. */
  completeSignInLink(url: string): Promise<boolean>;
  signOut(): Promise<void>;
}
