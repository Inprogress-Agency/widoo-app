import {
  CatalogPlaceDetail,
  CatalogPlaceInput,
  CatalogPlaces,
  CatalogPlacesQuery,
  CatalogRouteAction,
  CatalogRoutes,
  CatalogRoutesQuery,
  PlaceImportBody,
  PlaceImportResult,
  RepublishBody,
} from '@widoo/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { importPlaces } from '../catalog/place-import';
import { createCatalogPlace, updateCatalogPlace } from '../catalog/place-writes';
import { readCatalogPlace, readCatalogPlaces } from '../catalog/places';
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
 * Routes and places of the catalog (A-04, wiki API › Admin). Everyone who opens the catalog reads
 * the lists, an editor the routes of the team only; putting a route back online or handing it to the team
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

  app.get(
    '/admin/places',
    {
      schema: {
        tags,
        summary: 'Places of the catalog',
        security,
        querystring: CatalogPlacesQuery,
        response: { 200: CatalogPlaces },
      },
    },
    async (request) => readCatalogPlaces(app.db, request.query),
  );

  app.get(
    '/admin/places/:id',
    {
      schema: {
        tags,
        summary: 'Sheet of a place',
        security,
        params: RouteParams,
        response: { 200: CatalogPlaceDetail },
      },
    },
    async (request) => {
      const place = await readCatalogPlace(app.db, request.params.id);
      if (!place) {
        throw httpError(404, 'Place not found');
      }
      return place;
    },
  );

  // Editors and admins write the places; a moderator reads them (wiki Admin-Web › Rôles).
  app.post(
    '/admin/places',
    {
      onRequest: app.requireRole('editor'),
      schema: {
        tags,
        summary: 'Create a place by hand',
        security,
        body: CatalogPlaceInput,
        response: { 201: CatalogPlaceDetail },
      },
    },
    async (request, reply) => {
      const id = await createCatalogPlace(app.db, request.body, memberOf(request).id);
      const place = await readCatalogPlace(app.db, id);
      if (!place) {
        throw new Error('Created place not found');
      }
      return reply.status(201).send(place);
    },
  );

  app.patch(
    '/admin/places/:id',
    {
      onRequest: app.requireRole('editor'),
      schema: {
        tags,
        summary: 'Replace the sheet of a place',
        security,
        params: RouteParams,
        body: CatalogPlaceInput,
        response: { 200: CatalogPlaceDetail },
      },
    },
    async (request) => {
      const { id } = request.params;
      const wasUpdated = await updateCatalogPlace(app.db, id, request.body, memberOf(request).id);
      const place = wasUpdated ? await readCatalogPlace(app.db, id) : undefined;
      if (!place) {
        throw httpError(404, 'Place not found');
      }
      return place;
    },
  );

  app.post(
    '/admin/places/import',
    {
      onRequest: app.requireRole('admin'),
      schema: {
        tags,
        summary: 'Import places from the rows of a file, or preview the import',
        security,
        body: PlaceImportBody,
        response: { 200: PlaceImportResult },
      },
    },
    async (request) => importPlaces(app.db, request.body, memberOf(request).id),
  );
};
