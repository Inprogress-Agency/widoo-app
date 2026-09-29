# Site image for Cloud Run (apps/web). Build from the repository root, one image per environment:
#   docker build -f infra/web.Dockerfile -t widoo-web \
#     --build-arg SITE_URL=https://staging.example --build-arg SITE_INDEXABLE=false .
# The pages are rendered at build time with these values; the proxy reads the same values at run
# time. Cloud Run runs linux/amd64: add --platform linux/amd64 when building on Apple Silicon.
# Base image pinned by digest, same as infra/api.Dockerfile.

FROM node:22-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9 AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

ARG SITE_URL
ARG SITE_ALIAS_HOSTS=""
ARG SITE_INDEXABLE=false
ARG APP_STORE_URL=""
ARG PLAY_STORE_URL=""
ENV SITE_URL=$SITE_URL SITE_ALIAS_HOSTS=$SITE_ALIAS_HOSTS SITE_INDEXABLE=$SITE_INDEXABLE \
    APP_STORE_URL=$APP_STORE_URL PLAY_STORE_URL=$PLAY_STORE_URL

# Install the site and its workspace dependencies, then build the standalone server.
FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @widoo/web... \
 && pnpm --filter @widoo/web build

FROM base AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=8080
WORKDIR /app
# The standalone output mirrors the monorepo: the server sits in apps/web. Static files of the
# build are copied next to it. Owned by root, run as node: the process cannot rewrite its own code.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 8080
CMD ["node", "apps/web/server.js"]
