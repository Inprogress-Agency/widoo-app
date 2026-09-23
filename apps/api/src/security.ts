import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import type { Config } from './config';

/** Security headers, CORS for the listed web origins, rate limit per client IP. */
export async function registerSecurity(app: FastifyInstance, config: Config): Promise<void> {
  await app.register(helmet);

  // The mobile app sends no Origin header: CORS only concerns browsers (admin), refused by default.
  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    maxAge: 600,
  });

  // Global default, counted per instance (in memory). Stricter per-route limits come with
  // the routes that need them (search, place creation, signals, uploads).
  await app.register(rateLimit, { max: config.rateLimitMax, timeWindow: '1 minute' });
}
