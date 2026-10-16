import { RouteRatingList, RouteRatingsQuery } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { cacheHook } from '../http-cache';
import { listRouteRatings } from '../ratings/reviews';

/**
 * The reviews of a route (E-05 › « Voir les 128 avis »): public, cached 30 s with an ETag; a
 * signed-in caller revalidates at each read, so that the review they just wrote shows at once.
 */
export const routeRatingsPlugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/routes/:id/ratings',
    {
      onRequest: app.optionalAuth,
      onSend: cacheHook(30, { dependsOnCaller: true }),
      schema: {
        tags: ['discovery'],
        summary: 'Visible reviews of an online route, newest first',
        params: z.strictObject({ id: z.uuid() }),
        querystring: RouteRatingsQuery,
        response: { 200: RouteRatingList },
      },
    },
    async (request) => listRouteRatings(app.db, request.params.id, request.query),
  );
};
