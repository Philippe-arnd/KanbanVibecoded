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
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/client/dist ./client/dist
COPY server ./server
COPY scripts ./scripts
EXPOSE 3000
CMD ["sh", "-c", "npx drizzle-kit push --config=server/drizzle.config.js --force && node server/db/apply-rls.js && node scripts/seed-user.js && node server/index.js"]
