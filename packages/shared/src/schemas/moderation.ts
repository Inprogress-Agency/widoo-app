import { z } from 'zod';
import { taxonomies } from '../taxonomies';
import { HttpsUrl, LatLng } from './common';

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

/** Steps a route needs to be Premium by default (`premium.min_steps`, wiki Modele-de-Donnees). */
export const defaultPremiumMinSteps = 4;

/** A step of the route as the moderation sheet shows it. */
export const ModerationStep = z.object({
  id: z.uuid(),
  position: z.number().int().nonnegative(),
  /** Title given by the author, or the name of the place. */
  title: z.string(),
  durationMin: z.number().int().positive(),
  costPerPersonEur: z.number().nonnegative().nullable(),
  bookingUrl: HttpsUrl.nullable(),
  /** Way from the previous step; null for the first one, or until it is computed. */
  transition: z
    .object({
      mode: z.enum(taxonomies.transports),
      durationMin: z.number().nonnegative(),
      distanceM: z.number().nonnegative(),
    })
    .nullable(),
  place: z.object({
    id: z.uuid(),
    name: z.string(),
    category: z.enum(taxonomies.placeCategories),
    location: LatLng,
    verificationStatus: z.enum(taxonomies.verificationStatuses),
  }),
});
export type ModerationStep = z.infer<typeof ModerationStep>;

/** A line of the history of a route in moderation. */
export const ModerationHistoryEntry = z.object({
  action: z.enum(moderationActions),
  /**
   * Who decided: the first name of the member of the team, or the start of their address when
   * the account has none. Null once the account is purged.
   */
  actorName: z.string().nullable(),
  reasonCode: z.enum(taxonomies.rejectionReasons).nullable(),
  message: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type ModerationHistoryEntry = z.infer<typeof ModerationHistoryEntry>;

/** What a revision changed in a route, compared with its published version. */
export const revisionChangeKinds = ['replaced', 'modified', 'duration_changed'] as const;

/**
 * One change of a revision (A-02, « Changements depuis la version publiée »): a step replaced by
 * another place, a text rewritten, a duration changed. `before` and `after` are ready to show.
 */
export const RevisionChange = z.object({
  /** What changed: a step, by its number from 1, or a text of the route. */
  subject: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('step'), number: z.number().int().positive() }),
    z.object({ kind: z.literal('title') }),
    z.object({ kind: z.literal('description') }),
  ]),
  change: z.enum(revisionChangeKinds),
  before: z.string(),
  after: z.string(),
});
export type RevisionChange = z.infer<typeof RevisionChange>;

/** Body of `GET /admin/routes/:id`: the moderation sheet of a route (A-02). */
export const ModerationRouteDetail = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(taxonomies.routeStatuses),
  isRevision: z.boolean(),
  /** True when the route has enough steps to be Premium once published. */
  isPremiumComputed: z.boolean(),
  /** Steps a route needs to be Premium, said next to the badge. */
  premiumMinSteps: z.number().int().positive(),
  moods: z.array(z.enum(taxonomies.moods)),
  cityName: z.string(),
  waitingSince: z.iso.datetime(),
  /** Coherence warnings of the orchestration still standing, as sentences. */
  warnings: z.array(z.string()),
  photoUrls: z.array(HttpsUrl),
  durationMin: z.number().int().nonnegative().nullable(),
  budgetPerPersonEur: z.number().nonnegative().nullable(),
  distanceM: z.number().nonnegative().nullable(),
  steps: z.array(ModerationStep),
  /** Null once the account of the author is purged. */
  author: z
    .object({
      id: z.uuid(),
      firstName: z.string().nullable(),
      isCertified: z.boolean(),
      registeredAt: z.iso.datetime(),
      publishedRouteCount: z.number().int().nonnegative(),
      rejectedRouteCount: z.number().int().nonnegative(),
      /**
       * Reports received on the routes of the author. Always 0 until route reports exist
       * (`route_reports`).
       */
      reportsReceivedCount: z.number().int().nonnegative(),
    })
    .nullable(),
  /**
   * For a revision, what changed since the published version, in the order of the sheet. Always
   * empty until revisions exist (`route_revisions`, with the creation of a route).
   */
  revisionChanges: z.array(RevisionChange),
  /** When the version still online was published; null for a first submission. */
  publishedVersionAt: z.iso.datetime().nullable(),
  /** Decisions already taken on this route, the most recent first. */
  history: z.array(ModerationHistoryEntry),
  /**
   * Place of the route among those waiting for the team, oldest first (« Parcours 1 sur 14 »),
   * with its neighbours; null when the route no longer waits.
   */
  queue: z
    .object({
      position: z.number().int().positive(),
      total: z.number().int().positive(),
      previousId: z.uuid().nullable(),
      nextId: z.uuid().nullable(),
    })
    .nullable(),
});
export type ModerationRouteDetail = z.infer<typeof ModerationRouteDetail>;
