import {
  certificationCriteriaOf,
  defaultNotificationPrefs,
  isCertifiedWith,
  Me,
  NotificationPrefs,
  UpdateMe,
  type CertificationThresholds,
} from '@widoo/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Db } from '../db/client';
import { bodyValidationError, httpError } from '../errors';
import { createCertificationThresholds } from '../users/certification';
import { readAnecdotes, readCertificationValues, readFeaturedRoutes } from '../users/profile';
import { softDeleteUser, updateUser, type User } from '../users/repository';

const StoredPrefs = NotificationPrefs.partial();

/** The account with its profile: anecdotes, featured routes and certification. */
async function toMe(db: Db, user: User, thresholds: CertificationThresholds): Promise<Me> {
  const stored = StoredPrefs.safeParse(user.notificationPrefs);
  const [anecdotes, featuredRoutes, values] = await Promise.all([
    readAnecdotes(db, user.id),
    readFeaturedRoutes(db, user.id),
    readCertificationValues(db, user.id),
  ]);
  const isCertified = isCertifiedWith(user.isCertified, user.certifiedOverride);
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    plan: user.plan,
    planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
    isPublic: user.isPublic,
    notificationPrefs: { ...defaultNotificationPrefs, ...(stored.success ? stored.data : {}) },
    bio: user.bio,
    neighborhood: user.neighborhood,
    anecdotes,
    featuredRoutes,
    certification: {
      isCertified,
      certifiedAt: isCertified ? (user.certifiedAt?.toISOString() ?? null) : null,
      criteria: certificationCriteriaOf(values, thresholds),
    },
    createdAt: user.createdAt.toISOString(),
  };
}

/** Set by `requireAuth`, which every route of this plugin runs first. */
export function currentUser(request: FastifyRequest): User {
  if (!request.user) {
    throw httpError(401, 'Missing bearer token');
  }
  return request.user;
}

const security = [{ firebaseIdToken: [] }];

/** The caller's own account (E-09). Personal data: never cached. */
export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  const certificationThresholds = createCertificationThresholds(app.db);
  const meOf = async (user: User) => toMe(app.db, user, await certificationThresholds());

  app.addHook('onRequest', app.requireAuth);
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/me',
    {
      schema: {
        tags: ['account'],
        summary: 'My account and profile: anecdotes, featured routes, certification',
        security,
        response: { 200: Me },
      },
    },
    async (request) => meOf(currentUser(request)),
  );

  app.patch(
    '/me',
    {
      schema: {
        tags: ['account'],
        summary:
          'Update my first name, avatar removal, visibility, notification preferences, bio, ' +
          'neighborhood, anecdotes or featured routes, in one transaction',
        security,
        body: UpdateMe,
        response: { 200: Me },
      },
    },
    async (request) => {
      const outcome = await updateUser(app.db, currentUser(request).id, request.body);
      if (outcome.kind === 'deleted') {
        throw httpError(401, 'Account deleted');
      }
      if (outcome.kind === 'invalid') {
        throw bodyValidationError(outcome.issues);
      }
      return meOf(outcome.user);
    },
  );

  app.delete(
    '/me',
    {
      schema: {
        tags: ['account'],
        summary: 'Delete my account: personal data erased now, row purged later',
        security,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await softDeleteUser(app.db, currentUser(request).id);
      return reply.status(204).send(null);
    },
  );
};
