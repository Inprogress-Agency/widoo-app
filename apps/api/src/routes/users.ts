import { PublicProfile, PublicProfileQueryParams } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { httpError } from '../errors';
import { cacheHook } from '../http-cache';
import { createCertificationThresholds } from '../users/certification';
import { readPublicProfile } from '../users/public-profile';

const ProfileParams = z.strictObject({ id: z.uuid() });

/**
 * The public profile of a creator (E-16, wiki API › Découverte). Public, with an optional token:
 * the cards of the Premium routes the caller has the right to come whole (D-075), so it is cached
 * as the search, public without a token, private with one. A masked profile, a deleted account
 * and an unknown id answer the same 404 (D-025).
 */
export const usersRoutes: FastifyPluginAsyncZod = async (app) => {
  const certificationThresholds = createCertificationThresholds(app.db);

  app.get(
    '/users/:id/profile',
    {
      onRequest: app.optionalAuth,
      onSend: cacheHook(30, { dependsOnCaller: true }),
      schema: {
        tags: ['discovery'],
        summary: 'Public profile of a creator, with their featured and published routes',
        params: ProfileParams,
        querystring: PublicProfileQueryParams,
        response: { 200: PublicProfile },
      },
    },
    async (request) => {
      const profile = await readPublicProfile(
        app.db,
        request.params.id,
        request.query,
        request.user,
        await certificationThresholds(),
      );
      if (!profile) throw httpError(404, 'Profile not found');
      return profile;
    },
  );
};
