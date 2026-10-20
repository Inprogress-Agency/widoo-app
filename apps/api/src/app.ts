import Fastify, { LogController, type FastifyBaseLogger } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { createFirebaseVerifier } from './auth/firebase-verifier';
import { registerAuth } from './auth/plugin';
import type { TokenVerifier } from './auth/verifier';
import type { DirectionsProvider } from '@widoo/orchestration';
import type { Config } from './config';
import { createDb, createSql } from './db/client';
import { createMapboxDirections } from './directions/mapbox';
import { registerDocs } from './docs';
import { registerErrorHandling } from './errors';
import type { Geocoder } from './geocode/geocoder';
import { localGeocoder } from './geocode/local';
import { createMapboxGeocoder } from './geocode/mapbox';
import { loggerOptions, requestIdOf, type LogStream } from './logger';
import { parseQueryString } from './query-string';
import { adminRoutes } from './routes/admin';
import { adminCatalogRoutes } from './routes/admin-catalog';
import { adminModerationRoutes } from './routes/admin-moderation';
import { adminReportsRoutes } from './routes/admin-reports';
import { adminActionsRoutes } from './routes/admin-actions';
import { adminAffiliationRoutes } from './routes/admin-affiliation';
import { adminB2bRoutes } from './routes/admin-b2b';
import { adminSettingsRoutes } from './routes/admin-settings';
import { adminUsersRoutes } from './routes/admin-users';
import { goRoutes } from './routes/go';
import { configRoutes } from './routes/config';
import { editorRoutes } from './routes/editor';
import { geocodeRoutes } from './routes/geocode';
import { healthRoutes } from './routes/health';
import { defaultInternalJobs, internalRoutes, type InternalJobs } from './routes/internal';
import { legalRoutes } from './routes/legal';
import { meRoutes } from './routes/me';
import { meExportRoutes } from './routes/me-export';
import { plannedRoutesPlugin } from './routes/planned';
import { routeRatingsPlugin } from './routes/ratings';
import { routeSheetRoutes } from './routes/route-sheet';
import { searchRoutesPlugin } from './routes/search';
import { supportRoutes } from './routes/support';
import { usersRoutes } from './routes/users';
import { registerSecurity } from './security';

export type BuildAppOptions = {
  logStream?: LogStream;
  /** Tests only (`TestTokenVerifier`): replaces Firebase. Refused in production. */
  tokenVerifier?: TokenVerifier;
  /** Tests only: replaces the jobs of the internal routes. Refused in production. */
  internalJobs?: InternalJobs;
  /** Tests only: replaces the geocoder of the search. Refused in production. */
  geocoder?: Geocoder;
  /** Tests only: replaces Mapbox Directions on the route sheet. Refused in production. */
  directions?: DirectionsProvider | null;
};

/** Firebase unless a verifier is injected; fails at startup rather than on the first request. */
function tokenVerifierOf(config: Config, injected: TokenVerifier | undefined): TokenVerifier {
  if (injected) {
    if (config.isProduction) {
      throw new Error('An injected token verifier is refused in production');
    }
    return injected;
  }
  if (!config.firebaseProjectId) {
    throw new Error('Invalid environment: FIREBASE_PROJECT_ID is required to serve the API');
  }
  return createFirebaseVerifier(config.firebaseProjectId);
}

/**
 * Mapbox with the server token; without it, the local zones outside production, and no geocoder
 * in production, where the search answers 503 rather than inventing zones.
 */
function geocoderOf(config: Config, log: FastifyBaseLogger): Geocoder | null {
  if (config.mapboxGeocodingToken) {
    return createMapboxGeocoder({
      token: config.mapboxGeocodingToken,
      isPermanent: config.isMapboxGeocodingPermanent,
      // The source and the status only: the URL holds the token and the text typed.
      onFailure: (failure) => log.warn({ geocoding: failure }, 'geocoding source failed'),
    });
  }
  if (config.isProduction) {
    log.warn('MAPBOX_GEOCODING_TOKEN is not set: GET /v1/geocode answers 503');
    return null;
  }
  log.warn('MAPBOX_GEOCODING_TOKEN is not set: GET /v1/geocode answers local zones');
  return localGeocoder;
}

