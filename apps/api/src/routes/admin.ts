import { AdminCounters, AdminStats } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { readAdminCounters } from '../admin/counters';
import { readAdminStats } from '../admin/stats';
import { httpError } from '../errors';

const security = [{ firebaseIdToken: [] }];

/**
 * Routes of the admin (wiki API › Admin). Each one names the section it belongs to: the guard
 * checks the role against the matrix, the age of the session and the second factor. Never cached.
 */
export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/admin/counters',
    {
      // Every member of the team opens the dashboard; each counter is then filtered by role.
      onRequest: app.requireAdminSection('dashboard'),
      schema: {
        tags: ['admin'],
        summary: 'Counters of the navigation',
        security,
        response: { 200: AdminCounters },
      },
    },
    async (request) => {
      if (!request.user) {
        throw httpError(401, 'Missing bearer token');
      }
      return readAdminCounters(app.db, request.user.role);
    },
  );

  app.get(
    '/admin/stats',
    {
      onRequest: app.requireAdminSection('dashboard'),
      schema: {
        tags: ['admin'],
        summary: 'Figures of the dashboard',
        security,
        response: { 200: AdminStats },
      },
    },
    async (request) => {
      if (!request.user) {
        throw httpError(401, 'Missing bearer token');
      }
      return readAdminStats(app.db, request.user.role);
    },
  );
};
