FROM node:20-alpine AS base
WORKDIR /app

# Backend dependencies (production only)
FROM base AS backend-deps
COPY package*.json ./
RUN npm ci --only=production

# Backend build
FROM base AS backend-build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

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

EXPOSE 3000
CMD ["node", "dist/index.js"]
