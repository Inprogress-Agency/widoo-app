import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { countBookingClick } from '../affiliation/go';
import { httpError } from '../errors';

/**
 * Redirects per minute and per address. A click is one write: this keeps a script from filling
 * `booking_clicks`, and is far above what a person taps.
 */
export const GO_RATE_LIMIT = 60;

const GoParams = z.object({ stepId: z.uuid() });

/**
 * `GET /go/:stepId` (A-09, D-048): public, counts the click on « Réserver » of a step and
 * redirects (302) to the link it shows, the creator's before the partner's of Widoo. It only ever
 * redirects to a link stored for the step: the caller gives no address. Never cached, never
 * indexed.
 */
export const goRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/go/:stepId',
    {
      config: {
        rateLimit: { max: GO_RATE_LIMIT, timeWindow: '1 minute', hook: 'preValidation' },
      },
      schema: {
        tags: ['booking'],
        summary: 'Count a click on « Réserver » and redirect to the booking link of the step',
        params: GoParams,
      },
    },
    async (request, reply) => {
      const link = await countBookingClick(app.db, request.params.stepId);
      if (!link) {
        throw httpError(404, 'No booking link for this step');
      }
      reply.header('cache-control', 'no-store');
      reply.header('x-robots-tag', 'noindex');
      reply.header('referrer-policy', 'no-referrer');
      return reply.redirect(link.url, 302);
    },
  );
};
