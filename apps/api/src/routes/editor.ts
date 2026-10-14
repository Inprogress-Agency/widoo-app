import {
  ChangeRouteStatus,
  CreateRoute,
  MyRouteList,
  MyRoutesQuery,
  OwnRoute,
  PutRouteSteps,
  UpdateRoute,
} from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { listOwnRoutes } from '../editor/list';
import { createRoute, putRouteSteps, readOwnRoute, updateRoute } from '../editor/repository';
import { changeRouteStatus, submitRoute } from '../editor/submit';
import { currentUser } from './me';

const security = [{ firebaseIdToken: [] }];
const tags = ['creation'];
const RouteParams = z.strictObject({ id: z.uuid() });

/**
 * The route editor (E-08, E-11 to E-14). Only the author reads or changes a route, any other
 * caller reading 404; drafts and revisions are never cached.
 */
export const editorRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAuth);
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/me/routes',
    {
      schema: {
        tags,
        summary: 'My routes, every status, the newest first',
        security,
        querystring: MyRoutesQuery,
        response: { 200: MyRouteList },
      },
    },
    async (request) => listOwnRoutes(app.db, currentUser(request).id, request.query),
  );

  app.get(
    '/me/routes/:id',
    {
      schema: {
        tags,
        summary: 'One of my routes in the editor: its revision when it is published',
        security,
        params: RouteParams,
        response: { 200: OwnRoute },
      },
    },
    async (request) => readOwnRoute(app.db, currentUser(request).id, request.params.id, new Date()),
  );

  app.post(
    '/routes',
    {
      schema: {
        tags,
        summary: 'Create a draft, without limit',
        security,
        body: CreateRoute,
        response: { 201: OwnRoute },
      },
    },
    async (request, reply) => {
      const route = await createRoute(app.db, currentUser(request), request.body.title, new Date());
      return reply.status(201).send(route);
    },
  );

  app.patch(
    '/routes/:id',
    {
      schema: {
        tags,
        summary: 'Change the information of my route: title, description, moods, audiences',
        security,
        params: RouteParams,
        body: UpdateRoute,
        response: { 200: OwnRoute },
      },
    },
    async (request) =>
      updateRoute(app.db, currentUser(request).id, request.params.id, request.body, new Date()),
  );

  app.put(
    '/routes/:id/steps',
    {
      schema: {
        tags,
        summary: 'Replace the ordered steps of my route; answers the orchestration result',
        security,
        params: RouteParams,
        body: PutRouteSteps,
        response: { 200: OwnRoute },
      },
    },
    async (request) =>
      putRouteSteps(app.db, currentUser(request).id, request.params.id, request.body, new Date()),
  );

  app.post(
    '/routes/:id/submit',
    {
      schema: {
        tags,
        summary:
          'Submit my route to moderation, or publish it for an editor; a published route ' +
          'submits its revision and stays online',
        security,
        params: RouteParams,
        response: { 200: OwnRoute },
      },
    },
    async (request) => submitRoute(app.db, currentUser(request), request.params.id, new Date()),
  );

  app.post(
    '/routes/:id/status',
    {
      schema: {
        tags,
        summary: 'Save my route as private, take a refused one back as a draft, or withdraw it',
        security,
        params: RouteParams,
        body: ChangeRouteStatus,
        response: { 200: OwnRoute },
      },
    },
    async (request) =>
      changeRouteStatus(
        app.db,
        currentUser(request).id,
        request.params.id,
        request.body.status,
        new Date(),
      ),
  );
};
