// Imported by next.config.ts: relative imports only, no `@/` alias.

type HeaderOptions = {
  /** `next dev`: React and the hot reload need eval and a WebSocket. */
  dev: boolean;
  /** Origin of the API. */
  apiOrigin: string;
  /** Host of Firebase Authentication for the project: it serves the Google sign-in window. */
  authDomain: string;
  /** Origin of the local Auth emulator, in development only. */
  authEmulatorOrigin?: string;
};

// Firebase Authentication from the browser: sign-in and token refresh, and the script of the
// Google window.
const firebaseAuthOrigins = [
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
];
const googleSignInScripts = 'https://apis.google.com';

/**
 * Content Security Policy of the admin. The pages are static shells that render their data in the
 * browser, so no nonce can be generated per request: the inline scripts that Next.js writes in
 * the page are allowed with 'unsafe-inline', every other source stays closed. Requests go to the
 * admin itself, to the API and to Firebase Authentication only.
 */
export function contentSecurityPolicy(options: HeaderOptions): string {
  const { dev, apiOrigin, authDomain, authEmulatorOrigin } = options;
  const authOrigins = authEmulatorOrigin ? [authEmulatorOrigin] : firebaseAuthOrigins;
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      googleSignInScripts,
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    // Photos of the routes and places are served from their own address until they move to the
    // storage bucket of Widoo: any https image, nothing else.
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", apiOrigin, ...authOrigins, ...(dev ? ['ws:'] : [])],
    'frame-src': [`https://${authDomain}`, ...(authEmulatorOrigin ? [authEmulatorOrigin] : [])],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`);
  if (!dev) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}

/**
 * Headers of every response of the admin (wiki Admin-Web › Principes): never indexed, never kept
 * by a browser or a proxy, then the same security headers as the site.
 */
export function responseHeaders(options: HeaderOptions): { key: string; value: string }[] {
  return [
    { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    { key: 'Cache-Control', value: 'no-store' },
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(options) },
    // Two years, without `preload` (same call as the site); ignored by browsers over plain http.
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ];
}
