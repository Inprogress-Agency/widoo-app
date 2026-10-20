import {
  B2bClient,
  B2bClientInput,
  B2bClientPatch,
  B2bClientRoutesInput,
  B2bClients,
} from '@widoo/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  createClient,
  readClient,
  readClients,
  setClientRoutes,
  updateClient,
} from '../b2b/clients';
import { httpError } from '../errors';

const security = [{ firebaseIdToken: [] }];
const tags = ['admin'];
const ClientParams = z.object({ id: z.uuid() });

/** Set by the guard of the section, which every route of this plugin runs first. */
function actorIdOf(request: FastifyRequest): string {
  if (!request.user) {
    throw httpError(401, 'Missing bearer token');
  }
  return request.user.id;
}

/**
 * The B2B partners of the admin (A-10, wiki API › Admin): hotels, concierges and tourist offices
 * that pay for routes under their name, for editors and admins. Each write is in the journal.
 * Never cached.
 */
export const adminB2bRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAdminSection('b2bClients'));
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/admin/b2b-clients',
    {
      schema: {
        tags,
        summary: 'The B2B partners',
        security,
        response: { 200: B2bClients },
      },
    },
    async () => readClients(app.db),
  );

  app.get(
    '/admin/b2b-clients/:id',
    {
      schema: {
        tags,
        summary: 'The card of a B2B partner',
        security,
        params: ClientParams,
        response: { 200: B2bClient },
      },
    },
    async (request) => {
      const client = await readClient(app.db, request.params.id);
      if (!client) {
        throw httpError(404, 'Partner not found');
      }
      return client;
    },
  );

  app.post(
    '/admin/b2b-clients',
    {
      schema: {
        tags,
        summary: 'Register a B2B partner',
        security,
        body: B2bClientInput,
        response: { 201: B2bClient },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await createClient(app.db, actorIdOf(request), request.body)),
  );

  app.patch(
    '/admin/b2b-clients/:id',
    {
      schema: {
        tags,
        summary: 'Change a B2B partner (never its slug)',
        security,
        params: ClientParams,
        body: B2bClientPatch,
        response: { 200: B2bClient },
      },
    },
    async (request) => updateClient(app.db, actorIdOf(request), request.params.id, request.body),
  );

  app.put(
    '/admin/b2b-clients/:id/routes',
    {
      schema: {
        tags,
        summary: 'Choose the 3 to 10 published routes of a B2B partner, in order',
        security,
        params: ClientParams,
        body: B2bClientRoutesInput,
        response: { 200: B2bClient },
      },
    },
    async (request) =>
      setClientRoutes(app.db, actorIdOf(request), request.params.id, request.body.routeIds),
  );
};
