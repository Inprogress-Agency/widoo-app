import { isCertifiedWith, type MyDataExport } from '@widoo/shared';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { Db, Tx } from '../db/client';
import {
  anecdoteQuestions,
  media,
  places,
  plannedRoutes,
  plannedSteps,
  routes,
  steps,
  userAnecdotes,
  userFeaturedRoutes,
  users,
} from '../db/schema';
import { fullPhotoWidth, type PhotoUrls } from '../media/urls';
import { activityOf } from './export-activity';
import { readNotificationPrefs } from './notification-prefs';
import type { User } from './repository';

import { iso, isoOrNull } from './export-dates';

function accountOf(user: User): MyDataExport['account'] {
  const isCertified = isCertifiedWith(user.isCertified, user.certifiedOverride);
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    plan: user.plan,
    planExpiresAt: isoOrNull(user.planExpiresAt),
    isPublic: user.isPublic,
    bio: user.bio,
    neighborhood: user.neighborhood,
    isCertified,
    certifiedAt: isCertified ? isoOrNull(user.certifiedAt) : null,
    createdAt: iso(user.createdAt),
  };
}

/**
 * Links of the photos of routes or steps by owner, in their order: URLs the user can open, at
 * the full width of a stored photo, never a path of the bucket (wiki Securite-et-RGPD).
 */
async function photoLinksByOwner(
  tx: Tx,
  photoUrls: PhotoUrls,
  ownerType: 'route' | 'step',
  ownerIds: string[],
) {
  const byOwner = new Map<string, string[]>();
  if (ownerIds.length === 0) return byOwner;
  const rows = await tx
    .select({ ownerId: media.ownerId, storagePath: media.storagePath })
    .from(media)
    .where(and(eq(media.ownerType, ownerType), inArray(media.ownerId, ownerIds)))
    .orderBy(asc(media.position));
  for (const { ownerId, storagePath } of rows) {
    const url = photoUrls(storagePath, fullPhotoWidth);
    if (url) byOwner.set(ownerId, [...(byOwner.get(ownerId) ?? []), url]);
  }
  return byOwner;
}

async function plannedRoutesOf(tx: Tx, userId: string): Promise<MyDataExport['plannedRoutes']> {
  const planned = await tx
    .select({
      row: plannedRoutes,
      title: sql<string>`${plannedRoutes.routeRevisionSnapshot}->>'title'`,
    })
    .from(plannedRoutes)
    .where(eq(plannedRoutes.userId, userId))
    .orderBy(asc(plannedRoutes.startsAt));
  const progress = planned.length
    ? await tx
        .select()
        .from(plannedSteps)
        .where(
          inArray(
            plannedSteps.plannedRouteId,
            planned.map(({ row }) => row.id),
          ),
        )
        .orderBy(asc(plannedSteps.position))
    : [];
  return planned.map(({ row, title }) => ({
    id: row.id,
    routeId: row.routeId,
    title,
    startsAt: iso(row.startsAt),
    status: row.status,
    completedAt: isoOrNull(row.completedAt),
    closedBy: row.closedBy,
    checkedBookingStepIds: row.checklist,
    steps: progress
      .filter((step) => step.plannedRouteId === row.id)
      .map((step) => ({
        stepId: step.stepId,
        position: step.position,
        arrivedAt: isoOrNull(step.arrivedAt),
        doneAt: isoOrNull(step.doneAt),
        skippedAt: isoOrNull(step.skippedAt),
      })),
    createdAt: iso(row.createdAt),
  }));
}

async function createdRoutesOf(
  tx: Tx,
  userId: string,
  photoUrls: PhotoUrls,
): Promise<MyDataExport['createdRoutes']> {
  const created = await tx
    .select()
    .from(routes)
    .where(eq(routes.authorId, userId))
    .orderBy(asc(routes.createdAt));
  const routeIds = created.map((route) => route.id);
  const stepRows = routeIds.length
    ? await tx
        .select({ step: steps, placeName: places.name, placeAddress: places.address })
        .from(steps)
        .innerJoin(places, eq(places.id, steps.placeId))
        .where(inArray(steps.routeId, routeIds))
        .orderBy(asc(steps.position))
    : [];
  const routePhotos = await photoLinksByOwner(tx, photoUrls, 'route', routeIds);
  const stepPhotos = await photoLinksByOwner(
    tx,
    photoUrls,
    'step',
    stepRows.map(({ step }) => step.id),
  );
  return created.map((route) => ({
    id: route.id,
    title: route.title,
    description: route.description,
    status: route.status,
    access: route.access,
    moods: route.moods,
    audiences: route.audiences,
    conditions: route.conditions,
    transport: route.transport,
    publishedAt: isoOrNull(route.publishedAt),
    createdAt: iso(route.createdAt),
    updatedAt: iso(route.updatedAt),
    photoUrls: routePhotos.get(route.id) ?? [],
    steps: stepRows
      .filter(({ step }) => step.routeId === route.id)
      .map(({ step, placeName, placeAddress }) => ({
        position: step.position,
        placeName,
        placeAddress,
        title: step.title,
        description: step.description,
        durationMin: step.durationMin,
        costPerPersonEur: step.costPerPerson,
        bookingRequired: step.bookingRequired,
        bookingUrl: step.bookingUrl,
        transitionNote: step.transitionNote,
        highlights: step.highlights ?? [],
        photoUrls: stepPhotos.get(step.id) ?? [],
      })),
  }));
}

/** Anecdotes and featured routes of the profile, in their order. */
async function profileListsOf(tx: Tx, userId: string) {
  const anecdotes = await tx
    .select({
      position: userAnecdotes.position,
      questionKey: userAnecdotes.questionKey,
      question: anecdoteQuestions.label,
      answer: userAnecdotes.answer,
    })
    .from(userAnecdotes)
    .innerJoin(anecdoteQuestions, eq(anecdoteQuestions.key, userAnecdotes.questionKey))
    .where(eq(userAnecdotes.userId, userId))
    .orderBy(asc(userAnecdotes.position));
  const featuredRoutes = await tx
    .select({
      position: userFeaturedRoutes.position,
      routeId: userFeaturedRoutes.routeId,
      title: routes.title,
    })
    .from(userFeaturedRoutes)
    .innerJoin(routes, eq(routes.id, userFeaturedRoutes.routeId))
    .where(eq(userFeaturedRoutes.userId, userId))
    .orderBy(asc(userFeaturedRoutes.position));
  return { anecdotes, featuredRoutes };
}

/**
 * Every personal data of an active account (`GET /me/export`), read in one read-only snapshot
 * so that the parts agree, and written nowhere. Null for a deleted account.
 */
export async function exportUserData(
  db: Db,
  userId: string,
  photoUrls: PhotoUrls,
  now: Date = new Date(),
): Promise<MyDataExport | null> {
  return db.transaction(
    async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId));
      if (!user || user.deletedAt) return null;
      const planned = await plannedRoutesOf(tx, userId);
      const createdRoutes = await createdRoutesOf(tx, userId, photoUrls);
      const profileLists = await profileListsOf(tx, userId);
      const activity = await activityOf(tx, userId, photoUrls);
      return {
        exportedAt: iso(now),
        account: accountOf(user),
        preferences: {
          locale: user.locale,
          notifications: readNotificationPrefs(user.notificationPrefs),
        },
        ...profileLists,
        plannedRoutes: planned,
        createdRoutes,
        ...activity,
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
