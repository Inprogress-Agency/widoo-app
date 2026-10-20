import { messages } from '@/messages/fr';
import { StatusBadge } from '@widoo/ui';

/** To handle in blue, handled in green. */
export function SupportStatusBadge({ isHandled }: { isHandled: boolean }) {
  return (
    <StatusBadge tone={isHandled ? 'success' : 'info'}>
      {isHandled ? messages.support.statuses.handled : messages.support.statuses.unhandled}
    </StatusBadge>
  );
}
