import { AdminUserDetail, AdminUsers, AdminUsersQuery } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { readUserDetail, readUsers } from '../admin/users-read';
import { httpError } from '../errors';

const security = [{ firebaseIdToken: [] }];
const tags = ['admin'];
const UserParams = z.object({ id: z.uuid() });

/**
 * Users and roles of the admin (A-06, wiki API › Admin). Moderators and admins open the section;
 * what each may do to an account is the rule `allowedUserActions`, checked in the transaction of
 * each write. Every write is in the journal of the admin. Never cached.
 */
export const adminUsersRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAdminSection('users'));
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/admin/users',
    {
      schema: {
        tags,
        summary: 'Search the accounts',
        security,
        querystring: AdminUsersQuery,
        response: { 200: AdminUsers },
      },
    },
    async (request) => readUsers(app.db, request.query),
  );

  app.get(
    '/admin/users/:id',
    {
      schema: {
        tags,
        summary: 'The card of an account',
        security,
        params: UserParams,
        response: { 200: AdminUserDetail },
      },
    },
    async (request) => {
      const detail = await readUserDetail(app.db, request.params.id);
      if (!detail) {
        throw httpError(404, 'User not found');
      }
      return detail;
    },
  );
};
