import { isTeamRole, type Me, type TeamRole } from '@widoo/shared';

/** The member of the team who is signed in, as the shell shows it. */
export type TeamMember = {
  firstName: string | null;
  email: string | null;
  role: TeamRole;
};

/** Why an account that signed in is not let in (A-01). */
export type SignInRefusal = {
  reason: 'noAccess' | 'suspended';
  /** The address used, shown so that the person can try another account. */
  email: string | null;
};

export type Session =
  /** The browser has not said yet whether someone is signed in, or the account is being read. */
  | { status: 'loading' }
  | { status: 'signedOut'; refusal: SignInRefusal | null }
  | { status: 'signedIn'; member: TeamMember }
  /** Signed in, but the API did not answer: nothing is known about the role. */
  | { status: 'unavailable' };

/**
 * The session of an account read from the API (`GET /me`): a member of the team is let in, any
 * other account is refused. The API checks the role again on every call: this only decides what
 * the admin shows.
 */
export function sessionOfAccount(account: Pick<Me, 'firstName' | 'email' | 'role'>): Session {
  if (!isTeamRole(account.role)) {
    return { status: 'signedOut', refusal: { reason: 'noAccess', email: account.email } };
  }
  return {
    status: 'signedIn',
    member: { firstName: account.firstName, email: account.email, role: account.role },
  };
}

/**
 * Reads the account of the person who just signed in and decides its session. An API that does
 * not answer, or answers anything unexpected, lets nobody in.
 */
export async function readSession(api: { getMe: () => Promise<Me> }): Promise<Session> {
  try {
    return sessionOfAccount(await api.getMe());
  } catch {
    return { status: 'unavailable' };
  }
}
