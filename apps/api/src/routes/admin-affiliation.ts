import {
  AffiliateProgram,
  AffiliateProgramInput,
  AffiliateProgramPatch,
  AffiliatePrograms,
} from '@widoo/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { createProgram, readPrograms, updateProgram } from '../affiliation/programs';
import { httpError } from '../errors';

const security = [{ firebaseIdToken: [] }];
const tags = ['admin'];
const ProgramParams = z.object({ id: z.uuid() });

/** Set by the guard of the section, which every route of this plugin runs first. */
function actorIdOf(request: FastifyRequest): string {
  if (!request.user) {
    throw httpError(401, 'Missing bearer token');
  }
  return request.user.id;
}

/**
 * Affiliation of the admin (A-09, wiki API › Admin): the programs Widoo is registered with, for
 * editors and admins. Each write is in the journal. Never cached.
 */
export const adminAffiliationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAdminSection('affiliation'));
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/admin/affiliate-programs',
    {
      schema: {
        tags,
        summary: 'The affiliate programs',
        security,
        response: { 200: AffiliatePrograms },
      },
    },
    async () => readPrograms(app.db),
  );

  app.post(
    '/admin/affiliate-programs',
    {
      schema: {
        tags,
        summary: 'Register an affiliate program',
        security,
        body: AffiliateProgramInput,
        response: { 201: AffiliateProgram },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await createProgram(app.db, actorIdOf(request), request.body)),
  );

  app.patch(
    '/admin/affiliate-programs/:id',
    {
      schema: {
        tags,
        summary: 'Change an affiliate program',
        security,
        params: ProgramParams,
        body: AffiliateProgramPatch,
        response: { 200: AffiliateProgram },
      },
    },
    async (request) => updateProgram(app.db, actorIdOf(request), request.params.id, request.body),
  );
};
