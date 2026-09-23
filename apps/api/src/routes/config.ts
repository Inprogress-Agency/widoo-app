import {
  AppConfig,
  defaultBucketThresholds,
  labels,
  taxonomies,
  type AppConfig as AppConfigBody,
} from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

type Options = { minAppVersion: string };

/**
 * Startup configuration of the app and the admin. Thresholds are the shared defaults until the
 * API reads them from the `settings` table.
 */
export const configRoutes: FastifyPluginAsyncZod<Options> = async (app, { minAppVersion }) => {
  const body: AppConfigBody = {
    minAppVersion,
    taxonomies,
    labels,
    thresholds: defaultBucketThresholds,
  };

  app.get(
    '/config',
    {
      schema: {
        tags: ['system'],
        summary: 'Taxonomies, labels, thresholds and minimum app version',
        response: { 200: AppConfig },
      },
    },
    async (_request, reply) => {
      reply.header('cache-control', 'public, max-age=300');
      return body;
    },
  );
};
