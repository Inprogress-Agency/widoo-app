import { z } from 'zod';

/** Rows of a page of the journal of the admin. */
export const adminActionsPageSize = 50;

/** Periods the journal filters by, counted back from now. */
export const adminActionPeriods = ['24h', '7d', '30d'] as const;
export type AdminActionPeriod = (typeof adminActionPeriods)[number];

/**
 * Stable names of the writes of the admin, as the journal keeps them (A-12): the API writes no
 * other (`recordAdminAction`), and the admin gives each one a label.
 */
export const adminActionNames = [
  'route.publish',
  'route.request_changes',
  'route.reject',
  'route.unpublish',
  'route.republish',
  'route.reassign',
  'report.resolve',
  'rating.hide',
  'rating.unhide',
  'place.create',
  'place.import',
  'place.update',
  'place.verify',
  'place.close',
  'user.change_role',
  'user.suspend',
  'user.reactivate',
  'user.gift_premium',
  'user.gift_route',
  'user.certification',
  'user.export',
  'user.delete',
  'setting.update',
  'affiliate_program.create',
  'affiliate_program.update',
  'b2b_client.create',
  'b2b_client.update',
  'b2b_client.set_routes',
  'support_message.handle',
] as const;
export type AdminActionName = (typeof adminActionNames)[number];

/** Kinds of object the admin acts on, as the journal names them; the admin labels each one. */
export const adminActionTargetTypes = [
  'route',
  'route_report',
  'rating',
  'place',
  'user',
  'setting',
  'affiliate_program',
  'b2b_client',
  'support_message',
] as const;
export type AdminActionTargetType = (typeof adminActionTargetTypes)[number];

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
  /**
   * Stable name: `route.publish`, `user.suspend`, `setting.update`... (`adminActionNames`). A
   * string, not the list: a line keeps the name it was written with.
   */
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  /**
   * What the target is called today: the first name or e-mail of an account; the title of a route,
   * or of the route a report or a rating is about; the name of a place, a program or a partner;
   * the topic of a support message (`problem`…, labelled by the admin as in A-13). Null for a
   * kind without a name here, or once the object is gone.
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
