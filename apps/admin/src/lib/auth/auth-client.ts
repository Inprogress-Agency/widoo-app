import type { GetToken } from '@widoo/api-client';

/** Why a sign-in attempt failed, as far as the page can tell the person. */
export type SignInFailure =
  | 'popupBlocked'
  | 'linkInvalid'
  | 'linkOtherDevice'
  /** The 6-digit code is wrong or already expired. */
  | 'codeInvalid'
  /** Too long since the sign-in to change the second factor: sign in again. */
  | 'recentSignInRequired'
  | 'generic';

/**
 * How a sign-in attempt ended: signed in, waiting for the code of the authenticator app (the
 * account has a second factor), or given up by the person.
 */
export type SignInOutcome = 'signedIn' | 'secondFactorRequired' | 'cancelled';

/** What the person needs to add the account to an authenticator app. */
export type TotpEnrollment = {
  /** Address of the `otpauth://` kind, to show as a QR code. */
  qrCodeUri: string;
  /** The same secret as text, to type when the QR code cannot be scanned. */
  secretKey: string;
};

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
  /** Opens the Google window, and says how the attempt ended. */
  signInWithGoogle(): Promise<SignInOutcome>;
  /** Sends the sign-in link, which comes back to the sign-in page with `returnPath`. */
  sendSignInLink(email: string, returnPath: string): Promise<void>;
  /** Signs in when `url` is a sign-in link; `notALink` when it is not one. */
  completeSignInLink(url: string): Promise<SignInOutcome | 'notALink'>;
  /** Finishes a sign-in that waits for the 6-digit code of the authenticator app. */
  verifySecondFactor(code: string): Promise<void>;
  /** True when the signed-in account has a second factor. */
  hasSecondFactor(): boolean;
  /** Prepares a second factor for the signed-in account: the secret to add to the app. */
  startTotpEnrollment(): Promise<TotpEnrollment>;
  /** Adds the second factor once the app gives a valid code for the secret just prepared. */
  finishTotpEnrollment(code: string): Promise<void>;
  signOut(): Promise<void>;
}
