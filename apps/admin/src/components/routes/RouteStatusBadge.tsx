import { messages } from '@/messages/fr';
import type { RouteStatus } from '@widoo/shared';
import { StatusBadge } from '@widoo/ui';
import type { ComponentProps } from 'react';

type Tone = ComponentProps<typeof StatusBadge>['tone'];

/** Color of each status of a route: blue while it waits, green online, red once refused. */
const tones: Record<RouteStatus, Tone> = {
  draft: 'neutral',
  private: 'neutral',
  pending: 'info',
  changes_requested: 'neutral',
  published: 'success',
  needs_fix: 'alert',
  rejected: 'error',
  unpublished: 'neutral',
};

/** Status of a route as the team reads it: « En relecture », « Publié », « Retiré ». */
export function RouteStatusBadge({ status }: { status: RouteStatus }) {
  return <StatusBadge tone={tones[status]}>{messages.routeStatuses[status]}</StatusBadge>;
}
