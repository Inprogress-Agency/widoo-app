import { AdminReportsQuery, AdminRouteReports } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { readOpenRouteReports } from '../reports/admin-reports';

const security = [{ firebaseIdToken: [] }];
const tags = ['admin'];

/**
 * Reports of the admin (A-03, wiki API › Admin): the open reports of routes. Moderators and
 * admins only. Never cached.
 */
export const adminReportsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAdminSection('reports'));
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/admin/reports',
    {
      schema: {
        tags,
        summary: 'Open reports of routes',
        security,
        querystring: AdminReportsQuery,
        response: { 200: AdminRouteReports },
      },
    },
    async (request) => readOpenRouteReports(app.db, request.query),
  );
};
