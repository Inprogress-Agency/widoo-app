import {
  CreatePlace,
  Place,
  PlaceSearchQuery,
  PlaceSearchResult,
  PlaceSignalBody,
  PlaceSignalReceipt,
  placeSignalDailyLimit,
  UpdatePlace,
} from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { placeSignalLimitReached } from '../errors';
import { createPlace } from '../places/create';
import { searchPlaces } from '../places/search';
import { updatePlace } from '../places/update';
import { createVerificationRules } from '../verification/rules';
import { submitPlaceSignal } from '../verification/signals';
import { currentUser } from './me';

const security = [{ firebaseIdToken: [] }];
const tags = ['creation'];

/**
 * Search, creation and edition of places (E-13, wiki API › Lieux), and the signals of the
 * visitors (D-056): signed in, never cached, as the answer is the caller's working material.
 */
export const placesRoutes: FastifyPluginAsyncZod = async (app) => {
  const verificationRules = createVerificationRules(app.db);
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

  app.patch(
    '/places/:id',
    {
      schema: {
        tags,
        summary: 'Edit a place: its creator while only their routes use it, or a moderator',
        security,
        params: z.strictObject({ id: z.uuid() }),
        body: UpdatePlace,
        response: { 200: Place },
      },
    },
    async (request) => updatePlace(app.db, currentUser(request), request.params.id, request.body),
  );

  app.post(
    '/places/:id/signals',
    {
      schema: {
        tags: ['planning'],
        summary: 'Confirm a place or report what changed, during or after an outing',
        security,
        params: z.strictObject({ id: z.uuid() }),
        body: PlaceSignalBody,
        response: { 200: PlaceSignalReceipt, 201: PlaceSignalReceipt },
      },
    },
    async (request, reply) => {
      const userId = currentUser(request).id;
      const placeId = request.params.id;
      const now = new Date();
      const rules = await verificationRules();
      const outcome = await submitPlaceSignal(app.db, userId, placeId, request.body, rules, now);
      if (outcome === 'limited') throw placeSignalLimitReached(placeSignalDailyLimit);
      // Journalised, never told to the account (wiki Creation-et-Moderation › Anti-abus).
      if (outcome === 'ignored') request.log.info({ userId, placeId }, 'place signal ignored');
      const receipt: PlaceSignalReceipt = {
        placeId,
        kind: request.body.kind,
        reason: request.body.reason ?? null,
        isCounted: outcome === 'counted',
        receivedAt: now.toISOString(),
      };
      return reply.status(receipt.isCounted ? 201 : 200).send(receipt);
    },
  );
};
