import { messages } from '@/messages/fr';
import type { RouteReportReason } from '@widoo/shared';
import { StatusBadge } from '@widoo/ui';
import type { ComponentProps } from 'react';

const tones: Record<RouteReportReason, ComponentProps<typeof StatusBadge>['tone']> = {
  place_changed: 'info',
  inappropriate: 'neutral',
  dangerous_place: 'error',
  hidden_ad: 'neutral',
  copied_content: 'neutral',
  false_info: 'neutral',
  other: 'neutral',
  low_rating: 'alert',
};

/** Why a route was reported: « Lieu modifié », « Contenu copié », « Note basse »… */
export function ReportReasonBadge({ reason }: { reason: RouteReportReason }) {
  return <StatusBadge tone={tones[reason]}>{messages.reports.reasons[reason]}</StatusBadge>;
}
