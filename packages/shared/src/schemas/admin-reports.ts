import { z } from 'zod';
import { reportStatuses, routeReportReasons } from '../reports';
import { taxonomies } from '../taxonomies';
import { plainText } from './common';

/** Rows of a page of the reports of the admin. */
export const adminReportsPageSize = 50;

/** Query of `GET /admin/reports`: the open reports of routes, oldest first (A-03). */
export const AdminReportsQuery = z.strictObject({
  reason: z.enum(routeReportReasons).optional(),
  cursor: z.string().max(200).optional(),
});
export type AdminReportsQuery = z.infer<typeof AdminReportsQuery>;

/**
 * An open report of a route, as the team reads it (A-03, D-056). `low_rating` has no reporter. The
 * step is the one of the place that changed, for `place_changed` only.
 */
export const AdminRouteReport = z.object({
  id: z.uuid(),
  reason: z.enum(routeReportReasons),
  /** Written by the reporter, 80 characters at most; read by the team, never published. */
  comment: z.string().nullable(),
  createdAt: z.iso.datetime(),
  route: z.object({
    id: z.uuid(),
    title: z.string(),
    status: z.enum(taxonomies.routeStatuses),
    /** « Par Widoo »: a route of the team, which has no author account. */
    isOfficial: z.boolean(),
    cityName: z.string(),
  }),
  /** Null for a route of the team, or once the account of the author is purged. */
  author: z.object({ id: z.uuid(), firstName: z.string().nullable() }).nullable(),
  /** Null for `low_rating`, and once the account of the reporter is purged. */
  reporter: z.object({ id: z.uuid(), firstName: z.string().nullable() }).nullable(),
  step: z.object({ position: z.number().int().nonnegative(), placeName: z.string() }).nullable(),
  /** Reports still open on the same route, this one included. */
  openOnRoute: z.number().int().positive(),
});
export type AdminRouteReport = z.infer<typeof AdminRouteReport>;

/** Body of `GET /admin/reports`. */
export const AdminRouteReports = z.object({
  items: z.array(AdminRouteReport),
  total: z.number().int().nonnegative(),
  /** Rows before this page: the first row shown is number `offset + 1`. */
  offset: z.number().int().nonnegative(),
  previousCursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
});
export type AdminRouteReports = z.infer<typeof AdminRouteReports>;

/** Body of `POST /admin/reports/:id/resolve`: `accepted` leads to a correction, `rejected` to none. */
export const ResolveReportBody = z.strictObject({
  outcome: z.enum(['accepted', 'rejected']),
  /** Kept in the journal of the admin, read by the team only. */
  note: plainText(500).optional(),
});
export type ResolveReportBody = z.infer<typeof ResolveReportBody>;

/** Answer of `POST /admin/reports/:id/resolve`: the report as it stands afterwards. */
export const ResolvedReport = z.object({
  id: z.uuid(),
  status: z.enum(['accepted', 'rejected']),
});
export type ResolvedReport = z.infer<typeof ResolvedReport>;

/** `details` of a 409 `already_decided` on a report: the status another member gave it. */
export const ReportAlreadyDecidedDetails = z.object({ status: z.enum(reportStatuses) });
export type ReportAlreadyDecidedDetails = z.infer<typeof ReportAlreadyDecidedDetails>;
