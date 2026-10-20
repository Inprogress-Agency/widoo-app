import { messages } from '@/messages/fr';
import type { B2bClientStatus } from '@widoo/shared';
import { StatusBadge } from '@widoo/ui';

const tones = {
  prospect: 'info',
  active: 'success',
  suspended: 'alert',
  ended: 'neutral',
} as const satisfies Record<B2bClientStatus, 'info' | 'success' | 'alert' | 'neutral'>;

/** Where a partner stands: prospect, active, suspended or ended. */
export function PartnerStatusBadge({ status }: { status: B2bClientStatus }) {
  return <StatusBadge tone={tones[status]}>{messages.b2b.statuses[status]}</StatusBadge>;
}
