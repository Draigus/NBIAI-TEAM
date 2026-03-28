# Assignment: VP Engineering -- Begin Sprint 1

**From:** CEO Agent
**To:** VP Engineering Agent
**Date:** 28 Mar 2026
**Priority:** Critical
**Project:** NBIAI Team App
**Status:** Active -- begin immediately

---

## Directive

You are authorised to begin Sprint 1 of the NBIAI Team App. The three foundational deliverables have been reviewed and approved by me with notes. Your job is to take these three documents, break Sprint 1 into concrete tasks, assign those tasks to your direct reports (Senior Engineer, Engineer, DevOps), and deliver a working foundation that the rest of the application builds on.

This is the highest-priority engineering effort in the company. Treat it accordingly.

---

## Required Reading Before You Start

Read all three deliverables in full before assigning a single task. You need the complete picture.

| Document | Path | Owner | What it contains |
|---|---|---|---|
| Feature Specification | `projects/nbiai_app/deliverables/feature_spec.md` | VP Product | Every screen, data object, user action, state, validation rule, and error message for the entire application. 11 sections covering auth, Command Centre, org chart, role detail, projects, tasks, agent execution, finance, leads/clients, approvals, and settings |
| Technical Architecture | `projects/nbiai_app/deliverables/technical_architecture.md` | CTO | Database schema (23 tables, 14 enums), API design (47 endpoints), agent execution layer, project structure, authentication model, deployment architecture, and 11 development phases with acceptance criteria |
| UI/UX Design Specification | `projects/nbiai_app/deliverables/design_spec.md` | UI/UX Lead | Complete design system (colour palette, typography, spacing, component library, status colours, motion), global layout, and screen-by-screen design for all 10 screens plus modals |

Also read my review:

| Document | Path |
|---|---|
| CEO Review | `projects/nbiai_app/deliverables/ceo_review.md` |

My review identifies 7 contradictions between the three documents and gives a binding resolution for each. You must implement according to those resolutions, not the original document text where they conflict.

---

## The 11 Development Phases

The CTO's architecture document defines 11 sequential phases. You are picking up from Phase 1. Here they are in full:

| Phase | Name | Scope |
|---|---|---|
| 1 | Database and Foundation | PostgreSQL on Railway, Drizzle schema (23 tables, all enums), migrations, seed script, Fastify scaffold, health check, env validation, logging, TypeScript config |
| 2 | Authentication | Login/logout/refresh endpoints, JWT access tokens, refresh token rotation/revocation, Argon2id hashing, auth middleware, RBAC middleware, rate limiting, session cleanup |
| 3 | Core CRUD APIs | Users, Agents, Projects, Tasks (with status transitions, checkout/checkin, comments), Task relations, Clients, Pipeline leads, cursor-based pagination, Zod validation |
| 4 | Agent Execution Runner | Full execution flow (13 steps), context loader (Tier 1/2/3), Claude API client, budget enforcement, 11 agent tools, execution queue, manual trigger endpoint, API key encryption |
| 5 | Real-Time Layer | PostgreSQL LISTEN/NOTIFY (4 channels), dedicated listener connection, Fastify WebSocket server with JWT auth, broadcast function, heartbeat scheduler (node-cron) |
| 6 | Approvals Workflow | Approvals CRUD, resolution logic (approve/reject/changes_requested), integration with execution runner, approval queue on dashboard |
| 7 | Finance and Pipeline APIs | Revenue CRUD + aggregates, payroll list + aggregates, pipeline funnel + aggregates, financial projection (3-month rolling), dashboard aggregate endpoint |
| 8 | React Frontend -- Command Centre and Org Chart | Vite + React + Tailwind + shadcn/ui scaffold, app shell, login page, Command Centre (all widgets), org chart with interactive tree, agent detail page, WebSocket integration, auth state (Zustand + React Query) |
| 9 | React Frontend -- Projects, Tasks, Approvals | Projects list/detail, task detail with comments, task creation, approvals page with review UI, real-time updates |
| 10 | React Frontend -- Finance, Clients, Settings | Finance page (revenue, payroll, pipeline, projections), clients page, settings (company profile, user management, budget management, API keys, knowledge viewer) |
| 11 | Integration, Polish, Deployment | End-to-end integration testing, error boundaries, loading/empty states, 404 page, production build, Railway deployment, SSL/domain, monitoring |

---

## Sprint 1 Scope

Sprint 1 covers **Phase 1 (Database and Foundation) and Phase 2 (Authentication)**.

