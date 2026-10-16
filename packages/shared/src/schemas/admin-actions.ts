import { z } from 'zod';

/** Rows of a page of the journal of the admin. */
export const adminActionsPageSize = 50;

/** Periods the journal filters by, counted back from now. */
export const adminActionPeriods = ['24h', '7d', '30d'] as const;
export type AdminActionPeriod = (typeof adminActionPeriods)[number];

/**
 * Query of `GET /admin/actions` (A-12): the writes of the admin, most recent first, filtered by
 * author, kind of action, kind of target and period. `targetId` narrows to one object, such as
 * the history of a setting.
 */
export const AdminActionsQuery = z.strictObject({
  actorId: z.uuid().optional(),
  action: z.string().min(1).max(100).optional(),
  targetType: z.string().min(1).max(50).optional(),
  targetId: z.string().min(1).max(200).optional(),
  period: z.enum(adminActionPeriods).optional(),
  cursor: z.string().max(200).optional(),
});
export type AdminActionsQuery = z.infer<typeof AdminActionsQuery>;

/** One write of the admin: who, what, on which object, why, and the state before and after. */
export const AdminActionItem = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  /** Null once the account of the author is purged: the journal outlives it. */
  actor: z.object({ id: z.uuid(), name: z.string().nullable() }).nullable(),
  /** Stable name: `route.publish`, `user.suspend`, `setting.update`... */
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  /**
   * What the target is called today: the first name or e-mail of an account, the title of a route,
   * the name of a place. Null for a kind without a name here, or once the object is gone.
   */
  targetLabel: z.string().nullable(),
  reason: z.string().nullable(),
  /** What the action changed, limited to its fields; null when it has none to show. */
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
});
export type AdminActionItem = z.infer<typeof AdminActionItem>;

/** Body of `GET /admin/actions`. */
export const AdminActions = z.object({
  items: z.array(AdminActionItem),
  total: z.number().int().nonnegative(),
  /** Rows before this page: the first row shown is number `offset + 1`. */
  offset: z.number().int().nonnegative(),
  previousCursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
});
export type AdminActions = z.infer<typeof AdminActions>;

/** Body of `GET /admin/actions/filters`: the values the filters offer, from the journal itself. */
export const AdminActionFilters = z.object({
  actors: z.array(z.object({ id: z.uuid(), name: z.string().nullable() })),
  actions: z.array(z.string()),
  targetTypes: z.array(z.string()),
});
export type AdminActionFilters = z.infer<typeof AdminActionFilters>;
