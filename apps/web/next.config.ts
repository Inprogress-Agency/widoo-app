import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image of Cloud Run.
  output: 'standalone',
  // The monorepo root, so that the standalone output traces the workspace packages.
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  poweredByHeader: false,
  reactStrictMode: true,
  // apps/web/AGENTS.md holds the rules of the site: `next dev` must not append its own block.
  agentRules: false,
  images: { formats: ['image/avif', 'image/webp'] },
};

export default nextConfig;
