import {
  AdminUserDetail,
  AdminUsers,
  AdminUsersQuery,
  CertificationBody,
  ChangeUserRoleBody,
  GiftBody,
  MyDataExport,
  UserReasonBody,
} from '@widoo/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { recordAdminAction } from '../admin/actions';
import {
  assertCanExport,
  changeUserRole,
  deleteUser,
  giftUser,
  reactivateUser,
  setCertification,
  suspendUser,
  type Actor,
} from '../admin/users-actions';
import { readUserDetail, readUsers } from '../admin/users-read';
import { httpError } from '../errors';
import { exportUserData } from '../users/export';
import { EXPORT_RATE_LIMIT, exportFileName } from './me-export';

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

  app.post(
    '/admin/users/:id/certification',
    {
      schema: {
        tags,
        summary: 'Award or remove the Créateur certifié badge',
        security,
        params: UserParams,
        body: CertificationBody,
        response: { 200: AdminUserDetail },
      },
    },
    async (request) => setCertification(app.db, actorOf(request), request.params.id, request.body),
  );

  app.get(
    '/admin/users/:id/export',
    {
      config: {
        rateLimit: {
          max: EXPORT_RATE_LIMIT,
          timeWindow: '1 hour',
          // After the guard: counted by member of the team, never by a shared address.
          hook: 'preValidation',
          keyGenerator: (request: FastifyRequest) => `admin-export:${request.user?.id ?? ''}`,
        },
      },
      schema: {
        tags,
        summary: 'Export the data of an account, the same file as the app’s',
        security,
        params: UserParams,
        response: { 200: MyDataExport },
      },
    },
    async (request, reply) => {
      const actor = actorOf(request);
      const targetId = request.params.id;
      const now = new Date();
      await assertCanExport(app.db, actor, targetId);
      const exported = await exportUserData(app.db, targetId, now);
      if (!exported) {
        throw httpError(404, 'User not found');
      }
      // Reading the data of someone else leaves a trace, like any write of the admin.
      await recordAdminAction(app.db, {
        actorId: actor.id,
        action: 'user.export',
        targetType: 'user',
        targetId,
      });
      reply.header('content-disposition', `attachment; filename="${exportFileName(now)}"`);
      return exported;
    },
  );

  app.delete(
    '/admin/users/:id',
    {
      schema: {
        tags,
        summary: 'Delete an account, with the rule of the app',
        security,
        params: UserParams,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await deleteUser(app.db, actorOf(request), request.params.id);
      return reply.status(204).send(null);
    },
  );
};