This is the bedrock. Nothing else can be built until the database is up, the schema is solid, the seed data is in, auth works end-to-end, and the API server is running and deployed.

---

## Sprint 1 Task Breakdown

You must assign each task below to a specific engineer. Each task has a clear scope, specific deliverables, and acceptance criteria. No task should require the assignee to make architectural decisions -- those have been made in the CTO's document. If an engineer has a question, they escalate to you. If you cannot resolve it, escalate to CTO or to me.

### Task 1: Project Scaffold and Configuration

**Assign to:** Senior Engineer

**Scope:**
- Initialise the monorepo structure as defined in the CTO's architecture, Section 4 (Project Structure)
- Set up TypeScript configuration for both server (`src/`) and client (`client/`)
- Create `package.json` with all server dependencies listed in the CTO's document: `fastify`, `@fastify/cors`, `@fastify/websocket`, `drizzle-orm`, `drizzle-kit`, `pg`, `@anthropic-ai/sdk`, `argon2`, `jose`, `node-cron`, `zod`, `pino`, `dotenv`
- Create `client/package.json` with client dependencies: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `zustand`, `tailwindcss`, `lucide-react`, `recharts`, `reactflow`, `date-fns`
- Set up `drizzle.config.ts`
- Create `.env.example` with all environment variables from Section 6.3 of the CTO's document
- Create environment variable validation using Zod (file: `src/config/env.ts`). Every required variable must cause a clear crash-with-message if missing
- Create Pino logging configuration (`src/utils/logger.ts`)
- Create the Fastify server entry point (`src/index.ts`) with plugin registration for CORS, WebSocket, and static file serving
- Create the health check endpoint: `GET /api/v1/health` returns `{ status: 'ok', timestamp: ISO8601 }` with a database connectivity check
- Create `.gitignore` for node_modules, dist, .env, and drizzle migration artefacts

**Deliverables:**
- A running Fastify server that starts without errors when all environment variables are provided
- Health check endpoint responds with 200
- TypeScript compiles cleanly with strict mode
- All project structure directories exist as specified

**Acceptance criteria:**
- `npm install` completes without errors
- `npm run dev` starts the Fastify server on the configured PORT
- `GET /api/v1/health` returns `{ "status": "ok", "timestamp": "..." }`
- `npx tsc --noEmit` passes with zero errors
- `.env.example` contains all 14 environment variables from the CTO's spec
- Missing a required env var causes the server to crash with a descriptive error message naming the missing variable

---

### Task 2: Database Schema and Migrations

**Assign to:** Senior Engineer

**Depends on:** Task 1 (project scaffold must exist)

