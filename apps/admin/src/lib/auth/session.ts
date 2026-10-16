import { ApiRequestError, isAccountDeleted } from '@widoo/api-client';
import { isTeamRole, type Me, type TeamRole } from '@widoo/shared';

/** The member of the team who is signed in, as the shell shows it. */
export type TeamMember = {
  /** To tell the account of the member apart in a list: nobody acts on their own. */
  id: string;
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
  /** The account has a second factor: the sign-in waits for the code of the app. */
  | { status: 'secondFactorChallenge' }
  /** A member of the team signed in, who must add a second factor before entering (D-087). */
  | { status: 'secondFactorEnrollment'; member: TeamMember }
  | { status: 'signedIn'; member: TeamMember }
  /** Signed in, but the API did not answer: nothing is known about the role. */
  | { status: 'unavailable' };

/**
 * The session of an account read from the API (`GET /me`): a member of the team is let in, any
 * other account is refused. The API checks the role again on every call: this only decides what
 * the admin shows.
 */
export function sessionOfAccount(
  account: Pick<Me, 'id' | 'firstName' | 'email' | 'role'>,
): Session {
  if (!isTeamRole(account.role)) {
    return { status: 'signedOut', refusal: { reason: 'noAccess', email: account.email } };
  }
  return {
    status: 'signedIn',
    member: {
      id: account.id,
      firstName: account.firstName,
      email: account.email,
      role: account.role,
    },
  };
}

/**
 * Reads the account of the person who just signed in and decides its session. A suspended
 * account is refused by the API itself (403 `account_suspended`), and so is a deleted one: it has
 * no access, and the person may try another account. An API that does not answer, or answers
 * anything unexpected, lets nobody in.
 */
export async function readSession(api: { getMe: () => Promise<Me> }): Promise<Session> {
  try {
    return sessionOfAccount(await api.getMe());
  } catch (error) {
    if (error instanceof ApiRequestError && error.code === 'account_suspended') {
      // The API tells nothing of a suspended account, its address included.
      return { status: 'signedOut', refusal: { reason: 'suspended', email: null } };
    }
    if (isAccountDeleted(error)) {
      return { status: 'signedOut', refusal: { reason: 'noAccess', email: null } };
    }
    return { status: 'unavailable' };
  }
}

/**
 * Holds a member of the team at the door until the account has a second factor, when the admin
 * requires one. Any other session is left as it is: an account outside the team is refused
 * before being asked for anything.
 */
export function requireSecondFactor(
  session: Session,
  factor: { isRequired: boolean; isEnrolled: boolean },
): Session {
  if (session.status !== 'signedIn' || !factor.isRequired || factor.isEnrolled) {
    return session;
  }
  return { status: 'secondFactorEnrollment', member: session.member };
}
