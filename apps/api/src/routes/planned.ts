import { CreatePlannedRoute, PlannedRoute } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { canAccessRoute } from '../access/route-access';
import { httpError, premiumRequired } from '../errors';
import { createPlanned, ownedPlanned, readPlanned } from '../planned/repository';
import { snapshotOf } from '../planned/snapshot';
import { currentUser } from './me';

const security = [{ firebaseIdToken: [] }];
const tags = ['planning'];
const PlannedParams = z.strictObject({ id: z.uuid() });

/**
 * The caller's plannings (E-06, E-07, E-08). Personal data: never cached, and only the owner of
 * a planning reads or changes it, any other id answering 404.
 */
export const plannedRoutesPlugin: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAuth);
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.post(
    '/me/planned',
    {
      schema: {
        tags,
        summary: 'Plan a route: frozen snapshot, timeline of the start and bookings to tick',
        security,
        body: CreatePlannedRoute,
        response: { 201: PlannedRoute },
      },
    },
    async (request, reply) => {
      const user = currentUser(request);
      const snapshot = await snapshotOf(app.db, request.body.routeId);
      if (!snapshot) {
        throw httpError(404, 'Route not found');
      }
      if (!canAccessRoute(snapshot, user, new Date())) {
        throw premiumRequired('premium_route');
      }
      const planned = await createPlanned(
        app.db,
        user.id,
        snapshot,
        new Date(request.body.startsAt),
      );
      return reply.status(201).send(planned);
    },
  );

  app.get(
    '/me/planned/:id',
    {
      schema: {
        tags,
        summary: 'One of my plannings, readable even once the route is unpublished',
        security,
        params: PlannedParams,
        response: { 200: PlannedRoute },
      },
    },
    async (request) =>
      readPlanned(app.db, await ownedPlanned(app.db, currentUser(request).id, request.params.id)),
  );
};
