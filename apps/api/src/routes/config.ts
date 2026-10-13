import { AppConfig, defaultBucketThresholds, labels, taxonomies } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { createCachedSetting } from '../search/settings';
import { createCertificationThresholds } from '../users/certification';
import { readActiveAnecdoteQuestions } from '../users/profile';

type Options = { minAppVersion: string };

/**
 * Startup configuration of the app and the admin. Bucket thresholds are the shared defaults
 * until the API reads them from the `settings` table; the anecdote questions and the
 * certification thresholds are read from the database and kept one minute per process, so that
 * the team changes them without a deployment.
 */
export const configRoutes: FastifyPluginAsyncZod<Options> = async (app, { minAppVersion }) => {
  const anecdoteQuestions = createCachedSetting(
    () => readActiveAnecdoteQuestions(app.db),
    (questions) => questions,
  );
  const certificationThresholds = createCertificationThresholds(app.db);

  app.get(
    '/config',
    {
      schema: {
        tags: ['system'],
        summary:
          'Taxonomies, labels, thresholds, anecdote questions, certification thresholds and ' +
          'minimum app version',
        response: { 200: AppConfig },
      },
    },
    async (_request, reply) => {
      const [questions, thresholds] = await Promise.all([
        anecdoteQuestions(),
        certificationThresholds(),
      ]);
      reply.header('cache-control', 'public, max-age=300');
      return {
        minAppVersion,
        taxonomies,
        labels,
        thresholds: defaultBucketThresholds,
        anecdoteQuestions: questions,
        certificationThresholds: thresholds,
      };
    },
  );
};
