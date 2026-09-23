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
  /**
   * Required by the server (`buildApp`), not by the database scripts. Google Cloud project ID
   * rules: 6 to 30 lowercase letters, digits and hyphens.
   */
  FIREBASE_PROJECT_ID: z
    .string()
    .regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/, 'Expected a Firebase project ID')
    .optional(),
  /** Read by firebase-admin itself, declared here to be refused in production. */
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  /** Sentry project of the API; empty or absent, no error report is sent. */
  SENTRY_DSN: z
    .string()
    .optional()
    .transform((value) => value || undefined)
    .pipe(z.url({ protocol: /^https?$/ }).optional()),
  /** `staging` or `production` on Cloud Run, where NODE_ENV is `production` for both. */
  SENTRY_ENVIRONMENT: z
    .string()
    .regex(/^[a-z][a-z0-9-]{0,63}$/)
    .optional(),
});

/** Guards against local settings that would weaken production: token checks, report transport. */
const ProductionEnv = Env.superRefine((env, context) => {
  if (env.NODE_ENV !== 'production') {
    return;
  }
  if (env.FIREBASE_AUTH_EMULATOR_HOST !== undefined) {
    context.addIssue({
      code: 'custom',
      path: ['FIREBASE_AUTH_EMULATOR_HOST'],
      message: 'Refused in production: the Auth emulator accepts unsigned tokens',
    });
  }
  if (env.FIREBASE_PROJECT_ID?.startsWith('demo-')) {
    context.addIssue({
      code: 'custom',
      path: ['FIREBASE_PROJECT_ID'],
      message: 'Refused in production: demo- projects only exist in the emulator',
    });
  }
  if (env.SENTRY_DSN?.startsWith('http://')) {
    context.addIssue({
      code: 'custom',
      path: ['SENTRY_DSN'],
      message: 'Refused in production: error reports must travel over HTTPS',
    });
  }
});

export const Config = ProductionEnv.transform((env) => ({
  isProduction: env.NODE_ENV === 'production',
  host: env.HOST,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  databaseUrl: env.DATABASE_URL,
  minAppVersion: env.MIN_APP_VERSION,
  corsOrigins: env.CORS_ORIGINS,
  trustedProxies: env.TRUST_PROXY,
  rateLimitMax: env.RATE_LIMIT_MAX,
  firebaseProjectId: env.FIREBASE_PROJECT_ID,
  sentryDsn: env.SENTRY_DSN,
  sentryEnvironment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
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
