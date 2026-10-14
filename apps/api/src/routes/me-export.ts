import { MyDataExport } from '@widoo/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { httpError } from '../errors';
import { exportUserData } from '../users/export';
import { currentUser } from './me';

/** Exports per hour and per account (wiki API: « quelques demandes par heure »). */
export const EXPORT_RATE_LIMIT = 5;

/** Name of the file of E-19, dated in Paris: `widoo-donnees-AAAA-MM-JJ.json`. */
export function exportFileName(now: Date): string {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now);
  return `widoo-donnees-${day}.json`;
}

const security = [{ firebaseIdToken: [] }];

/**
 * `GET /me/export` (E-19 › Confidentialité, D-063): the caller's data as a JSON file, prepared on
 * demand, written nowhere and never cached. Only the account of the token is read.
 */
export const meExportRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAuth);

  app.get(
    '/me/export',
    {
      config: {
        rateLimit: {
          max: EXPORT_RATE_LIMIT,
          timeWindow: '1 hour',
          // After `requireAuth`: counted by account, never by a shared address.
          hook: 'preValidation',
          keyGenerator: (request: FastifyRequest) => `user:${currentUser(request).id}`,
        },
      },
      schema: {
        tags: ['account'],
        summary: 'Download my data: profile, outings, created routes and the rest, as a file',
        security,
        response: { 200: MyDataExport },
      },
    },
    async (request, reply) => {
      const now = new Date();
      const exported = await exportUserData(app.db, currentUser(request).id, now);
      if (!exported) {
        throw httpError(401, 'Account deleted');
      }
      reply.header('cache-control', 'no-store');
      reply.header('content-disposition', `attachment; filename="${exportFileName(now)}"`);
      return exported;
    },
  );
};
