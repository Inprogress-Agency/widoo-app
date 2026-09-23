# API image for Cloud Run. Build from the repository root:
#   docker build -f infra/api.Dockerfile -t widoo-api .
# Cloud Run runs linux/amd64: add --platform linux/amd64 when building on Apple Silicon.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo

# Install the API and its workspace dependencies, bundle it, then keep production dependencies only.
FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @widoo/api... \
 && pnpm --filter @widoo/api build \
 && pnpm --filter @widoo/api deploy --prod --legacy /out

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
WORKDIR /app
# Owned by root, run as node: the process cannot rewrite its own code.
COPY --from=build /out ./
USER node
EXPOSE 8080
CMD ["node", "--enable-source-maps", "dist/server.js"]
