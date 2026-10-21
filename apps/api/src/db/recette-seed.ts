/**
 * Fictitious data for a local review of the admin (A-02, A-03, A-13), on top of `pnpm db:seed`:
 * routes waiting for moderation, open reports, flagged places, comments of ratings and support
 * messages, from fictitious users who cannot sign in. Never on staging or production.
 *
 * Resets on every run: the rows it owns have fixed ids and are rewritten, so a review can be
 * replayed. The places it flags belong to the demo dataset, which `pnpm db:seed` sets verified
 * again.
 */
import { eq, inArray } from 'drizzle-orm';
import type { Db } from './client';
import {
  media,
  places,
  routeRatings,
  routeReports,
  routes,
  steps,
  supportMessages,
  users,
} from './schema';
import { seedId } from './seed';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const dayMs = 24 * 60 * 60 * 1000;
const recetteId = (name: string) => seedId(`recette:${name}`);

/** A fictitious Firebase uid, which no sign-in can produce: these users cannot log in. */
const recetteUsers = [
  { key: 'ines', firstName: 'Inès', email: 'ines.recette@example.com' },
  { key: 'hugo', firstName: 'Hugo', email: 'hugo.recette@example.com' },
  { key: 'lea', firstName: 'Léa', email: 'lea.recette@example.com' },
] as const;

/** Copies of demo routes submitted by Inès, the oldest first in the queue. */
const pendingCopies = [
  { source: 'marais-a-l-abri', daysAgo: 4 },
  { source: 'montmartre-a-deux', daysAgo: 2 },
  { source: 'canal-saint-martin-a-velo', daysAgo: 1 },
] as const;

const flaggedPlaces = ['rue-denoyez', 'la-maison-rose'] as const;

export type RecetteCounts = { pending: number; reports: number; flagged: number; support: number };

export async function seedAdminRecette(db: Db, now = new Date()): Promise<RecetteCounts> {
  return db.transaction(async (tx) => {
    const ago = (days: number) => new Date(now.getTime() - days * dayMs);
    await seedUsers(tx, ago(30));
    for (const copy of pendingCopies) {
      await copyAsPending(tx, copy.source, ago(copy.daysAgo));
    }
    await seedReports(tx, ago);
    await tx
      .update(places)
      .set({ verificationStatus: 'flagged', updatedAt: ago(1) })
      .where(
        inArray(
          places.id,
          flaggedPlaces.map((key) => seedId(`place:${key}`)),
        ),
      );
    await seedSupport(tx, ago);
    return {
      pending: pendingCopies.length,
      reports: 3,
      flagged: flaggedPlaces.length,
      support: 2,
    };
  });
}

async function seedUsers(tx: Tx, createdAt: Date) {
  for (const { key, firstName, email } of recetteUsers) {
    const row = { firebaseUid: `seed-recette-${key}`, firstName, email, createdAt };
    await tx
      .insert(users)
      .values({ id: recetteId(`user:${key}`), ...row })
      .onConflictDoUpdate({ target: users.id, set: { ...row, suspendedAt: null, role: 'user' } });
  }
}

/** A copy of a demo route, its steps and their photos, waiting in A-02 since `submittedAt`. */
async function copyAsPending(tx: Tx, source: string, submittedAt: Date) {
  const id = recetteId(`route:${source}`);
  const oldStepIds = tx.select({ id: steps.id }).from(steps).where(eq(steps.routeId, id));
  await tx.delete(media).where(inArray(media.ownerId, oldStepIds));
  await tx.delete(routes).where(eq(routes.id, id));

  const [original] = await tx
    .select()
    .from(routes)
    .where(eq(routes.id, seedId(`route:${source}`)));
  if (!original) throw new Error(`Demo route ${source} missing: run pnpm db:seed first`);
  await tx.insert(routes).values({
    ...original,
    id,
    authorId: recetteId('user:ines'),
    isOfficial: false,
    status: 'pending',
    shareToken: null,
    publishedAt: null,
    unpublishedAt: null,
    stats: {},
    recommendation: null,
    createdAt: submittedAt,
    updatedAt: submittedAt,
  });

  const originalSteps = await tx.select().from(steps).where(eq(steps.routeId, original.id));
  for (const step of originalSteps) {
    const stepId = recetteId(`step:${source}:${step.position}`);
    await tx.insert(steps).values({ ...step, id: stepId, routeId: id });
    const photos = await tx.select().from(media).where(eq(media.ownerId, step.id));
    if (photos.length > 0) {
      await tx.insert(media).values(
        photos.map((photo) => ({
          ...photo,
          id: recetteId(`media:${source}:${step.position}:${photo.position}`),
          ownerId: stepId,
          uploadedBy: recetteId('user:ines'),
        })),
      );
    }
  }
}

