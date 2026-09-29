import { z } from 'zod';

const Origin = z
  .url({ protocol: /^https?$/ })
  .refine(
    (value) => URL.canParse(value) && new URL(value).origin === value,
    'Expected an origin like https://host, without path or trailing slash',
  );

/** A host name, without scheme or path: `www.example.com`. */
const Host = z.string().regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/);

const OptionalUrl = z
  .string()
  .optional()
  .transform((value) => value || undefined)
  .pipe(z.url({ protocol: /^https$/ }).optional());

/**
 * Environment variables of the site, validated once. See `.env.example`. The pages are rendered at
 * build time, so the values of the build are the values of the site: one image per environment.
 */
const Env = z.object({
  /** Canonical origin of the site; never written in the code (#233). */
  SITE_URL: Origin,
  /** Hosts redirected to SITE_URL with a 308: `www` and the former domain. */
  SITE_ALIAS_HOSTS: z
    .string()
    .default('')
    .transform((value) => value.split(',').map((host) => host.trim().toLowerCase()))
    .transform((hosts) => hosts.filter(Boolean))
    .pipe(z.array(Host)),
  /** `true` in production only: staging and previews stay out of search engines. */
  SITE_INDEXABLE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  /** Store pages of the app; absent until the app is published. */
  APP_STORE_URL: OptionalUrl,
  PLAY_STORE_URL: OptionalUrl,
});

export type SiteEnv = z.infer<typeof Env>;

export function parseEnv(source: Record<string, string | undefined>): SiteEnv {
  const result = Env.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid site environment: ${details}`);
  }
  return result.data;
}
