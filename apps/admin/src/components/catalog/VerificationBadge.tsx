import { labels, type VerificationStatus } from '@widoo/shared';
import { StatusBadge } from '@widoo/ui';
import type { ComponentProps } from 'react';

const tones: Record<VerificationStatus, ComponentProps<typeof StatusBadge>['tone']> = {
  unverified: 'neutral',
  verified: 'success',
  stale: 'neutral',
  flagged: 'alert',
  closed: 'error',
};

/** How far a place is verified: « Pas encore vérifié », « Vérifié », « À vérifier », « Signalé », « Fermé ». */
export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return <StatusBadge tone={tones[status]}>{labels.fr.verificationStatuses[status]}</StatusBadge>;
}
