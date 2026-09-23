import Fastify, { LogController } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Config } from './config';
import { createSql } from './db/client';
import { registerDocs } from './docs';
import { registerErrorHandling } from './errors';
import { loggerOptions, requestIdOf, type LogStream } from './logger';
import { configRoutes } from './routes/config';
import { healthRoutes } from './routes/health';
import { registerSecurity } from './security';

export type BuildAppOptions = { logStream?: LogStream };

/** Builds the API without listening, so that tests drive it with `app.inject()`. */
export async function buildApp(config: Config, options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: loggerOptions(config.logLevel, options.logStream),
    genReqId: requestIdOf,
    logController: new LogController({ requestIdLogLabel: 'requestId' }),
    // X-Forwarded-For is read only when the direct peer is a listed proxy.
    trustProxy: config.trustedProxies.length > 0 ? config.trustedProxies : false,
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
  app.addHook('onClose', async () => {
    await sql.end({ timeout: 5 });
  });

  if (!config.isProduction) {
    await registerDocs(app);
  }
  await app.register(healthRoutes, { prefix: '/v1' });
  await app.register(configRoutes, { prefix: '/v1', minAppVersion: config.minAppVersion });

  return app;
}
