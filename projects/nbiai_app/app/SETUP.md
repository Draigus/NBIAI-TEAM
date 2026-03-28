# NBIAI App — Setup

## Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Anthropic API key

## Local Development

1. Clone repo and navigate to app directory:
   cd projects/nbiai_app/app

2. Install dependencies:
   npm install
   cd client && npm install && cd ..

3. Create .env from template:
   cp .env.example .env
   # Fill in DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, ANTHROPIC_API_KEY, API_KEY_ENCRYPTION_KEY

4. Run database migrations:
   npm run db:migrate

5. Seed initial data:
   npm run db:seed

6. Start development servers:
   # Terminal 1 — backend:
   npm run dev
   # Terminal 2 — frontend:
   cd client && npm run dev

7. Open http://localhost:5173
   First-time setup: navigate to /setup to create your board account.

## Environment Variables

| Variable | Description |
|---|---|
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET | Random 64-char hex string for access tokens |
| JWT_REFRESH_SECRET | Random 64-char hex string for refresh tokens |
| ANTHROPIC_API_KEY | Your Anthropic API key |
| API_KEY_ENCRYPTION_KEY | 64-char hex string for encrypting stored API keys |
| NBIAI_REPO_PATH | Path to NBIAI_TEAM repo root (default: D:/OneDrive/Claude_code/NBIAI_TEAM) |
| PORT | Server port (default: 3000) |
| FRONTEND_URL | Frontend URL for CORS (default: http://localhost:5173) |

Generate secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

## Production (Railway)

1. Create a Railway project
2. Add a PostgreSQL service
3. Deploy from this directory
4. Set all environment variables in Railway dashboard
5. Run migrations: railway run npm run db:migrate
6. Run seed: railway run npm run db:seed

## Architecture Notes

- Backend: Fastify + PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind + shadcn/ui
- Agent execution: server-side Anthropic API calls via heartbeat scheduler
- Real-time: PostgreSQL LISTEN/NOTIFY + WebSocket
- Auth: JWT (15m) + refresh tokens (30d, rotating)
- Knowledge context: 3-tier markdown files loaded from NBIAI_TEAM repo at runtime
