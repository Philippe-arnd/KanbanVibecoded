# Build stage
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_ENCRYPTION_KEY
ENV VITE_ENCRYPTION_KEY=$VITE_ENCRYPTION_KEY
RUN npm run build

# Production stage
FROM node:24-alpine
WORKDIR /app
# Upgrade base packages (fixes CVE-2026-22184, CVE-2026-27171 in zlib) then install wget for healthcheck
RUN apk upgrade --no-cache && apk add --no-cache wget
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY package*.json ./
RUN npm install --omit=dev
# npm/npx are only needed to install deps above, never at runtime (the CMD
# below calls the local drizzle-kit binary directly). Removing them drops the
# base image's bundled npm and its own vulnerable transitive deps (tar,
# undici, ip-address, brace-expansion) from the final image entirely.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY --from=build /app/client/dist ./client/dist
COPY server ./server
COPY scripts ./scripts
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1
CMD ["sh", "-c", "./node_modules/.bin/drizzle-kit push --config=server/drizzle.config.js --force && node server/db/apply-rls.js && node scripts/seed-user.js && node server/index.js"]
