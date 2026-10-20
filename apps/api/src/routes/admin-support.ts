import { AdminSupportMessage, AdminSupportMessages, AdminSupportQuery } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { httpError } from '../errors';
import { readSupportMessage, readSupportMessages } from '../support/admin';

const security = [{ firebaseIdToken: [] }];
const tags = ['admin'];
const MessageParams = z.object({ id: z.uuid() });

/**
 * The messages of « Nous écrire » for the team (A-13, wiki API › Admin): moderators and admins
 * only, since they hold what users wrote and the address they gave. Never cached.
 */
export const adminSupportRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAdminSection('support'));
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/admin/support',
    {
      schema: {
        tags,
        summary: 'The messages of « Nous écrire », the ones to handle first',
        security,
        querystring: AdminSupportQuery,
        response: { 200: AdminSupportMessages },
      },
    },
    async (request) => readSupportMessages(app.db, request.query),
  );

  app.get(
    '/admin/support/:id',
    {
      schema: {
        tags,
        summary: 'A message of « Nous écrire » in full',
        security,
        params: MessageParams,
        response: { 200: AdminSupportMessage },
      },
    },
    async (request) => {
      const message = await readSupportMessage(app.db, request.params.id);
      if (!message) {
        throw httpError(404, 'Message not found');
      }
      return message;
    },
  );
};
