import { AppVersion } from '@widoo/shared';
import { z } from 'zod';

/** Environment variables of the API, validated once at startup. See `.env.example`. */
const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'Expected a postgres:// connection URL'),
  MIN_APP_VERSION: AppVersion.default('0.0.0'),
});

export const Config = Env.transform((env) => ({
  isProduction: env.NODE_ENV === 'production',
  host: env.HOST,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  databaseUrl: env.DATABASE_URL,
  minAppVersion: env.MIN_APP_VERSION,
}));
export type Config = z.output<typeof Config>;

/** Throws on an invalid environment, naming the variables but never echoing their values. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const result = Config.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
