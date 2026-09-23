import { defaultNotificationPrefs, Me, NotificationPrefs, UpdateMe } from '@widoo/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { httpError } from '../errors';
import { softDeleteUser, updateUser, type User } from '../users/repository';

const StoredPrefs = NotificationPrefs.partial();

function toMe(user: User): Me {
  const stored = StoredPrefs.safeParse(user.notificationPrefs);
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
    createdAt: user.createdAt.toISOString(),
  };
}

/** Set by `requireAuth`, which every route of this plugin runs first. */
function currentUser(request: FastifyRequest): User {
  if (!request.user) {
    throw httpError(401, 'Missing bearer token');
  }
  return request.user;
}

const security = [{ firebaseIdToken: [] }];

/** The caller's own account (E-09). Personal data: never cached. */
export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAuth);
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/me',
    { schema: { tags: ['account'], summary: 'My account', security, response: { 200: Me } } },
    async (request) => toMe(currentUser(request)),
  );

  app.patch(
    '/me',
    {
      schema: {
        tags: ['account'],
        summary: 'Update my first name, avatar removal, visibility or notification preferences',
        security,
        body: UpdateMe,
        response: { 200: Me },
      },
    },
    async (request) => {
      const updated = await updateUser(app.db, currentUser(request).id, request.body);
      if (!updated) {
        throw httpError(401, 'Account deleted');
      }
      return toMe(updated);
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
