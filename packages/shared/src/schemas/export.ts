import { z } from 'zod';
import { notificationKinds, reportStatuses, routeReportReasons } from '../reports';
import { taxonomies } from '../taxonomies';
import { AppLocale, NotificationPrefs } from './me';
import { plannedRouteClosers, plannedRouteStatuses } from './planned';
import { SupportTopic } from './support';

/**
 * Body of `GET /me/export` (E-19 › Confidentialité, D-063, wiki Securite-et-RGPD › portabilité):
 * every personal data the API holds on the caller, prepared on demand and kept nowhere. Photos
 * are given by their links. Favorites and ratings join it with their tables.
 */
const DateTime = z.iso.datetime();

const ExportedAccount = z.object({
  id: z.uuid(),
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(taxonomies.userRoles),
  plan: z.enum(taxonomies.plans),
  planExpiresAt: DateTime.nullable(),
  isPublic: z.boolean(),
  bio: z.string().nullable(),
  neighborhood: z.string().nullable(),
  isCertified: z.boolean(),
  certifiedAt: DateTime.nullable(),
  createdAt: DateTime,
});

const ExportedPlannedRoute = z.object({
  id: z.uuid(),
  /** Null once the route is deleted; `title` is the one planned. */
  routeId: z.uuid().nullable(),
  title: z.string(),
  startsAt: DateTime,
  status: z.enum(plannedRouteStatuses),
  completedAt: DateTime.nullable(),
  closedBy: z.enum(plannedRouteClosers).nullable(),
  /** Steps whose booking was ticked in « À préparer ». */
  checkedBookingStepIds: z.array(z.string()),
  steps: z.array(
    z.object({
      stepId: z.uuid(),
      position: z.int(),
      arrivedAt: DateTime.nullable(),
      doneAt: DateTime.nullable(),
      skippedAt: DateTime.nullable(),
    }),
  ),
  createdAt: DateTime,
});

const ExportedStep = z.object({
  position: z.int(),
  placeName: z.string(),
  placeAddress: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  durationMin: z.int(),
  costPerPersonEur: z.number().nullable(),
  bookingRequired: z.boolean(),
  bookingUrl: z.string().nullable(),
  transitionNote: z.string().nullable(),
  highlights: z.array(z.string()),
  photoUrls: z.array(z.string()),
});

const ExportedCreatedRoute = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(taxonomies.routeStatuses),
  access: z.enum(taxonomies.plans),
  moods: z.array(z.string()),
  audiences: z.array(z.string()),
  conditions: z.array(z.string()),
  transport: z.enum(taxonomies.transports),
  publishedAt: DateTime.nullable(),
  createdAt: DateTime,
  updatedAt: DateTime,
  photoUrls: z.array(z.string()),
  steps: z.array(ExportedStep),
});

export const MyDataExport = z.object({
  exportedAt: DateTime,
  account: ExportedAccount,
  preferences: z.object({ locale: AppLocale.nullable(), notifications: NotificationPrefs }),
  anecdotes: z.array(
    z.object({
      position: z.int(),
      questionKey: z.string(),
      question: z.string(),
      answer: z.string(),
    }),
  ),
  featuredRoutes: z.array(z.object({ position: z.int(), routeId: z.uuid(), title: z.string() })),
  /** Planned and past outings (E-06, E-15). */
  plannedRoutes: z.array(ExportedPlannedRoute),
  /** Routes the caller wrote, any status, with their steps. */
  createdRoutes: z.array(ExportedCreatedRoute),
  /** Premium routes bought alone (D-073). */
  unlockedRoutes: z.array(z.object({ routeId: z.uuid(), title: z.string(), unlockedAt: DateTime })),
  routeReports: z.array(
    z.object({
      routeId: z.uuid(),
      reason: z.enum(routeReportReasons),
      comment: z.string().nullable(),
      status: z.enum(reportStatuses),
      createdAt: DateTime,
    }),
  ),
  supportMessages: z.array(
    z.object({
      topic: SupportTopic,
      message: z.string(),
      replyEmail: z.string(),
      appVersion: z.string(),
      device: z.string(),
      locale: AppLocale,
      createdAt: DateTime,
      handledAt: DateTime.nullable(),
    }),
  ),
  /** Phones registered for the push, without their token (a credential of the push service). */
  devices: z.array(z.object({ locale: AppLocale, registeredAt: DateTime, updatedAt: DateTime })),
  notifications: z.array(
    z.object({ kind: z.enum(notificationKinds), createdAt: DateTime, readAt: DateTime.nullable() }),
  ),
});
export type MyDataExport = z.infer<typeof MyDataExport>;
