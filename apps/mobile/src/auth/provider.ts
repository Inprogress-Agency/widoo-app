/** The signed-in Firebase user, as the app reads it: never the token. */
export interface AuthUser {
  uid: string;
  email: string | null;
  /** Name given by Google, often a full name; the API keeps the first word (D-025). */
  displayName: string | null;
}

/** How the user signed in, as `auth_completed` names it. Apple arrives with #388. */
export type SignInMethod = 'google' | 'email';

export interface SignInResult {
  user: AuthUser;
  method: SignInMethod;
  /** The Firebase account was created by this sign-in. */
  isNewUser: boolean;
}

/**
 * Why a sign-in failed, as the sheet tells it (Ecrans › E-10): `offline` shows the barred wifi,
 * `expired` the sheet « Ce lien n'est plus valable », `failed` the barred cloud.
 */
export type SignInFailure = 'offline' | 'expired' | 'failed';

export class SignInError extends Error {
  override readonly name = 'SignInError';
  readonly failure: SignInFailure;
  /** Code of the SDK (`auth/network-request-failed`), safe to report: never a token. */
  readonly code: string | null;

  constructor(failure: SignInFailure, code: string | null, options?: ErrorOptions) {
    super(`Sign-in failed: ${failure}${code ? ` (${code})` : ''}`, options);
    this.failure = failure;
    this.code = code;
  }
}

/**
 * Firebase Authentication behind an interface: the Firebase implementation in the app, a fake
 * in the tests. Firebase keeps the session on the device and refreshes the token itself.
 */
export interface AuthProvider {
  /** Called at once with the current user (null when signed out), then on each change. */
  onUserChanged(listener: (user: AuthUser | null) => void): () => void;
  /** Firebase ID token of the current user; null when signed out. */
  getIdToken(forceRefresh: boolean): Promise<string | null>;
  /** The Google window; null when the user closes it without going through (nothing shown). */
  signInWithGoogle(): Promise<SignInResult | null>;
  /** Sends the sign-in link to `email`, to be opened on this phone. */
  sendEmailLink(email: string): Promise<void>;
  /** Whether `url`, opened in the app, is a sign-in link sent by e-mail. */
  isEmailLink(url: string): boolean;
  signInWithEmailLink(email: string, url: string): Promise<SignInResult>;
  signOut(): Promise<void>;
}
