import { z } from 'zod';

const Origin = z
  .url({ protocol: /^https?$/ })
  .refine(
    (value) => URL.canParse(value) && new URL(value).origin === value,
    'Expected an origin like https://host, without path or trailing slash',
  );

/** A host name, without scheme or path: `project.firebaseapp.com`. */
const Host = z.string().regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/);

const OptionalHttpsUrl = z
  .string()
  .optional()
  .transform((value) => value || undefined)
  .pipe(z.url({ protocol: /^https$/ }).optional());

/**
 * Environment variables of the admin, validated once. See `.env.example`. Every value is public:
 * Next.js writes the `NEXT_PUBLIC_` variables in the pages at build time.
 */
const Env = z.object({
  /** Origin of the API the admin calls from the browser. */
  NEXT_PUBLIC_API_URL: Origin,
  /**
   * Web configuration of the Firebase project (Firebase console › Project settings): identifiers
   * of the project, not secrets. Staging and production each have their own project.
   */
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: Host,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/),
  /** Exact pages of the Widoo project in PostHog and RevenueCat, linked from A-05. */
  NEXT_PUBLIC_POSTHOG_URL: OptionalHttpsUrl,
  NEXT_PUBLIC_REVENUECAT_URL: OptionalHttpsUrl,
  /** Local Auth emulator; empty on staging and production. */
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: z
    .string()
    .optional()
    .transform((value) => value || undefined)
    .pipe(Origin.optional()),
});

export type AdminEnv = z.infer<typeof Env>;

export function parseEnv(source: Record<string, string | undefined>): AdminEnv {
  const result = Env.safeParse(source);
  if (result.success && result.data.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL) {
    // The emulator accepts unsigned tokens: only with a demo project, which exists nowhere else.
    if (!result.data.NEXT_PUBLIC_FIREBASE_PROJECT_ID.startsWith('demo-')) {
      throw new Error(
        'Invalid admin environment: NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL needs a demo-* project',
      );
    }
  }
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid admin environment: ${details}`);
  }
  return result.data;
}
