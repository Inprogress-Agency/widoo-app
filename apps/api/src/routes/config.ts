import {
  AppConfig,
  bucketSettingKeys,
  bucketThresholdsOf,
  labels,
  taxonomies,
} from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { legalVersions } from '../legal/documents';
import { createCachedSetting, readSettings } from '../search/settings';
import { createAppVersions } from '../system/app-versions';
import { createCertificationThresholds } from '../users/certification';
import { readActiveAnecdoteQuestions } from '../users/profile';

type Options = { minAppVersion: string };

/**
 * Startup configuration of the app and the admin. The bucket bounds the engine classifies with,
 * the anecdote questions, the certification thresholds and the build versions of each platform
 * are read from the database and kept one minute per process, so that the team changes them
 * without a deployment.
 */
export const configRoutes: FastifyPluginAsyncZod<Options> = async (app, { minAppVersion }) => {
  const anecdoteQuestions = createCachedSetting(
    () => readActiveAnecdoteQuestions(app.db),
    (questions) => questions,
  );
  // The same bounds as the editor's (`orchestrationSettingsOf`), each group on its default.
  const bucketThresholds = createCachedSetting(
    () => readSettings(app.db, Object.values(bucketSettingKeys)),
    bucketThresholdsOf,
  );
  const certificationThresholds = createCertificationThresholds(app.db);
  const appVersions = createAppVersions(app.db, minAppVersion);

  app.get(
    '/config',
    {
      schema: {
        tags: ['system'],
        summary:
          'Taxonomies, labels, thresholds, anecdote questions, certification thresholds, ' +
          'build versions per platform and versions of the legal texts',
        response: { 200: AppConfig },
      },
    },
    async (_request, reply) => {
      const [buckets, questions, thresholds, versions] = await Promise.all([
        bucketThresholds(),
        anecdoteQuestions(),
        certificationThresholds(),
        appVersions(),
      ]);
      reply.header('cache-control', 'public, max-age=300');
      return {
        minAppVersion,
        appVersions: versions,
        legal: legalVersions,
        taxonomies,
        labels,
        thresholds: buckets,
        anecdoteQuestions: questions,
        certificationThresholds: thresholds,
      };
    },
  );
};
