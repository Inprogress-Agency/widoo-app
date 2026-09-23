import { AppVersion } from '@widoo/shared';
import { z } from 'zod';

const Origin = z
  .url({ protocol: /^https?$/ })
  .refine(
    (value) => URL.canParse(value) && new URL(value).origin === value,
    'Expected an origin like https://host:port',
  );

/** IP, CIDR or proxy-addr range name (`loopback`, `linklocal`, `uniquelocal`). */
const Proxy = z.string().regex(/^(loopback|linklocal|uniquelocal|[\da-fA-F.:]+(\/\d{1,3})?)$/);

/** Environment variables of the API, validated once at startup. See `.env.example`. */
const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'Expected a postgres:// connection URL'),
  MIN_APP_VERSION: AppVersion.default('0.0.0'),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .transform((origins) => origins.filter(Boolean))
    .pipe(z.array(Origin)),
  TRUST_PROXY: z
    .string()
    .default('')
    .transform((value) => value.split(',').map((proxy) => proxy.trim()))
    .transform((proxies) => proxies.filter(Boolean))
    .pipe(z.array(Proxy)),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
});

export const Config = Env.transform((env) => ({
  isProduction: env.NODE_ENV === 'production',
  host: env.HOST,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  databaseUrl: env.DATABASE_URL,
  minAppVersion: env.MIN_APP_VERSION,
  corsOrigins: env.CORS_ORIGINS,
  trustedProxies: env.TRUST_PROXY,
  rateLimitMax: env.RATE_LIMIT_MAX,
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
