import { hasRole } from '@widoo/shared';
import { useSession } from './useSession';

/**
 * True for a member who creates and edits the places of the catalog: editors and admins; a
 * moderator reads them (wiki Admin-Web › Rôles). The API decides again on every write.
 */
export function useCanWriteCatalog(): boolean {
  const { session } = useSession();
  return session.status === 'signedIn' && hasRole(session.member.role, 'editor');
}
