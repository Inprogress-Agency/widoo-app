import {
  AlreadyDecidedDetails,
  labels,
  PlaceAlreadyDecidedDetails,
  RatingAlreadyDecidedDetails,
  ReportAlreadyDecidedDetails,
} from '@widoo/shared';
import { messages } from '@/messages/fr';

/**
 * The status another member of the team gave first, as a label, from the `details` of a 409
 * `already_decided`: of a route, of a report, of a place or of a rating. Null when the details are none of them.
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
  if (place.success) {
    return labels.fr.verificationStatuses[place.data.status];
  }
  const rating = RatingAlreadyDecidedDetails.safeParse(details);
  return rating.success ? messages.reports.ratings.statuses[rating.data.status] : null;
}
