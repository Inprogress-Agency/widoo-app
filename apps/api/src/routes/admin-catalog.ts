import {
  CatalogRouteAction,
  CatalogRoutes,
  CatalogRoutesQuery,
  RepublishBody,
} from '@widoo/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { reassignRouteToTeam, republishRoute } from '../catalog/route-actions';
import { readCatalogRoutes } from '../catalog/routes';
import { httpError } from '../errors';
import type { User } from '../users/repository';

const security = [{ firebaseIdToken: [] }];
const tags = ['admin'];
const RouteParams = z.object({ id: z.uuid() });

/** Set by the guard of the section, which every route of this plugin runs first. */
function memberOf(request: FastifyRequest): User {
  if (!request.user) {
    throw httpError(401, 'Missing bearer token');
  }
  return request.user;
}

/**
 * Routes of the catalog (A-04, wiki API › Admin). Everyone who opens the catalog reads the list,
 * an editor the routes of the team only; putting a route back online or handing it to the team
 * is for admins. Unpublishing stays with the moderation decisions. Never cached.
 */
export const adminCatalogRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAdminSection('catalog'));
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/admin/routes',
    {
      schema: {
        tags,
        summary: 'Routes of the catalog',
        security,
        querystring: CatalogRoutesQuery,
        response: { 200: CatalogRoutes },
      },
    },
    async (request) =>
      readCatalogRoutes(app.db, request.query, {
        isTeamOnly: memberOf(request).role === 'editor',
      }),
  );

  app.post(
    '/admin/routes/:id/republish',
    {
      onRequest: app.requireRole('admin'),
      schema: {
        tags,
        summary: 'Put an unpublished route back online',
        security,
        params: RouteParams,
        body: RepublishBody,
        response: { 200: CatalogRouteAction },
      },
    },
    async (request) =>
      republishRoute(app.db, {
        routeId: request.params.id,
        actorId: memberOf(request).id,
        message: request.body.message,
      }),
  );

  app.post(
    '/admin/routes/:id/reassign',
    {
      onRequest: app.requireRole('admin'),
      schema: {
        tags,
        summary: 'Hand a route over to the Widoo team',
        security,
        params: RouteParams,
        response: { 200: CatalogRouteAction },
      },
    },
    async (request) =>
      reassignRouteToTeam(app.db, {
        routeId: request.params.id,
        actorId: memberOf(request).id,
      }),
  );
};
