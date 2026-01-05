# Multi-stage build for Next.js PDF AI Assistant
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Note: .env file is copied with 'COPY . .' above
# Next.js will read NEXT_PUBLIC_* variables from .env during build

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create directories
RUN mkdir -p ./credentials ./scripts

# Copy scripts directory for queue worker
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Note: credentials directory is created but left empty
# Credentials are mounted as volume at runtime (see docker-compose.yml)
# This allows the build to succeed in CI where credentials don't exist

# Copy node_modules for queue worker dependencies
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install curl for health checks and dcron for job processing
RUN apk add --no-cache curl dcron

# Create log directory
RUN mkdir -p /var/log && touch /var/log/cron.log

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Create startup script that sets up cron and starts Next.js
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "* * * * * curl -f -H \"Authorization: Bearer $CRON_SECRET\" http://localhost:3000/api/cron/process-jobs >> /var/log/cron.log 2>&1" > /etc/crontabs/root' >> /app/start.sh && \
    echo 'crond' >> /app/start.sh && \
    echo 'echo "Cron service started for job processing (every minute)"' >> /app/start.sh && \
    echo 'exec node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]
