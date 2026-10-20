import { PublicPartner } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { readPublicPartner } from '../b2b/public';
import { httpError } from '../errors';
import { cacheHook } from '../http-cache';

const PartnerParams = z.object({ slug: z.string().max(60) });

/**
 * `GET /public/partners/:slug` (wiki API › Admin, publics liés à l'admin): the page of a B2B
 * partner for the site, without any account. Public and cacheable a minute: it depends on no
 * caller, and holds nothing private.
 */
export const publicPartnersRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/public/partners/:slug',
    {
      onSend: cacheHook(60),
      schema: {
        tags: ['public'],
        summary: 'The page of a B2B partner: its name and the routes it chose, in order',
        params: PartnerParams,
        response: { 200: PublicPartner },
      },
    },
    async (request) => {
      const partner = await readPublicPartner(app.db, request.params.slug);
      if (!partner) {
        throw httpError(404, 'Partner not found');
      }
      return partner;
    },
  );
};
