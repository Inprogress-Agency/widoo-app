import { ApiRequestError } from '@widoo/api-client';

/**
 * The API refuses a sensitive action (a role, a suspension or a deletion) to a sign-in that is
 * too old (403 `recent_sign_in_required`, wiki Admin-Web › Sécurité): the person signs in again,
 * with the code of their authenticator app, and starts the action over.
 */
export function isRecentSignInRequired(error: unknown): boolean {
  return error instanceof ApiRequestError && error.code === 'recent_sign_in_required';
}
