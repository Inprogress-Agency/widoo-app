import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { isDatabaseUp } from '../db/client';

const HealthStatus = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['up', 'down']),
});

/** Uptime checks: 200 when the database answers, 503 otherwise. */
export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: 'API and database status',
        response: { 200: HealthStatus, 503: HealthStatus },
      },
    },
    async (request, reply) => {
      reply.header('cache-control', 'no-store');
      if (await isDatabaseUp(app.sql, request.log)) {
        return { status: 'ok', database: 'up' } as const;
      }
      return reply.status(503).send({ status: 'degraded', database: 'down' });
    },
  );
};
