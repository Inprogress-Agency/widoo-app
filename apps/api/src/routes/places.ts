import { CreatePlace, Place, PlaceSearchQuery, PlaceSearchResult } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { createPlace } from '../places/create';
import { searchPlaces } from '../places/search';
import { currentUser } from './me';

const security = [{ firebaseIdToken: [] }];
const tags = ['creation'];

/**
 * Search, creation and edition of places (E-13, wiki API › Lieux): signed in, never cached, as
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

  app.post(
    '/places',
    {
      schema: {
        tags,
        summary: 'Create a place; 409 with the close place unless `force`',
        security,
        body: CreatePlace,
        response: { 201: Place },
      },
    },
    async (request, reply) => {
      const place = await createPlace(app.db, currentUser(request).id, request.body, new Date());
      return reply.status(201).send(place);
    },
  );
};
