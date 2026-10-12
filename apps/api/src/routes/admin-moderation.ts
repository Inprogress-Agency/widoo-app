import {
  ModerationDecision,
  ModerationQueue,
  ModerationQueueQuery,
  RejectionBody,
  RequestChangesBody,
} from '@widoo/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { httpError } from '../errors';
import { decideRoute } from '../moderation/decisions';
import { readModerationQueue } from '../moderation/queue';

const security = [{ firebaseIdToken: [] }];
const tags = ['admin'];
const RouteParams = z.object({ id: z.uuid() });

/** Set by the guard of the section, which every route of this plugin runs first. */
function actorIdOf(request: FastifyRequest): string {
  if (!request.user) {
    throw httpError(401, 'Missing bearer token');
  }
  return request.user.id;
}

/**
 * Moderation of the routes (A-02, wiki API › Admin): the queue, and the decisions of the team.
 * Moderators and admins only; every decision is written in `moderation_actions` and in the
 * journal of the admin. Never cached.
 */
export const adminModerationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAdminSection('moderation'));
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/admin/moderation',
    {
      schema: {
        tags,
        summary: 'Moderation queue',
        security,
        querystring: ModerationQueueQuery,
        response: { 200: ModerationQueue },
      },
    },
    async (request) => readModerationQueue(app.db, request.query),
  );

  app.post(
    '/admin/routes/:id/publish',
    {
      schema: {
        tags,
        summary: 'Publish a pending route',
        security,
        params: RouteParams,
        response: { 200: ModerationDecision },
      },
    },
    async (request) =>
      decideRoute(app.db, {
        routeId: request.params.id,
        actorId: actorIdOf(request),
        action: 'publish',
      }),
  );

  app.post(
    '/admin/routes/:id/request-changes',
    {
      schema: {
        tags,
        summary: 'Ask the author to change a pending route',
        security,
        params: RouteParams,
        body: RequestChangesBody,
        response: { 200: ModerationDecision },
      },
    },
    async (request) =>
      decideRoute(app.db, {
        routeId: request.params.id,
        actorId: actorIdOf(request),
        action: 'request_changes',
        message: request.body.message,
      }),
  );

  for (const [path, action, summary] of [
    ['reject', 'reject', 'Refuse a pending route'],
    ['unpublish', 'unpublish', 'Unpublish a published route'],
  ] as const) {
    app.post(
      `/admin/routes/:id/${path}`,
      {
        schema: {
          tags,
          summary,
          security,
          params: RouteParams,
          body: RejectionBody,
          response: { 200: ModerationDecision },
        },
      },
      async (request) =>
        decideRoute(app.db, {
          routeId: request.params.id,
          actorId: actorIdOf(request),
          action,
          reasonCode: request.body.reasonCode,
          message: request.body.message,
        }),
    );
  }
};
