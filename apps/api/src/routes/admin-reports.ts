import {
  AdminReportsQuery,
  AdminRouteReports,
  ResolvedReport,
  ResolveReportBody,
} from '@widoo/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { httpError } from '../errors';
import { readOpenRouteReports, resolveRouteReport } from '../reports/admin-reports';

const security = [{ firebaseIdToken: [] }];
const tags = ['admin'];
const ReportParams = z.object({ id: z.uuid() });

/** Set by the guard of the section, which every route of this plugin runs first. */
function actorIdOf(request: FastifyRequest): string {
  if (!request.user) {
    throw httpError(401, 'Missing bearer token');
  }
  return request.user.id;
}

/**
 * Reports of the admin (A-03, wiki API › Admin): the open reports of routes and their resolution.
 * Moderators and admins only; each decision is written in the journal of the admin. Never cached.
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

  app.post(
    '/admin/reports/:id/resolve',
    {
      schema: {
        tags,
        summary: 'Accept or reject a report of a route',
        security,
        params: ReportParams,
        body: ResolveReportBody,
        response: { 200: ResolvedReport },
      },
    },
    async (request) =>
      resolveRouteReport(app.db, {
        reportId: request.params.id,
        actorId: actorIdOf(request),
        outcome: request.body.outcome,
        note: request.body.note,
      }),
  );
};
