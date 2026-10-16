import { AdminSettings } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { readAdminSettings } from '../admin/settings-catalog';

const security = [{ firebaseIdToken: [] }];
const tags = ['admin'];

/**
 * Settings of the admin (A-11, wiki API › Admin): the values the team changes without a
 * deployment. Admin only; each change is in the journal with its reason. Never cached.
 */
export const adminSettingsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.requireAdminSection('settings'));
  app.addHook('onSend', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
  });

  app.get(
    '/admin/settings',
    {
      schema: {
        tags,
        summary: 'The settings with the value in force',
        security,
        response: { 200: AdminSettings },
      },
    },
    async () => ({ items: await readAdminSettings(app.db) }),
  );
};
