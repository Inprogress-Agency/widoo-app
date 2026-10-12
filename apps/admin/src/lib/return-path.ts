import { sectionOfPath } from '@/config/navigation';
import type { AdminSection } from '@widoo/shared';

/** Query parameter of the sign-in page that holds the page asked for. */
export const returnParam = 'retour';

const signInPath = '/connexion';
const homePath = '/';

/**
 * The page to open after signing in, read from an address anyone can write: a path of the admin
 * only, inside one of its sections. Anything else (another site, `//host`, a backslash, the
 * sign-in page itself) gives the dashboard: never an open redirect.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return homePath;
  }
  const url = new URL(value, 'http://admin.invalid');
  if (url.origin !== 'http://admin.invalid' || sectionOfPath(url.pathname) === null) {
    return homePath;
  }
  return `${url.pathname}${url.search}`;
}

/** Address of the sign-in page that remembers `returnPath`; the dashboard needs no reminder. */
export function signInPathFor(returnPath: string): string {
  const safe = safeReturnPath(returnPath);
  return safe === homePath
    ? signInPath
    : `${signInPath}?${new URLSearchParams({ [returnParam]: safe }).toString()}`;
}

/** The section to name in « Reconnectez-vous pour revenir… »; null for the dashboard. */
export function returnSection(returnPath: string): AdminSection | null {
  const section = sectionOfPath(new URL(returnPath, 'http://admin.invalid').pathname);
  return section === 'dashboard' ? null : section;
}
