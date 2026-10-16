import type { MyDataExport } from '@widoo/shared';
import { asc, eq } from 'drizzle-orm';
import type { Tx } from '../db/client';
import {
  devices,
  notifications,
  routeRatings,
  routeReports,
  routes,
  routeUnlocks,
  supportMessages,
} from '../db/schema';
import { iso, isoOrNull } from './export-dates';

type Activity = Pick<
  MyDataExport,
  | 'unlockedRoutes'
  | 'routeRatings'
  | 'routeReports'
  | 'supportMessages'
  | 'devices'
  | 'notifications'
>;

/**
 * What the account did or received beyond its profile, outings and routes: purchases, ratings,
 * reports, messages to the support, phones and notifications, oldest first.
 */
export async function activityOf(tx: Tx, userId: string): Promise<Activity> {
  const unlocks = await tx
    .select({ routeId: routeUnlocks.routeId, title: routes.title, at: routeUnlocks.createdAt })
    .from(routeUnlocks)
    .innerJoin(routes, eq(routes.id, routeUnlocks.routeId))
    .where(eq(routeUnlocks.userId, userId))
    .orderBy(asc(routeUnlocks.createdAt));
  const ratings = await tx
    .select({ rating: routeRatings, title: routes.title })
    .from(routeRatings)
    .innerJoin(routes, eq(routes.id, routeRatings.routeId))
    .where(eq(routeRatings.userId, userId))
    .orderBy(asc(routeRatings.createdAt));
  const reports = await tx
    .select()
    .from(routeReports)
    .where(eq(routeReports.userId, userId))
    .orderBy(asc(routeReports.createdAt));
  const messages = await tx
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.userId, userId))
    .orderBy(asc(supportMessages.createdAt));
  const phones = await tx
    .select()
    .from(devices)
    .where(eq(devices.userId, userId))
    .orderBy(asc(devices.createdAt));
  const sent = await tx
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(asc(notifications.createdAt));
  return {
    unlockedRoutes: unlocks.map(({ at, ...unlock }) => ({ ...unlock, unlockedAt: iso(at) })),
    routeRatings: ratings.map(({ rating, title }) => ({
      routeId: rating.routeId,
      title,
      rating: rating.rating,
      comment: rating.comment,
      status: rating.status,
      createdAt: iso(rating.createdAt),
      updatedAt: iso(rating.updatedAt),
    })),
    routeReports: reports.map((report) => ({
      routeId: report.routeId,
      reason: report.reason,
      comment: report.comment,
      status: report.status,
      createdAt: iso(report.createdAt),
    })),
    supportMessages: messages.map((message) => ({
      topic: message.topic,
      message: message.message,
      replyEmail: message.replyEmail,
      appVersion: message.appVersion,
      device: message.device,
      locale: message.locale,
      createdAt: iso(message.createdAt),
      handledAt: isoOrNull(message.handledAt),
    })),
    // Never the push token: a credential of the push service, not a data of the person.
    devices: phones.map((phone) => ({
      locale: phone.locale,
      registeredAt: iso(phone.createdAt),
      updatedAt: iso(phone.updatedAt),
    })),
    notifications: sent.map((notification) => ({
      kind: notification.kind,
      createdAt: iso(notification.createdAt),
      readAt: isoOrNull(notification.readAt),
    })),
  };
}