async function seedReports(tx: Tx, ago: (days: number) => Date) {
  const reports = [
    {
      key: 'belleville',
      routeId: seedId('route:belleville-street-art'),
      userId: recetteId('user:hugo'),
      reason: 'false_info' as const,
      stepId: null,
      comment: null,
      createdAt: ago(3),
    },
    {
      key: 'marais',
      routeId: seedId('route:marais-gourmand'),
      userId: recetteId('user:lea'),
      reason: 'other' as const,
      stepId: null,
      comment: 'Le parcours passe deux fois par la même rue.',
      createdAt: ago(2),
    },
    {
      key: 'butte',
      routeId: seedId('route:butte-aux-cailles-village'),
      userId: recetteId('user:hugo'),
      reason: 'place_changed' as const,
      stepId: seedId('step:butte-aux-cailles-village:0'),
      comment: "L'entrée a changé de côté.",
      createdAt: ago(1),
    },
  ];
  const ratings = [
    {
      key: 'marais',
      routeId: seedId('route:marais-gourmand'),
      userId: recetteId('user:hugo'),
      rating: 4,
      comment: 'Très bonne balade, les étapes gourmandes valaient le détour.',
    },
    {
      key: 'montmartre',
      routeId: seedId('route:montmartre-a-deux'),
      userId: recetteId('user:lea'),
      rating: 2,
      comment: 'Trop de monde au Sacré-Cœur, à faire tôt le matin.',
    },
  ];
  await tx.delete(routeReports).where(
    inArray(
      routeReports.id,
      reports.map((report) => recetteId(`report:${report.key}`)),
    ),
  );
  await tx
    .insert(routeReports)
    .values(reports.map(({ key, ...report }) => ({ id: recetteId(`report:${key}`), ...report })));
  await tx.delete(routeRatings).where(
    inArray(
      routeRatings.id,
      ratings.map((rating) => recetteId(`rating:${rating.key}`)),
    ),
  );
  await tx.insert(routeRatings).values(
    ratings.map(({ key, ...rating }) => ({
      id: recetteId(`rating:${key}`),
      ...rating,
      createdAt: ago(2),
      updatedAt: ago(2),
    })),
  );
}

async function seedSupport(tx: Tx, ago: (days: number) => Date) {
  const messages = [
    {
      key: 'hugo',
      userId: recetteId('user:hugo'),
      replyEmail: 'hugo.recette@example.com',
      topic: 'problem' as const,
      message: "La carte reste grise quand j'ouvre un parcours hors connexion.",
      createdAt: ago(2),
    },
    {
      key: 'visitor',
      userId: null,
      replyEmail: 'visiteur.recette@example.com',
      topic: 'question' as const,
      message: 'Peut-on proposer un parcours à Lyon ?',
      createdAt: ago(1),
    },
  ];
  await tx.delete(supportMessages).where(
    inArray(
      supportMessages.id,
      messages.map((message) => recetteId(`support:${message.key}`)),
    ),
  );
  await tx.insert(supportMessages).values(
    messages.map(({ key, ...message }) => ({
      id: recetteId(`support:${key}`),
      ...message,
      appVersion: '1.0.0',
      device: 'iPhone 16 (iOS 26.4)',
      locale: 'fr' as const,
      handledAt: null,
    })),
  );
}
