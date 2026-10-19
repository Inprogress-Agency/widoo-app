import { z } from 'zod';
import { reportStatuses, routeReportReasons } from '../reports';
import { SupportTopic } from './support';
import { taxonomies } from '../taxonomies';
import type { UserRole } from '../taxonomies';
import { plainText } from './common';
import { CertifiedOverride, PlanSource } from './profile';

/** Rows of a page of the users of the admin. */
export const adminUsersPageSize = 50;

/** Query of `GET /admin/users` (A-06): a search by e-mail, first name or identifier. */
export const AdminUsersQuery = z.strictObject({
  /** Part of an e-mail or of a first name, or a whole identifier. */
  q: z.string().trim().min(1).max(100).optional(),
  cursor: z.string().max(200).optional(),
});
export type AdminUsersQuery = z.infer<typeof AdminUsersQuery>;

/** The plan of an account and where it comes from (store or gift of the team). */
export const AdminUserPlan = z.object({
  plan: z.enum(taxonomies.plans),
  source: PlanSource,
  /** End of the Premium plan; null without an end (or while the plan is free). */
  expiresAt: z.iso.datetime().nullable(),
});
export type AdminUserPlan = z.infer<typeof AdminUserPlan>;

/** A row of the list of users (A-06). */
export const AdminUserListItem = z.object({
  id: z.uuid(),
  firstName: z.string().nullable(),
  /** Null with Sign in with Apple when the user hides the address. */
  email: z.string().nullable(),
  role: z.enum(taxonomies.userRoles),
  plan: AdminUserPlan,
  createdRouteCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  /** Null for an active account. */
  suspendedAt: z.iso.datetime().nullable(),
});
export type AdminUserListItem = z.infer<typeof AdminUserListItem>;

/** Body of `GET /admin/users`. */
export const AdminUsers = z.object({
  items: z.array(AdminUserListItem),
  total: z.number().int().nonnegative(),
  /** Rows before this page: the first row shown is number `offset + 1`. */
  offset: z.number().int().nonnegative(),
  previousCursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
});
export type AdminUsers = z.infer<typeof AdminUsers>;

const RouteRef = z.object({ id: z.uuid(), title: z.string() });

/** A report seen from an account: made by it, or received on one of its routes. */
export const AdminUserReport = z.object({
  id: z.uuid(),
  reason: z.enum(routeReportReasons),
  status: z.enum(reportStatuses),
  route: RouteRef,
  createdAt: z.iso.datetime(),
});
export type AdminUserReport = z.infer<typeof AdminUserReport>;

/** A rating seen from an account: given by it, or received on one of its routes. */
export const AdminUserRating = z.object({
  id: z.uuid(),
  route: RouteRef,
  score: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  /** Masked by the team (A-03): it no longer counts in the average of its route. */
  isHidden: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type AdminUserRating = z.infer<typeof AdminUserRating>;

/** The card of an account (A-06). */
export const AdminUserDetail = AdminUserListItem.extend({
  suspensionReason: z.string().nullable(),
  isPublic: z.boolean(),
  /** The badge shown, and the two things it comes from (D-023). */
  certification: z.object({
    isCertified: z.boolean(),
    computed: z.boolean(),
    override: CertifiedOverride,
    certifiedAt: z.iso.datetime().nullable(),
  }),
  unlockedRoutes: z.array(RouteRef.extend({ source: PlanSource, unlockedAt: z.iso.datetime() })),
  createdRoutes: z.array(RouteRef.extend({ status: z.enum(taxonomies.routeStatuses) })),
  reportsMade: z.array(AdminUserReport),
  reportsReceived: z.array(AdminUserReport),
  ratingsGiven: z.array(AdminUserRating),
  ratingsReceived: z.array(AdminUserRating),
  supportMessages: z.array(
    z.object({
      id: z.uuid(),
      topic: SupportTopic,
      createdAt: z.iso.datetime(),
      handledAt: z.iso.datetime().nullable(),
    }),
  ),
});
export type AdminUserDetail = z.infer<typeof AdminUserDetail>;

/** Body of `PATCH /admin/users/:id/role`. */
export const ChangeUserRoleBody = z.strictObject({ role: z.enum(taxonomies.userRoles) });
export type ChangeUserRoleBody = z.infer<typeof ChangeUserRoleBody>;

/** Body of the suspension and of the reactivation: the reason stays in the journal of the admin. */
export const UserReasonBody = z.strictObject({ reason: plainText(500) });
export type UserReasonBody = z.infer<typeof UserReasonBody>;

/** Body of `POST /admin/users/:id/gift`: Premium until a date, or one route, never both. */
export const GiftBody = z
  .strictObject({ until: z.iso.datetime().optional(), routeId: z.uuid().optional() })
  .refine((body) => (body.until === undefined) !== (body.routeId === undefined), {
    message: 'Give exactly one of until and routeId',
  });
export type GiftBody = z.infer<typeof GiftBody>;

/** Body of `POST /admin/users/:id/certification` (D-023). */
export const CertificationBody = z.strictObject({ override: CertifiedOverride });
export type CertificationBody = z.infer<typeof CertificationBody>;

/** Reasons of a 409 on an action on an account, in `details.reason`: the admin tells each one. */
export const userConflictReasons = [
  'already_suspended',
  'not_suspended',
  'active_store_plan',
  'free_route',
  'own_route',
  'route_already_unlocked',
] as const;
export type UserConflictReason = (typeof userConflictReasons)[number];

/** What an actor may do to an account (wiki Admin-Web › Rôles and A-06). */
export type UserAction = 'role' | 'suspend' | 'gift' | 'certification' | 'export' | 'delete';

type Person = { id: string; role: UserRole };

/**
 * The actions the API allows `actor` on `target`, the one place of the rule (the admin only hides
 * what it refuses). Only an admin changes a role, offers Premium, awards the badge, exports or
 * deletes; a moderator suspends and reactivates a `user` only (an account of the team is for an
 * admin). Nobody suspends, deletes or changes the role of their own account, and an account of the team is demoted to `user`
 * before it is deleted.
 */
export function allowedUserActions(actor: Person, target: Person): readonly UserAction[] {
  const isSelf = actor.id === target.id;
  if (actor.role === 'admin') {
    const actions: UserAction[] = ['gift', 'certification', 'export'];
    if (!isSelf) {
      actions.push('role', 'suspend');
      if (target.role === 'user') {
        actions.push('delete');
      }
    }
    return actions;
  }
  if (actor.role === 'moderator' && !isSelf && target.role === 'user') {
    return ['suspend'];
  }
  return [];
}
