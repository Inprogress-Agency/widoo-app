import type { NextConfig } from 'next';
import { parseEnv } from './src/config/env';
import { responseHeaders } from './src/lib/response-headers';

const dev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image of Cloud Run.
  output: 'standalone',
  // The monorepo root, so that the standalone output traces the workspace packages.
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  // Workspace packages shipped as TypeScript sources.
  transpilePackages: ['@widoo/ui', '@widoo/shared', '@widoo/api-client'],
  poweredByHeader: false,
  reactStrictMode: true,
  // apps/admin/AGENTS.md holds the rules of the admin: `next dev` must not append its own block.
  agentRules: false,
  // The environment is read here, when the server or the build asks for the headers, and not
  // when this file loads: `next typegen` (typecheck, CI) needs no environment.
  headers: async () => {
    const env = parseEnv(process.env);
    return [
      {
        source: '/:path*',
        headers: responseHeaders({
          dev,
          apiOrigin: env.NEXT_PUBLIC_API_URL,
          authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          authEmulatorOrigin: env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL,
          hasMap: Boolean(env.NEXT_PUBLIC_MAPBOX_TOKEN),
        }),
      },
    ];
  },
};

export default nextConfig;
