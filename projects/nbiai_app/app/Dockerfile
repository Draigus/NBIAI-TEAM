FROM node:20-alpine AS base
WORKDIR /app

# Backend dependencies (production only)
FROM base AS backend-deps
COPY package*.json ./
RUN npm ci --omit=dev

# Backend build
FROM base AS backend-build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# tsc emits only .ts; copy the SQL migration files alongside the
# compiled migrate.js so dist/db/migrate.js finds its sibling
# migrations/ folder at runtime (see src/db/migrate.ts joining
# __dirname with 'migrations').
RUN cp -R src/db/migrations dist/db/migrations

# Frontend build
FROM base AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# Final image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-deps /app/node_modules ./node_modules
COPY --from=backend-build /app/dist ./dist
COPY --from=frontend-build /app/client/dist ./client/dist

# Run migrations before the server starts. `node dist/db/migrate.js`
# applies any pending drizzle migrations (tracked in the
# drizzle.__drizzle_migrations table) and exits; if it fails the
# container restarts before serving traffic.
EXPOSE 3000
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