/**
 * Mapbox Directions with the server token, for the exact trips of the route sheet only, never
 * stored (D-088); without it, the sheet serves our estimates.
 */
function directionsOf(config: Config, log: FastifyBaseLogger): DirectionsProvider | null {
  if (!config.mapboxDirectionsToken) {
    log.warn('MAPBOX_DIRECTIONS_TOKEN is not set: GET /v1/routes/:id serves estimated trips');
    return null;
  }
  return createMapboxDirections({
    token: config.mapboxDirectionsToken,
    // The profile and the status only: the URL holds the token.
    onFailure: (failure) => log.warn({ directions: failure }, 'directions failed'),
  });
}

/** Builds the API without listening, so that tests drive it with `app.inject()`. */
export async function buildApp(config: Config, options: BuildAppOptions = {}) {
  const tokenVerifier = tokenVerifierOf(config, options.tokenVerifier);
  if (options.internalJobs && config.isProduction) {
    throw new Error('Injected internal jobs are refused in production');
  }
  if (options.geocoder && config.isProduction) {
    throw new Error('An injected geocoder is refused in production');
  }
  if (options.directions !== undefined && config.isProduction) {
    throw new Error('Injected directions are refused in production');
  }
  const app = Fastify({
    logger: loggerOptions(config.logLevel, options.logStream),
    genReqId: requestIdOf,
    logController: new LogController({ requestIdLogLabel: 'requestId' }),
    // X-Forwarded-For is read only when the direct peer is a listed proxy.
    trustProxy: config.trustedProxies.length > 0 ? config.trustedProxies : false,
    routerOptions: { querystringParser: parseQueryString },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
  await registerSecurity(app, config);
  registerErrorHandling(app);

  const sql = createSql(config.databaseUrl);
  app.decorate('sql', sql);
  app.decorate('db', createDb(sql));
  app.addHook('onClose', async () => {
    await sql.end({ timeout: 5 });
  });
  registerAuth(app, tokenVerifier, {
    isSecondFactorRequired: !config.usesAuthEmulator,
    recentSignInMaxMs: config.adminRecentSignInMinutes * 60_000,
  });

  if (!config.isProduction) {
    await registerDocs(app);
  }
  await app.register(healthRoutes, { prefix: '/v1' });
  await app.register(configRoutes, { prefix: '/v1', minAppVersion: config.minAppVersion });
  await app.register(legalRoutes, { prefix: '/v1' });
  await app.register(supportRoutes, { prefix: '/v1' });
  await app.register(meRoutes, { prefix: '/v1' });
  await app.register(meExportRoutes, { prefix: '/v1' });
  await app.register(plannedRoutesPlugin, { prefix: '/v1' });
  await app.register(adminRoutes, { prefix: '/v1' });
  await app.register(adminModerationRoutes, { prefix: '/v1' });
  await app.register(adminCatalogRoutes, { prefix: '/v1' });
  await app.register(adminReportsRoutes, { prefix: '/v1' });
  await app.register(adminUsersRoutes, { prefix: '/v1' });
  await app.register(adminSettingsRoutes, { prefix: '/v1' });
  await app.register(adminActionsRoutes, { prefix: '/v1' });
  await app.register(adminAffiliationRoutes, { prefix: '/v1' });
  await app.register(adminB2bRoutes, { prefix: '/v1' });
  await app.register(goRoutes, { prefix: '/v1' });
  await app.register(searchRoutesPlugin, { prefix: '/v1' });
  await app.register(routeRatingsPlugin, { prefix: '/v1' });
  await app.register(routeSheetRoutes, {
    prefix: '/v1',
    directions:
      options.directions !== undefined ? options.directions : directionsOf(config, app.log),
  });
  await app.register(usersRoutes, { prefix: '/v1' });
  await app.register(editorRoutes, { prefix: '/v1' });
  await app.register(geocodeRoutes, {
    prefix: '/v1',
    geocoder: options.geocoder ?? geocoderOf(config, app.log),
    isCacheable: config.isMapboxGeocodingPermanent,
  });
  if (config.internalToken) {
    await app.register(internalRoutes, {
      prefix: '/v1',
      token: config.internalToken,
      jobs: options.internalJobs ?? defaultInternalJobs,
    });
  }

  return app;
}
