import { LegalDocument, LegalParams, LegalQuery } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { cacheHook } from '../http-cache';
import { legalDocumentOf } from '../legal/documents';

/**
 * `GET /legal/:doc` (wiki API, D-063): the terms or the privacy policy in the language of the app,
 * versioned in the repository. Public and cacheable: the text depends on no caller.
 */
export const legalRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/legal/:doc',
    {
      onSend: cacheHook(3600),
      schema: {
        tags: ['system'],
        summary: 'Terms of use or privacy policy, in French or English, with its version',
        params: LegalParams,
        querystring: LegalQuery,
        response: { 200: LegalDocument },
      },
    },
    async (request) => legalDocumentOf(request.params.doc, request.query.locale),
  );
};
