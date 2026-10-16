import { AdminSetting, AdminSettings, UpdateSettingBody } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { readAdminSettings } from '../admin/settings-catalog';
import { updateSetting } from '../admin/settings-update';
import { httpError } from '../errors';

const security = [{ firebaseIdToken: [] }];
const tags = ['admin'];
const SettingParams = z.object({ key: z.string().min(1).max(100) });

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

  app.patch(
    '/admin/settings/:key',
    {
      schema: {
        tags,
        summary: 'Change a setting, with a reason kept in the journal',
        security,
        params: SettingParams,
        body: UpdateSettingBody,
        response: { 200: AdminSetting },
      },
    },
    async (request) => {
      if (!request.user) {
        throw httpError(401, 'Missing bearer token');
      }
      return updateSetting(app.db, request.user.id, request.params.key, request.body);
    },
  );
};
