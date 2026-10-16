import { messages } from '@/messages/fr';
import { StatusBadge } from '@widoo/ui';

/** Active in green, suspended in red. */
export function UserStatusBadge({ isSuspended }: { isSuspended: boolean }) {
  return (
    <StatusBadge tone={isSuspended ? 'error' : 'success'}>
      {isSuspended ? messages.users.status.suspended : messages.users.status.active}
    </StatusBadge>
  );
}
