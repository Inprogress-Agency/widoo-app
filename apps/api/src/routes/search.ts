import { RouteCount, RouteCountQuery, RouteSearchQuery, RouteSearchResult } from '@widoo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { registerPublicCache } from '../http-cache';
import { areaKm2 } from '../search/filters';
import { clusterRoutes, countRoutes, searchRoutes } from '../search/repository';
import { clusterAreaKey, createClusterThreshold, readSetting } from '../search/settings';

/**
 * Discovery (wiki API › découverte) : routes of a map zone with filters, and their count for the
 * filter panel (E-03). Public, without personal data: cached 30 s with an ETag.
 */
export const searchRoutesPlugin: FastifyPluginAsyncZod = async (app) => {
  registerPublicCache(app, 30);
  const clusterAreaKm2 = createClusterThreshold(() => readSetting(app.db, clusterAreaKey));

  app.get(
    '/routes/search',
    {
      schema: {
        tags: ['discovery'],
        summary: 'Routes of a zone with filters, or clusters when the zone is too large',
        querystring: RouteSearchQuery,
        response: { 200: RouteSearchResult },
      },
    },
    async (request) => {
      const query = request.query;
      if (areaKm2(query.bbox) > (await clusterAreaKm2())) {
        return { items: [], nextCursor: null, clusters: await clusterRoutes(app.db, query) };
      }
      return { ...(await searchRoutes(app.db, query)), clusters: null };
    },
  );

  app.get(
    '/routes/search/count',
    {
      schema: {
        tags: ['discovery'],
        summary: 'Number of routes of the search, and without each active filter group',
        querystring: RouteCountQuery,
        response: { 200: RouteCount },
      },
    },
    async (request) => countRoutes(app.db, request.query),
  );
};
