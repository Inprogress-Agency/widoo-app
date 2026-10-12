import { z } from 'zod';
import { taxonomies } from '../taxonomies';

/** Statuses of the moderation queue (A-02): waiting for the team, or for the author's fix. */
export const moderationQueueStatuses = ['pending', 'changes_requested'] as const;
export type ModerationQueueStatus = (typeof moderationQueueStatuses)[number];

/** Decisions of a moderator, as `moderation_actions.action` keeps them. */
export const moderationActions = [
  'publish',
  'request_changes',
  'reject',
  'unpublish',
  'edit',
] as const;
export type ModerationAction = (typeof moderationActions)[number];

/** Columns the queue sorts by; `waiting` (oldest first) is the default. */
export const moderationQueueSorts = ['waiting', 'title', 'author', 'city', 'warnings'] as const;
export type ModerationQueueSort = (typeof moderationQueueSorts)[number];

/** Rows of a page of the queue. */
export const moderationQueuePageSize = 50;

/** Query of `GET /admin/moderation`: filters, search, sort and page of the queue. */
export const ModerationQueueQuery = z.strictObject({
  status: z.enum(moderationQueueStatuses).optional(),
  /** Only the routes of this city. */
  city: z.uuid().optional(),
  /** `true`: only what has been waiting for more than 72 hours. */
  late: z.enum(['true']).optional(),
  /** `true`: only the revisions of routes already published. */
  revision: z.enum(['true']).optional(),
  /** Text searched in the title and in the first name of the author. */
  q: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(moderationQueueSorts).default('waiting'),
  direction: z.enum(['asc', 'desc']).default('asc'),
  /** `nextCursor` or `previousCursor` of a page already read. */
  cursor: z.string().max(200).optional(),
});
export type ModerationQueueQuery = z.infer<typeof ModerationQueueQuery>;

/** A route of the moderation queue, as its row shows it (A-02). */
export const ModerationQueueItem = z.object({
  id: z.uuid(),
  title: z.string(),
  status: z.enum(moderationQueueStatuses),
  /**
   * True for the revision of a route already published, false for a first submission. Always
   * false until revisions exist (`route_revisions`, with the creation of a route).
   */
  isRevision: z.boolean(),
  /** Null once the account of the author is purged. */
  author: z
    .object({
      id: z.uuid(),
      firstName: z.string().nullable(),
      /**
       * « Créateur certifié » (D-023). Always false until the certification exists (columns of
       * the profile and its thresholds).
       */
      isCertified: z.boolean(),
    })
    .nullable(),
  cityName: z.string(),
  stepCount: z.number().int().nonnegative(),
  /** Null until the orchestration computed the route. */
  durationMin: z.number().int().nonnegative().nullable(),
  /** Coherence warnings of the orchestration still standing. */
  warningCount: z.number().int().nonnegative(),
  /** Places of the route that no visitor has verified yet. */
  unverifiedPlaceCount: z.number().int().nonnegative(),
  /** Since when the route waits in the queue. */
  waitingSince: z.iso.datetime(),
});
export type ModerationQueueItem = z.infer<typeof ModerationQueueItem>;

/** Body of `GET /admin/moderation`. */
export const ModerationQueue = z.object({
  items: z.array(ModerationQueueItem),
  /** Routes matching the filters and the search, over all pages. */
  total: z.number().int().nonnegative(),
  /** Size of each filter over the whole queue, shown in its chip. */
  counts: z.object({
    pending: z.number().int().nonnegative(),
    changesRequested: z.number().int().nonnegative(),
    late: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(),
  }),
  /** Cities that have a route in the queue, by name: the choices of the city filter. */
  cities: z.array(z.object({ id: z.uuid(), name: z.string() })),
  /** Rows before this page: the first row shown is number `offset + 1`. */
  offset: z.number().int().nonnegative(),
  previousCursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
});
export type ModerationQueue = z.infer<typeof ModerationQueue>;

/**
 * A message of the team to an author: several lines of plain text, without markup or control
 * characters (wiki Securite-et-RGPD).
 */
export const MessageToAuthor = z
  .string()
  .trim()
  .min(1)
  .max(1000)
  .regex(/^(?:[^<>\p{Cc}]|\n)*$/u, 'Plain text only, without < > or control characters');

/** Body of `POST /admin/routes/:id/request-changes`. */
export const RequestChangesBody = z.strictObject({ message: MessageToAuthor });
export type RequestChangesBody = z.infer<typeof RequestChangesBody>;

/** Body of `POST /admin/routes/:id/reject` and `/unpublish`: a codified reason and a message. */
export const RejectionBody = z.strictObject({
  reasonCode: z.enum(taxonomies.rejectionReasons),
  message: MessageToAuthor,
});
export type RejectionBody = z.infer<typeof RejectionBody>;

/** Answer of a decision: the route in its new status. */
export const ModerationDecision = z.object({
  routeId: z.uuid(),
  action: z.enum(moderationActions),
  status: z.enum(taxonomies.routeStatuses),
});
export type ModerationDecision = z.infer<typeof ModerationDecision>;

/** `details` of a 409 `already_decided`: the status another member of the team gave the route. */
export const AlreadyDecidedDetails = z.object({ status: z.enum(taxonomies.routeStatuses) });
export type AlreadyDecidedDetails = z.infer<typeof AlreadyDecidedDetails>;
