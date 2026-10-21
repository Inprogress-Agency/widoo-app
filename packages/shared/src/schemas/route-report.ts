import { z } from 'zod';
import {
  reportStatuses,
  routeReportCommentMaxLength,
  routeReportCommentRuleOf,
  routeReportNeedsStep,
  userRouteReportReasons,
} from '../reports';
import { plainText } from './common';

/**
 * Body of `POST /routes/:id/reports` (E-05, « Signaler ce parcours », D-056). The reason is one
 * the user picks, never `low_rating`. `stepId` is for `place_changed` and for no other reason; the
 * comment, of 80 characters, is for `place_changed` (optional) and `other` (required). Strict: an
 * unknown key is refused. A step that is not one of the route is refused by the API, which knows
 * the route.
 */
export const RouteReportBody = z
  .strictObject({
    reason: z.enum(userRouteReportReasons),
    stepId: z.uuid().optional(),
    comment: plainText(routeReportCommentMaxLength).optional(),
  })
  .superRefine((body, context) => {
    const needsStep = routeReportNeedsStep(body.reason);
    if (needsStep && body.stepId === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['stepId'],
        message: 'The step of the place is required for this reason',
      });
    }
    if (!needsStep && body.stepId !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['stepId'],
        message: 'This reason takes no step',
      });
    }
    const commentRule = routeReportCommentRuleOf(body.reason);
    if (commentRule === 'required' && body.comment === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['comment'],
        message: 'A comment is required for this reason',
      });
    }
    if (commentRule === 'none' && body.comment !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['comment'],
        message: 'This reason takes no comment',
      });
    }
  });
export type RouteReportBody = z.infer<typeof RouteReportBody>;

/**
 * Answer of `POST /routes/:id/reports` (201): the report as it stands, open until the team
 * decides (A-03). Nothing of the reporter beyond the route and the reason they gave.
 */
export const RouteReportReceipt = z.object({
  id: z.uuid(),
  reason: z.enum(userRouteReportReasons),
  status: z.enum(reportStatuses),
  /** The time of the report: `myReport.reportedAt` of the route sheet says the same. */
  reportedAt: z.iso.datetime(),
});
export type RouteReportReceipt = z.infer<typeof RouteReportReceipt>;
