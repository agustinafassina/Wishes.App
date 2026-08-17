# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Source and build
# Auth0Client is constructed during `next build`; these must exist at build time.
ARG AUTH0_DOMAIN
ARG AUTH0_CLIENT_ID
ARG AUTH0_CLIENT_SECRET
ARG AUTH0_SECRET
ARG AUTH0_AUDIENCE
ARG APP_BASE_URL
ENV AUTH0_DOMAIN=$AUTH0_DOMAIN \
    AUTH0_CLIENT_ID=$AUTH0_CLIENT_ID \
    AUTH0_CLIENT_SECRET=$AUTH0_CLIENT_SECRET \
    AUTH0_SECRET=$AUTH0_SECRET \
    AUTH0_AUDIENCE=$AUTH0_AUDIENCE \
    APP_BASE_URL=$APP_BASE_URL

COPY . .
# Next standalone expects ./public even when empty (folder may be absent from git).
RUN mkdir -p public
RUN npm install
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ARG AUTH0_DOMAIN
ARG AUTH0_CLIENT_ID
ARG AUTH0_CLIENT_SECRET
ARG AUTH0_SECRET
ARG AUTH0_AUDIENCE
ARG APP_BASE_URL
ENV AUTH0_DOMAIN=$AUTH0_DOMAIN \
    AUTH0_CLIENT_ID=$AUTH0_CLIENT_ID \
    AUTH0_CLIENT_SECRET=$AUTH0_CLIENT_SECRET \
    AUTH0_SECRET=$AUTH0_SECRET \
    AUTH0_AUDIENCE=$AUTH0_AUDIENCE \
    APP_BASE_URL=$APP_BASE_URL

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && apk add --no-cache su-exec

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/data/locations/users && chown -R nextjs:nodejs /app/data

COPY docker-entrypoint.sh .
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
