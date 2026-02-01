# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_ENCRYPTION_KEY
ENV VITE_ENCRYPTION_KEY=$VITE_ENCRYPTION_KEY
RUN npm run build

# Production stage
FROM node:22-alpine
WORKDIR /app
# Install wget for healthcheck
RUN apk add --no-cache wget
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
COPY drizzle ./drizzle
COPY drizzle.config.js ./
EXPOSE 3000
CMD ["sh", "-c", "npm run db:push && node server/index.js"]
