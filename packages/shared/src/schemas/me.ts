import { z } from 'zod';
import { taxonomies } from '../taxonomies';
import { HttpsUrl, plainText } from './common';

/** First name shown on the profile and as route author (E-09, E-16). */
export const FirstName = plainText(50);

/**
 * Notification preferences (E-09): reminders of planned routes (day before, hour before), news
 * of the user's own routes (moderation, milestones) by push and by e-mail (wiki
 * Creation-et-Moderation). Keys to confirm with the E-09 mock-up.
 */
export const NotificationPrefs = z.object({
  plannedRouteReminders: z.boolean(),
  creatorPush: z.boolean(),
  creatorEmail: z.boolean(),
});
export type NotificationPrefs = z.infer<typeof NotificationPrefs>;

/** Preferences of a new account, and of any key it never set. */
export const defaultNotificationPrefs: NotificationPrefs = {
  plannedRouteReminders: true,
  creatorPush: true,
  creatorEmail: true,
};

/** Body of `GET /me` and `PATCH /me`: the caller's own account. */
export const Me = z.object({
  id: z.uuid(),
  /** Null when the provider gave no verified address (Sign in with Apple may hide it). */
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  avatarUrl: HttpsUrl.nullable(),
  role: z.enum(taxonomies.userRoles),
  plan: z.enum(taxonomies.plans),
  planExpiresAt: z.iso.datetime().nullable(),
  isPublic: z.boolean(),
  notificationPrefs: NotificationPrefs,
  createdAt: z.iso.datetime(),
});
export type Me = z.infer<typeof Me>;

/**
 * Body of `PATCH /me`: listed fields only, at least one; preferences are merged. `avatarUrl`
 * only accepts null (removal) until avatars go through the upload pipeline, which re-encodes
 * images server side (SECURITY.md).
 */
export const UpdateMe = z
  .strictObject({
    firstName: FirstName,
    avatarUrl: z.null(),
    isPublic: z.boolean(),
    notificationPrefs: NotificationPrefs.partial().strict(),
  })
  .partial()
  .refine((update) => Object.keys(update).length > 0, 'Nothing to update');
export type UpdateMe = z.infer<typeof UpdateMe>;
