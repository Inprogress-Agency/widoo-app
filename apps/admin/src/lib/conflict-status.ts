import {
  AlreadyDecidedDetails,
  labels,
  PlaceAlreadyDecidedDetails,
  ReportAlreadyDecidedDetails,
} from '@widoo/shared';
import { messages } from '@/messages/fr';

/**
 * The status another member of the team gave first, as a label, from the `details` of a 409
 * `already_decided`: of a route, of a report or of a place. Null when the details are none of them.
 */
export function conflictStatusLabel(details: unknown): string | null {
  const route = AlreadyDecidedDetails.safeParse(details);
  if (route.success) {
    return labels.fr.routeStatuses[route.data.status];
  }
  const report = ReportAlreadyDecidedDetails.safeParse(details);
  if (report.success) {
    return messages.reports.routes.statuses[report.data.status];
  }
  const place = PlaceAlreadyDecidedDetails.safeParse(details);
  return place.success ? labels.fr.verificationStatuses[place.data.status] : null;
}
