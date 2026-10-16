import { SessionContext, type SessionContextValue } from '@/lib/auth/SessionProvider';
import { use } from 'react';

/** The session of the admin and its actions; only under `SessionProvider`. */
export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession must be used under SessionProvider');
  }
  return value;
}
