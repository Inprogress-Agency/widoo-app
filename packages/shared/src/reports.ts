/**
 * Reports of a route (wiki Creation-et-Moderation › Signaler un parcours, D-056, D-057) and the
 * notifications they lead to. Keys only: the labels of the reasons belong to the app and the admin.
 */

/** Reasons a user picks in « Signaler ce parcours » (E-05), `place_changed` first (D-056). */
export const userRouteReportReasons = [
  'place_changed',
  'inappropriate',
  'dangerous_place',
  'hidden_ad',
  'copied_content',
  'false_info',
  'other',
] as const;

/**
 * Every `route_reports.reason`: the user's, and `low_rating`, opened by the API without a reporter
 * when a published route falls under 2.5 with at least 5 ratings (D-086, D-087).
 */
export const routeReportReasons = [...userRouteReportReasons, 'low_rating'] as const;
export type RouteReportReason = (typeof routeReportReasons)[number];
export type UserRouteReportReason = (typeof userRouteReportReasons)[number];

/** The reason without a reporter: the only one whose `user_id` is null. */
export const systemRouteReportReason = 'low_rating' satisfies RouteReportReason;

/** `open` until the team decides in A-03: `accepted` leads to a correction, `rejected` to none. */
export const reportStatuses = ['open', 'accepted', 'rejected'] as const;
export type ReportStatus = (typeof reportStatuses)[number];

/** « Un lieu a fermé ou a changé » names the step of the place (`step_id`); no other reason does. */
export const routeReportStepReasons = [
  'place_changed',
] as const satisfies readonly RouteReportReason[];

/** Reasons that take a comment: required for `other`, optional for `place_changed`. */
export const routeReportCommentReasons = [
  'place_changed',
  'other',
] as const satisfies readonly RouteReportReason[];
export const routeReportCommentRequiredReasons = [
  'other',
] as const satisfies readonly RouteReportReason[];

/** At most 80 characters (D-056), read by the team in A-03, never published. */
export const routeReportCommentMaxLength = 80;

const isIn = (reasons: readonly RouteReportReason[], reason: RouteReportReason) =>
  reasons.includes(reason);

/** Whether `reason` names a step (`step_id` required), or must not (`step_id` null). */
export function routeReportNeedsStep(reason: RouteReportReason): boolean {
  return isIn(routeReportStepReasons, reason);
}

/** How a report of `reason` takes a comment. */
export function routeReportCommentRuleOf(
  reason: RouteReportReason,
): 'required' | 'optional' | 'none' {
  if (isIn(routeReportCommentRequiredReasons, reason)) return 'required';
  return isIn(routeReportCommentReasons, reason) ? 'optional' : 'none';
}

/** One report by user and by route over 7 sliding days (D-056); 409 inside the window. */
export const routeReportWindowDays = 7;

const dayMs = 24 * 60 * 60 * 1000;

/** Start of the window at `now`: a report created after it is still running. */
export function routeReportWindowStart(now: Date): Date {
  return new Date(now.getTime() - routeReportWindowDays * dayMs);
}

/**
 * Whether an earlier report of the same user on the same route refuses a new one at `now`: it is
 * still open and less than 7 days old. A report the team decided no longer blocks (D-057), and
 * it is also when the frozen line « Signalé le … » of E-05 (`myReport`) goes away.
 */
export function blocksNewRouteReport(
  report: { status: ReportStatus; createdAt: Date },
  now: Date,
): boolean {
  return report.status === 'open' && report.createdAt > routeReportWindowStart(now);
}

/**
 * `notifications.kind` (wiki Modele-de-Donnees › notifications): `go_closed`, the notification of
 * 10:00 after an automatic closing (D-033); `report_resolved`, the thanks to the reporter when the
 * report leads to a correction, never when it is rejected (D-056).
 */
export const notificationKinds = ['go_closed', 'report_resolved'] as const;
export type NotificationKind = (typeof notificationKinds)[number];
