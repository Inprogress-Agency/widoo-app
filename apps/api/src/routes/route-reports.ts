import { RouteReportBody, RouteReportReceipt } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { submitRouteReport } from '../reports/submit';
import { currentUser } from './me';

/**
 * `POST /routes/:id/reports` (wiki API › Lieux, E-05 « Signaler ce parcours », D-056): a signed-in
 * reader reports an online route; one report by user and by route over 7 sliding days. Never
 * cached.
 */
export const routeReportsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/routes/:id/reports',
    {
      onRequest: app.requireAuth,
      onSend: async (_request, reply) => {
        reply.header('cache-control', 'no-store');
      },
      schema: {
        tags: ['discovery'],
        summary: 'Report an online route: a place that changed, an abuse, a wrong information',
        security: [{ firebaseIdToken: [] }],
        params: z.strictObject({ id: z.uuid() }),
        body: RouteReportBody,
        response: { 201: RouteReportReceipt },
      },
    },
    async (request, reply) =>
      reply
        .status(201)
        .send(
          await submitRouteReport(app.db, currentUser(request), request.params.id, request.body),
        ),
  );
};
