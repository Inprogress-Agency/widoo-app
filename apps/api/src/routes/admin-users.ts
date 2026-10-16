import {
  AdminUserDetail,
  AdminUsers,
  AdminUsersQuery,
  ChangeUserRoleBody,
  GiftBody,
  UserReasonBody,
} from '@widoo/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  changeUserRole,
  giftUser,
  reactivateUser,
  suspendUser,
  type Actor,
} from '../admin/users-actions';
import { readUserDetail, readUsers } from '../admin/users-read';
import { httpError } from '../errors';

const security = [{ firebaseIdToken: [] }];
const tags = ['admin'];
const UserParams = z.object({ id: z.uuid() });

/** Set by the guard of the section, which every route of this plugin runs first. */
function actorOf(request: FastifyRequest): Actor {
  if (!request.user) {
    throw httpError(401, 'Missing bearer token');
  }
  return { id: request.user.id, role: request.user.role };
}

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

  app.patch(
    '/admin/users/:id/role',
    {
      schema: {
        tags,
        summary: 'Change the role of an account (admin only, never one’s own)',
        security,
        params: UserParams,
        body: ChangeUserRoleBody,
        response: { 200: AdminUserDetail },
      },
    },
    async (request) =>
      changeUserRole(app.db, actorOf(request), request.params.id, request.body.role),
  );

  app.post(
    '/admin/users/:id/suspend',
    {
      schema: {
        tags,
        summary: 'Suspend an account',
        security,
        params: UserParams,
        body: UserReasonBody,
        response: { 200: AdminUserDetail },
      },
    },
    async (request) =>
      suspendUser(app.db, actorOf(request), request.params.id, request.body.reason),
  );

  app.post(
    '/admin/users/:id/reactivate',
    {
      schema: {
        tags,
        summary: 'Lift the suspension of an account',
        security,
        params: UserParams,
        body: UserReasonBody,
        response: { 200: AdminUserDetail },
      },
    },
    async (request) =>
      reactivateUser(app.db, actorOf(request), request.params.id, request.body.reason),
  );

  app.post(
    '/admin/users/:id/gift',
    {
      schema: {
        tags,
        summary: 'Offer Premium until a date, or one Premium route',
        security,
        params: UserParams,
        body: GiftBody,
        response: { 200: AdminUserDetail },
      },
    },
    async (request) => giftUser(app.db, actorOf(request), request.params.id, request.body),
  );
};
