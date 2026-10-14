import { CreateRoute, OwnRoute } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { createRoute, readOwnRoute } from '../editor/repository';
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
};
