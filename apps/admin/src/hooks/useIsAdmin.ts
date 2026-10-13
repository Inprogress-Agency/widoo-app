import { useSession } from './useSession';

/** True for a signed-in admin: the only role that imports, republishes and reassigns. */
export function useIsAdmin(): boolean {
  const { session } = useSession();
  return session.status === 'signedIn' && session.member.role === 'admin';
}
