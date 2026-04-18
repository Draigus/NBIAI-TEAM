# NBIAI App — Setup

## Prerequisites
- Node.js 20+
- PostgreSQL 15+

No Anthropic API key is required. Agent execution runs through Claude
Desktop sessions on Glen's Max plan; the app makes zero Anthropic API
calls. See `company/knowledge/strategic_decisions.md`.

## Local Development

1. Clone repo and navigate to app directory:
   ```
   cd projects/nbiai_app/app
   ```

2. Install dependencies:
   ```
   npm install
   cd client && npm install && cd ..
   ```

3. Create `.env` from template:
   ```
   cp .env.example .env
   # Fill in DATABASE_URL, JWT_SECRET, BOARD_USER_PASSWORD, and
   # optionally GBP_USD_RATE and NBIAI_REPO_PATH.
   ```

4. Run database migrations:
   ```
   npm run db:migrate
   ```

5. Seed initial data:
   ```
   npm run db:seed
   ```

6. Start development servers:
   ```
   # Terminal 1 — backend:
   npm run dev
   # Terminal 2 — frontend:
   cd client && npm run dev
   ```

7. Open http://localhost:5173
   First-time setup: navigate to `/setup` to create your board account.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string. |
| `JWT_SECRET` | yes | Random 64-char hex string. Signs access tokens. |
| `BOARD_USER_PASSWORD` | yes (for seed) | Initial password for the seeded Glen board user. The seed script refuses to run with a default placeholder. |
| `GBP_USD_RATE` | no (default 0.79) | GBP per 1 USD. Used by the finance routes to convert agent cost logs. Update when the rate drifts. |
| `NBIAI_REPO_PATH` | no (default `D:/OneDrive/Claude_code/NBIAI_TEAM`) | Absolute path to the NBIAI_TEAM repo root; used by the context loader to assemble prompts. |
| `APP_BASE_URL` | no (default `http://localhost:3001`) | Base URL referenced inside queued JSON task files as the results-posting endpoint. |
| `PORT` | no (default 3000) | Server port. |
| `FRONTEND_URL` | no (default `http://localhost:5173`) | Allowed CORS origin for the React client. |

Client-side build-time env (set in `client/.env` before `npm run build`):

| Variable | Required | Description |
|---|---|---|
| `VITE_GBP_USD_RATE` | no (default 0.79) | Mirror of server `GBP_USD_RATE` consumed by the Finance page to convert cost log USD amounts to GBP. Keep in sync with the server value. |

Generate secrets:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Production (Railway)

1. Create a Railway project.
2. Add a PostgreSQL service.
3. Deploy from this directory.
4. Set all required environment variables in the Railway dashboard.
5. Migrations run automatically on boot (see `railway.toml` —
   `node dist/db/migrate.js && node dist/index.js`).
6. One-time: run the seed against the Railway Postgres once:
   ```
   railway run npm run db:seed
   ```

## Architecture Notes

- Backend: Fastify + PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind + shadcn/ui
- Agent execution: Claude Desktop sessions on Glen's Max plan. The app
  assembles prompts into JSON files under `queue/inbox/`; results are
  posted back via `POST /api/v1/queue/results`.
- Real-time: PostgreSQL LISTEN/NOTIFY + WebSocket at `/ws`.
- Auth: JWT access token (15m) held in memory client-side + random 64-byte
  refresh token (30d, rotating on each use, SHA-256 hashed in the DB).
- Knowledge context: three-tier markdown files loaded from the NBIAI_TEAM
  repo at prompt-assembly time (`src/execution/context-loader.ts`).
