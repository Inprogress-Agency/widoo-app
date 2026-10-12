# Admin image for Cloud Run (apps/admin). Build from the repository root, one image per environment:
#   docker build -f infra/admin.Dockerfile -t widoo-admin \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.staging.example \
#     --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=... \
#     --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com \
#     --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=project .
# Next.js writes these values in the pages at build time, and the server reads them again for the
# Content Security Policy. None is a secret: every NEXT_PUBLIC_ value is sent to the browser.
# The Auth emulator is never set here: staging and production use their own Firebase project.
# Cloud Run runs linux/amd64: add --platform linux/amd64 when building on Apple Silicon.
# Base image pinned by digest, same as infra/api.Dockerfile.

FROM node:22-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9 AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID

# Install the admin and its workspace dependencies, then build the standalone server.
FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @widoo/admin... \
 && pnpm --filter @widoo/admin build

FROM base AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=8080
WORKDIR /app
# The standalone output mirrors the monorepo: the server sits in apps/admin. Static files of the
# build and the public folder are copied next to it. Owned by root, run as node: the process
# cannot rewrite its own code.
COPY --from=build /repo/apps/admin/.next/standalone ./
COPY --from=build /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build /repo/apps/admin/public ./apps/admin/public
USER node
EXPOSE 8080
CMD ["node", "apps/admin/server.js"]
