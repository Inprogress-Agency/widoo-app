import { z } from 'zod';
import { appLocales } from '../locale';
import { taxonomies } from '../taxonomies';
import { HttpsUrl, plainText } from './common';
import {
  Anecdotes,
  Bio,
  Certification,
  FeaturedRoute,
  FeaturedRouteIds,
  Neighborhood,
  ProfileAnecdote,
} from './profile';

/** First name shown on the profile and as route author (E-09, E-16). */
export const FirstName = plainText(50);

/** A language of the app (D-062): `fr` or `en`. */
export const AppLocale = z.enum(appLocales);
export type AppLocale = z.infer<typeof AppLocale>;

/**
 * Notification preferences, one switch per kind (E-19, D-062): `reminders` the reminders of a
 * planned route (day before, hour before), `nextDay` the 10:00 notification after a Go
 * (`go_closed`), `myRoutes` the news of the user's own routes (publication, changes requested,
 * `report_resolved`).
 */
export const NotificationPrefs = z.object({
  reminders: z.boolean(),
  nextDay: z.boolean(),
  myRoutes: z.boolean(),
});
export type NotificationPrefs = z.infer<typeof NotificationPrefs>;

/** Preferences of a new account, and of any key it never set. */
export const defaultNotificationPrefs: NotificationPrefs = {
  reminders: true,
  nextDay: true,
  myRoutes: true,
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
  /** Language chosen in Réglages › Langue; null follows the phone (D-062). */
  locale: AppLocale.nullable(),
  notificationPrefs: NotificationPrefs,
  bio: z.string().nullable(),
  neighborhood: z.string().nullable(),
  /** In display order, with the label of each question. */
  anecdotes: z.array(ProfileAnecdote),
  /** Published routes of the caller only, in display order. */
  featuredRoutes: z.array(FeaturedRoute),
  certification: Certification,
  createdAt: z.iso.datetime(),
});
export type Me = z.infer<typeof Me>;

/**
 * Body of `PATCH /me`: listed fields only, at least one; preferences are merged. `avatarUrl`
 * only accepts null (removal) until avatars go through the upload pipeline, which re-encodes
 * images server side (wiki Securite-et-RGPD). `bio` and `neighborhood` are cleared with null,
 * `locale` goes back to the phone's language with null; `anecdotes` and `featuredRouteIds`
 * replace the whole ordered list, an empty one clears it.
 * Active questions and published routes of the caller are checked by the API (422).
 */
export const UpdateMe = z
  .strictObject({
    firstName: FirstName,
    avatarUrl: z.null(),
    isPublic: z.boolean(),
    locale: AppLocale.nullable(),
    notificationPrefs: NotificationPrefs.partial().strict(),
    bio: Bio.nullable(),
    neighborhood: Neighborhood.nullable(),
    anecdotes: Anecdotes,
    featuredRouteIds: FeaturedRouteIds,
  })
  .partial()
  .refine((update) => Object.keys(update).length > 0, 'Nothing to update');
export type UpdateMe = z.infer<typeof UpdateMe>;

/**
 * Push token of a phone, as Expo Notifications gives it (`ExponentPushToken[…]`): the API sends
 * push through Expo (wiki Architecture-Technique). Personal data: never logged.
 */
export const ExpoPushToken = z
  .string()
  .regex(/^Expo(nent)?PushToken\[[\w-]{1,256}\]$/, 'Not an Expo push token');

/**
 * Body of `POST /me/devices`: the push token of the phone and its language, as the app resolved
 * it among the languages it ships (D-062): the language of the push while `locale` of the
 * account is null.
 */
export const RegisterDevice = z.strictObject({
  pushToken: ExpoPushToken,
  locale: AppLocale,
});
export type RegisterDevice = z.infer<typeof RegisterDevice>;
