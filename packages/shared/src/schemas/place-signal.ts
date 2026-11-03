import { z } from 'zod';
import {
  placeSignalCommentMaxLength,
  placeSignalCommentReason,
  placeSignalKinds,
} from '../place-signals';
import { taxonomies } from '../taxonomies';
import { plainText } from './common';

const signalFields = {
  kind: z.enum(placeSignalKinds),
  reason: z.enum(taxonomies.signalReasons).optional(),
  comment: plainText(placeSignalCommentMaxLength).optional(),
};

type SignalFields = { kind: string; reason?: string; comment?: string };

/** A report names its reason, a confirmation none; « Autre » alone takes its text, required. */
function checkSignal(signal: SignalFields, context: z.RefinementCtx) {
  const issue = (path: string, message: string) =>
    context.addIssue({ code: 'custom', path: [path], message });
  if (signal.kind === 'report' && signal.reason === undefined) {
    issue('reason', 'A report names its reason');
  }
  if (signal.kind === 'confirm' && signal.reason !== undefined) {
    issue('reason', 'A confirmation takes no reason');
  }
  const takesComment = signal.reason === placeSignalCommentReason;
  if (takesComment && signal.comment === undefined) {
    issue('comment', 'A comment is required for this reason');
  }
  if (!takesComment && signal.comment !== undefined) {
    issue('comment', 'Only « other » takes a comment');
  }
}

/**
 * The signal of a step of the Go, sent with « Étape suivante » (`POST
 * /me/planned/:id/steps/:stepId/done`, D-095): on site, the outing being that of the planning.
 */
export const StepPlaceSignal = z.strictObject(signalFields).superRefine(checkSignal);
export type StepPlaceSignal = z.infer<typeof StepPlaceSignal>;

/**
 * Body of `POST /places/:id/signals` (wiki API › Lieux): the signal and the outing of the caller it
 * comes from, required since D-056, during the Go (E-07) or after it (E-15). Strict.
 */
export const PlaceSignalBody = z
  .strictObject({ ...signalFields, plannedRouteId: z.uuid() })
  .superRefine(checkSignal);
export type PlaceSignalBody = z.infer<typeof PlaceSignalBody>;

/**
 * Answer of `POST /places/:id/signals`: 201 for a counted signal; 200 for one accepted without
 * counting, such as a signal sent again within 7 days (D-057), so that the app shows no error
 * during an outing.
 */
export const PlaceSignalReceipt = z.object({
  placeId: z.uuid(),
  kind: z.enum(placeSignalKinds),
  reason: z.enum(taxonomies.signalReasons).nullable(),
  isCounted: z.boolean(),
  receivedAt: z.iso.datetime(),
});
export type PlaceSignalReceipt = z.infer<typeof PlaceSignalReceipt>;
