import Fastify, { LogController } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { createFirebaseVerifier } from './auth/firebase-verifier';
import { registerAuth } from './auth/plugin';
import type { TokenVerifier } from './auth/verifier';
import type { Config } from './config';
import { createDb, createSql } from './db/client';
import { registerDocs } from './docs';
import { registerErrorHandling } from './errors';
import { loggerOptions, requestIdOf, type LogStream } from './logger';
import { parseQueryString } from './query-string';
import { configRoutes } from './routes/config';
import { healthRoutes } from './routes/health';
import { meRoutes } from './routes/me';
import { registerSecurity } from './security';

export type BuildAppOptions = {
  logStream?: LogStream;
  /** Tests only (`TestTokenVerifier`): replaces Firebase. Refused in production. */
  tokenVerifier?: TokenVerifier;
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

/** Builds the API without listening, so that tests drive it with `app.inject()`. */
export async function buildApp(config: Config, options: BuildAppOptions = {}) {
  const tokenVerifier = tokenVerifierOf(config, options.tokenVerifier);
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
  registerAuth(app, tokenVerifier);

  if (!config.isProduction) {
    await registerDocs(app);
  }
  await app.register(healthRoutes, { prefix: '/v1' });
  await app.register(configRoutes, { prefix: '/v1', minAppVersion: config.minAppVersion });
  await app.register(meRoutes, { prefix: '/v1' });

  return app;
}
