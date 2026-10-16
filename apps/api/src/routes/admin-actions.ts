import { AdminActionFilters, AdminActions, AdminActionsQuery } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { readAdminActionFilters, readAdminActions } from '../admin/actions-read';

const security = [{ firebaseIdToken: [] }];
const tags = ['admin'];

/**
 * The journal of the admin (A-12, wiki API › Admin): every write of the team, read only. Admin
 * only. Never cached.
 */
export const adminActionsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAdminSection('actionLog'));
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/admin/actions',
    {
      schema: {
        tags,
        summary: 'The writes of the admin, most recent first',
        security,
        querystring: AdminActionsQuery,
        response: { 200: AdminActions },
      },
    },
    async (request) => readAdminActions(app.db, request.query),
  );

  app.get(
    '/admin/actions/filters',
    {
      schema: {
        tags,
        summary: 'The values the filters of the journal offer',
        security,
        response: { 200: AdminActionFilters },
      },
    },
    async () => readAdminActionFilters(app.db),
  );
};
