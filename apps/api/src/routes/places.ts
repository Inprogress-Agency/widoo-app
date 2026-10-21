import { PlaceSearchQuery, PlaceSearchResult } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { searchPlaces } from '../places/search';

const security = [{ firebaseIdToken: [] }];
const tags = ['creation'];

/**
 * Search of places (E-13, wiki API › Lieux): signed in, never cached, as
 * the answer is the creator's working material.
 */
export const placesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAuth);
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/places/search',
    {
      schema: {
        tags,
        summary: 'Places of Widoo by text, position and category',
        security,
        querystring: PlaceSearchQuery,
        response: { 200: PlaceSearchResult },
      },
    },
    async (request) => ({ items: await searchPlaces(app.db, request.query) }),
  );
};
