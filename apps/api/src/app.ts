import Fastify, { LogController } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Config } from './config';
import { registerErrorHandling } from './errors';
import { loggerOptions, requestIdOf, type LogStream } from './logger';

export type BuildAppOptions = { logStream?: LogStream };

/** Builds the API without listening, so that tests drive it with `app.inject()`. */
export async function buildApp(config: Config, options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: loggerOptions(config.logLevel, options.logStream),
    genReqId: requestIdOf,
    logController: new LogController({ requestIdLogLabel: 'requestId' }),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandling(app);
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  return app;
}
