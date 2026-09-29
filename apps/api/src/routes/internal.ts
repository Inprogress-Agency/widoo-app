import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Db } from '../db/client';
import { httpError } from '../errors';
import { recomputeRecommendations } from '../recommendation/job';

/** Jobs of the internal routes; the tests replace them to leave the shared database alone. */
export type InternalJobs = {
  recommendation: (db: Db, now: Date) => Promise<{ updated: number }>;
};

export const defaultInternalJobs: InternalJobs = {
  recommendation: (db, now) => recomputeRecommendations(db, { now }),
};

const BEARER = /^Bearer ([^\s]{1,512})$/i;
const digest = (value: string) => createHash('sha256').update(value).digest();

/** Refuses a request without the service token; constant time, whatever the length. */
function requireServiceToken(token: string) {
  const expected = digest(token);
  return async (request: FastifyRequest) => {
    const given = BEARER.exec(request.headers.authorization ?? '')?.[1];
    if (!given || !timingSafeEqual(digest(given), expected)) {
      throw httpError(401, 'Invalid service token');
    }
  };
}

const JobResult = z.object({ updated: z.number().int().nonnegative() });

/**
 * Scheduled jobs (wiki API › Interne): Cloud Scheduler calls them with the service token
 * `INTERNAL_TOKEN`, never a user. Registered only when the token is configured; out of the docs.
 */
export const internalRoutes: FastifyPluginAsyncZod<{ token: string; jobs: InternalJobs }> = async (
  app,
  { token, jobs },
) => {
  app.addHook('onRequest', requireServiceToken(token));
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.post(
    '/internal/recommendation',
    {
      schema: {
        hide: true,
        summary: 'Recompute the stored components of the recommendation score',
        response: { 200: JobResult },
      },
    },
    async (request) => {
      const result = await jobs.recommendation(app.db, new Date());
      request.log.info(result, 'recommendation components recomputed');
      return result;
    },
  );
};