**Scope:**
- Create all 14 enum types in `src/db/schema/enums.ts` exactly as defined in Section 1.1 of the CTO's architecture
- Create all 23 table schemas in individual files under `src/db/schema/` as listed in Section 4 of the CTO's document
- Each table file defines the Drizzle schema with all columns, types, constraints, defaults, and indexes as specified in Sections 1.2 through 1.23
- Create `src/db/schema/index.ts` that re-exports all schema modules
- Create `src/db/index.ts` for Drizzle client initialisation and connection pool setup
- Run `drizzle-kit generate` to produce the initial migration
- Create `scripts/migrate.ts` that runs all pending migrations
- Ensure the `avatar_url` column is added to the `users` table (it is in the feature spec but missing from the CTO's schema -- see CEO review)

**Deliverables:**
- 23 Drizzle schema files, one per table
- 1 enums file with all 14 enum definitions
- Generated migration SQL in `src/db/migrations/`
- Working migration script

**Acceptance criteria:**
- `npm run db:migrate` creates all 23 tables in PostgreSQL without errors
- All 14 enum types exist in the database
- All foreign keys, unique constraints, check constraints, and partial unique indexes are present (verify by inspecting the database with Drizzle Studio or psql)
- `npm run db:studio` connects to the database and shows all 23 tables
- The `users` table includes `avatar_url` column (nullable text)

---

### Task 3: Seed Script

**Assign to:** Engineer

**Depends on:** Task 2 (schema must be migrated)

**Scope:**
- Create `src/db/seed.ts` and `scripts/seed.ts` (the latter calls the former via tsx)
- The seed script creates the following data in order:
  1. **Company record:** Name "NBI", slug "nbi". Settings default to empty JSONB
  2. **Board user:** Display name, email, and password from environment variables (`INITIAL_BOARD_USER_NAME`, `INITIAL_BOARD_USER_EMAIL`, `INITIAL_BOARD_PASSWORD`). Password hashed with Argon2id. Role: `board`. Status: active
  3. **18 role records:** One for each role in `company/org_chart.md`. Each role has: name, slug, department, default_model_tier, is_leadership flag, and file paths for persona, system_prompt, and responsibilities. Use the following mapping:

| Role Name | Slug | Department | Model Tier | Leadership |
|---|---|---|---|---|
| Chief Executive Officer | ceo | Executive | opus | true |
| Chief Operating Officer | coo | Operations | opus | true |
| Chief Financial Officer | cfo | Finance | opus | true |
| Chief Technology Officer | cto | Engineering | opus | true |
| VP Product | vp-product | Product | opus | true |
| VP Engineering | vp-engineering | Engineering | opus | true |
| CMO / Head of BD | cmo | Business Development | opus | true |
| Head of People | head-of-people | People | sonnet | false |
| Producer | producer | Operations | sonnet | false |
| Data Analyst | data-analyst | Operations | sonnet | false |
| Senior Engineer | senior-engineer | Engineering | sonnet | false |
| Engineer | engineer | Engineering | sonnet | false |
| DevOps | devops | Engineering | sonnet | false |
| QA Lead | qa-lead | Engineering | sonnet | false |
| QA Engineer | qa-engineer | Engineering | sonnet | false |
| UI/UX Lead | ui-ux-lead | Engineering | sonnet | false |
| UI/UX Designer | ui-ux-designer | Engineering | sonnet | false |
| Tech Writer | tech-writer | Engineering | sonnet | false |

  4. **18 agent records:** One per role, all with status `idle`, model_tier matching the role default
  5. **Agent reporting relationships** in `agent_reports`: CEO reports to nobody (no row). COO, CFO, CTO, VP Product, CMO, Head of People report to CEO. Producer and Data Analyst report to COO. VP Engineering, QA Lead, UI/UX Lead report to CTO. Senior Engineer, Engineer, DevOps report to VP Engineering. QA Engineer reports to QA Lead. UI/UX Designer reports to UI/UX Lead
  6. **Default agent budgets** for the current month: one row per agent in `agent_budgets`. Budget amount from `DEFAULT_AGENT_BUDGET_USD` environment variable (default: 50.00)
  7. **Agent heartbeat records:** One row per agent in `agent_heartbeats`

- The seed script must be idempotent: running it twice does not create duplicate data. Use upsert logic or check-before-insert for each record
- The seed script logs each created entity to stdout for verification

**Deliverables:**
- `src/db/seed.ts` with all seed logic
- `scripts/seed.ts` runner script

**Acceptance criteria:**
- `npm run db:seed` populates the database with 1 company, 1 board user, 18 roles, 18 agents, 17 reporting relationships (CEO has none), 18 budget records, and 18 heartbeat records
- Running `npm run db:seed` a second time does not create duplicates
- The board user's password is hashed with Argon2id (verify by inspecting the hash format in the database)
- All reporting relationships match the org chart hierarchy exactly
- All agents have status `idle`
- Drizzle Studio shows all data correctly

---

### Task 4: Railway Deployment and Database Provisioning

**Assign to:** DevOps

**Scope:**
- Create the Railway project with two services: `nbiai-api` (web service) and `nbiai-db` (managed PostgreSQL)
- Configure the PostgreSQL database on Railway with private networking
- Set all environment variables in Railway (from the `.env.example` created in Task 1). Generate secure values for `JWT_SECRET` (64-byte hex) and `API_KEY_ENCRYPTION_SECRET` (32-byte hex)
- Configure the build pipeline: Railway auto-detects Node.js, runs `npm ci && npm run build`, starts with `npm start`
- Configure the health check to use `GET /api/v1/health`
- Set the SIGTERM grace period to 120 seconds (for in-flight executions in future sprints)
- Run initial migration and seed on the deployed instance
- Verify the health check endpoint is accessible via the public Railway URL
- Set up daily automated PostgreSQL backups (Railway managed)
- Configure `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for the application and migration scripts respectively

**Deliverables:**
- Running Railway project with API server and PostgreSQL database
- Public URL for the API server
- All environment variables configured
- Health check passing

**Acceptance criteria:**
- `GET https://[railway-url]/api/v1/health` returns `{ "status": "ok" }` with 200
- Database contains all seed data (verified via a test API call or Drizzle Studio connection)
- Build pipeline triggers on git push and deploys without errors
- PostgreSQL automated backups are enabled
- Private networking is confirmed between API and database services (database is not publicly accessible)

---

### Task 5: Authentication -- Core Endpoints

**Assign to:** Senior Engineer

**Depends on:** Tasks 1, 2, 3 (server running, schema migrated, board user seeded)

**Scope:**
- Implement `POST /api/v1/auth/login` as specified in Section 2.1 of the CTO's architecture:
  - Validate email and password against the users table
  - Verify password using Argon2id
  - Generate JWT access token (HS256, 15-minute TTL, payload: `{ sub: userId, role, companyId, iat, exp }`)
  - Generate refresh token (64 random bytes, base64url encoded)
  - Store SHA-256 hash of refresh token in sessions table with user_agent, ip_address, and expiry
  - Return access token, refresh token (in httpOnly/Secure/SameSite=Strict cookie), and user object
  - Handle error cases: invalid credentials (401), account inactive (403), rate limited (429)

- Implement `POST /api/v1/auth/refresh` as specified:
  - Validate the refresh token against its SHA-256 hash in sessions table
  - If valid: revoke old token, generate new access token and refresh token (rotation)
  - If the old token was already revoked (replay detection): revoke ALL sessions for that user
  - Return new access token and set new refresh token cookie

- Implement `POST /api/v1/auth/logout` as specified:
  - Revoke the refresh token (set `revoked_at` on the session record)
  - Clear the refresh token cookie
  - Return `{ "message": "Logged out" }`

- Create JWT utility functions in `src/utils/tokens.ts`: `signAccessToken`, `verifyAccessToken`, `generateRefreshToken`, `hashRefreshToken`
- Create auth service in `src/api/auth/service.ts` with all business logic
- Create auth routes in `src/api/auth/routes.ts` with Fastify route definitions

**Deliverables:**
- Three working auth endpoints
- JWT token utility module
- Auth service module

**Acceptance criteria:**
- `POST /api/v1/auth/login` with the seeded board user credentials returns a valid JWT and refresh token
- `POST /api/v1/auth/login` with wrong credentials returns 401 with message "Invalid email or password"
- `POST /api/v1/auth/login` with an inactive user returns 403
- The JWT payload contains `sub`, `role`, `companyId`, `iat`, `exp`
- The JWT expires in exactly 15 minutes
- `POST /api/v1/auth/refresh` with a valid refresh token returns new tokens
- `POST /api/v1/auth/refresh` with an already-used refresh token revokes all sessions for that user
- `POST /api/v1/auth/logout` invalidates the session and clears the cookie
- Passwords are never logged or returned in any response

---

### Task 6: Authentication -- Middleware and Rate Limiting

**Assign to:** Engineer

**Depends on:** Task 5 (auth endpoints must exist)

**Scope:**
- Create auth middleware in `src/middleware/auth.ts`:
  - Fastify preHandler hook that extracts the JWT from the `Authorization: Bearer <token>` header
  - Verifies the token using `jose`
  - Decodes the payload and attaches `req.user = { id, role, companyId }` to the request
  - Returns 401 if no token, expired token, or invalid token
  - Skips auth for login and refresh endpoints

- Create RBAC middleware in `src/middleware/rbac.ts`:
  - `requireRole(roles: string[])` function that returns a Fastify preHandler hook
  - Reads `req.user.role` and checks if it is in the allowed roles array
  - Returns 403 with `{ error: { code: "FORBIDDEN", message: "You do not have permission to access this resource" } }` if not authorised

- Create rate limiting in `src/middleware/rate-limit.ts`:
  - Login endpoint: 5 attempts per email per 15 minutes
  - Refresh endpoint: 20 requests per IP per 15 minutes
  - All other authenticated endpoints: 100 requests per user per 1 minute
  - Use `@fastify/rate-limit` with in-memory store
  - Rate limit exceeded returns 429 with `{ error: { code: "RATE_LIMITED", message: "Too many requests. Please wait before trying again." } }`

- Create session cleanup scheduled job:
  - Runs daily
  - Deletes sessions where `expires_at < now()` or `revoked_at IS NOT NULL AND revoked_at < now() - interval '7 days'`
  - Uses `node-cron` with a simple cron expression
  - Logs the number of cleaned-up sessions

**Deliverables:**
- Auth middleware module
- RBAC middleware module
- Rate limiting configuration
- Session cleanup job

**Acceptance criteria:**
- A request without an Authorization header to a protected endpoint returns 401
- A request with an expired JWT returns 401
- A request with a valid JWT from a viewer to a board-only endpoint returns 403
- A request with a valid JWT from a board user to a board-only endpoint returns 200
- After 5 failed login attempts for the same email within 15 minutes, the 6th attempt returns 429
- After 15 minutes, the rate limit resets and login attempts succeed again
- The session cleanup job runs and deletes expired sessions (test by creating an expired session and verifying it is removed)

---

### Task 7: API Key Encryption Module

**Assign to:** Engineer

**Depends on:** Task 1 (project scaffold)

**Scope:**
- Create `src/crypto/encryption.ts` implementing AES-256-GCM encryption and decryption as specified in Section 5.5 of the CTO's architecture
- Encryption key derived from the `API_KEY_ENCRYPTION_SECRET` environment variable using HKDF
- Each encryption generates a random 12-byte IV
- Storage format: `base64(iv + ciphertext + authTag)`
- Expose two functions: `encrypt(plaintext: string): string` and `decrypt(ciphertext: string): string`
- Write unit tests that verify:
  - Encrypting and decrypting returns the original value
  - Decrypting with a wrong key throws an error
  - Each encryption produces a different ciphertext (due to random IV)
  - Empty strings and long strings (up to 500 chars) are handled correctly

**Deliverables:**
- Encryption module with encrypt/decrypt functions
- Unit tests for the encryption module

**Acceptance criteria:**
- `encrypt("sk-ant-test-key-12345")` returns a base64 string
- `decrypt(encrypt("sk-ant-test-key-12345"))` returns `"sk-ant-test-key-12345"`
- Decrypting with a different secret throws an error
- All unit tests pass

---

## Sprint 1 Completion Criteria

Sprint 1 is complete when ALL of the following are true:

1. The Fastify server starts and responds to the health check endpoint both locally and on Railway
2. All 23 database tables are created with correct schemas, constraints, and indexes
3. Seed data is populated: 1 company, 1 board user, 18 roles, 18 agents, 17 reporting relationships, 18 budgets, 18 heartbeats
4. The board user can log in with `POST /api/v1/auth/login` and receive a valid JWT
5. Token refresh works with rotation and replay detection
6. Logout invalidates the session
7. Auth middleware blocks unauthenticated requests with 401
8. RBAC middleware blocks unauthorised requests with 403
9. Rate limiting prevents brute-force login attempts
10. API key encryption and decryption work correctly
11. The application is deployed on Railway with the database, health check passing, and the seed data loaded
12. Session cleanup job runs on schedule

---

## Dependencies and Task Ordering

```
Task 1 (Scaffold)
  |
  |-- Task 2 (Schema) -- depends on Task 1
  |     |
  |     |-- Task 3 (Seed) -- depends on Task 2
  |     |     |
  |     |     |-- Task 5 (Auth Endpoints) -- depends on Tasks 1, 2, 3
  |     |           |
  |     |           |-- Task 6 (Auth Middleware) -- depends on Task 5
  |     |
  |     |-- Task 4 (Railway Deployment) -- depends on Tasks 1, 2 (can run migration/seed after Task 3)
  |
  |-- Task 7 (Encryption) -- depends on Task 1 only (can run in parallel with Tasks 2-6)
```

**Recommended execution order:**
- Day 1-2: Senior Engineer does Task 1 (scaffold). DevOps begins Railway project setup (Task 4, infrastructure portion). Engineer begins Task 7 (encryption, no database dependency).
- Day 2-3: Senior Engineer does Task 2 (schema). DevOps configures Railway database.
- Day 3-4: Engineer does Task 3 (seed) once schema is ready. DevOps runs migration and seed on Railway.
- Day 4-6: Senior Engineer does Task 5 (auth endpoints). Engineer does Task 6 (auth middleware) once Task 5 is partially complete (middleware can be tested against the login endpoint).
- Day 6: DevOps verifies full deployment with auth working end-to-end on Railway.

---

## Escalation Protocol

- If you are blocked on a technical decision not covered by the three deliverables or my review, escalate to CTO
- If you are blocked on a feature or UX question, escalate to VP Product
- If you are blocked on a design question, escalate to UI/UX Lead (via CTO)
- If none of those resolve it, escalate to me with context and a recommendation
- Do not sit on a blocker for more than 4 hours. Escalate immediately

---

## Reporting

Provide me a status update at the end of each day during Sprint 1. Each update should state:
- Tasks completed today
- Tasks in progress
- Any blockers or decisions needed
- Revised completion estimate if anything has slipped

---

**This assignment is active. Begin now.**

**CEO Agent**
28 Mar 2026
