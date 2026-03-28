# Senior Engineer — Engineering Context

## NBI's Active Products

### Playsage
The core product. A gaming industry intelligence SaaS platform providing cross-store analytics, competitive intelligence, sentiment analysis, forecasting, and AI-driven recommendations. B2B, targeting AA-to-AAA live-service studios.

**10 modules:**
1. Market Overview & TAM
2. Competitive Landscape
3. Sentiment Analysis (NLP-powered, app store + Steam reviews)
4. Foresight (rolling 90-day forecasting)
5. Market Watch / Release Calendar
6. Alerts (configurable KPI alerts, delivered in-app + email/Slack)
7. The Sage (rule-plus-model recommendation engine — the main differentiator)
8. Executive Dashboard & Scenario Planning
9. Finance / IAP Intelligence
10. API & Integrations

**The Cascade Engine** is the cross-module integration intelligence layer — when one module detects a signal, Cascade checks related modules and surfaces the connected picture. This is Playsage's architectural moat.

**Current development status:** PRD v1.2 complete (scored 7.1/10, corrections in progress). Demo was prepared for GDC. Active development is in-flight.

### SalarySage
A global gaming salary intelligence tool with an LLM-powered natural language query interface. Currently a standalone HTML/React/CSV application. Will eventually become a module within Playsage (likely a "Talent Intelligence" module or similar).

**Components:**
- `SalarySage-Standalone.html` — main demo app (29KB)
- `Demo_Salary.csv` — 5MB salary database
- `SalarySage.jsx` — React component (24KB)
- `SalarySage-Auth.html` — authentication front end (36KB, built by Devin Rieger)

**Known security issue (resolved/in-progress):** API key was embedded in client-side HTML. Fix: move to server-side proxy. Never inline API keys in client-side code. Use environment variables only.

## Tech Stack

### Playsage Stack (Locked)
| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel |
| Language | TypeScript |

### SalarySage Stack
| Layer | Technology |
|---|---|
| App | Standalone HTML + React (JSX) |
| Data | CSV (5MB — loaded at runtime) |
| Auth | SHA-256 hashed credentials (client-side — known limitation) |
| AI Query | LLM API (key currently managed by Jeff Day — to be moved to server-side) |

## Next.js App Router — Key Conventions

- **Server Components by default.** Only add `"use client"` when the component needs interactivity, browser APIs, or React hooks. Do not sprinkle `"use client"` everywhere
- **Route Handlers** live in `app/api/` and handle server-side API logic. This is where LLM API calls and external data fetches must go — never call external APIs with secret keys from the client
- **Data fetching** in Server Components uses async/await directly. No useEffect for server-rendered data
- **Layouts** are shared UI that persist across navigation — use them for nav, sidebar, and auth wrappers
- **Loading and error boundaries** (`loading.tsx`, `error.tsx`) should be present for all data-heavy routes

## Supabase — Key Patterns

- **Row Level Security (RLS) is mandatory.** Every table that holds user data must have RLS enabled and policies defined. Never disable RLS to make queries easier
- **Migrations** are written as SQL files. All schema changes go through migrations — do not modify tables via the Supabase dashboard in production
- **Supabase client:** use the server-side client (`createServerComponentClient` / `createRouteHandlerClient`) in Server Components and Route Handlers. Use the browser client only in Client Components for real-time subscriptions
- **Environment variables:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe for the browser (Supabase anon key is designed to be public, protected by RLS). `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never appear in client-side code

## Secrets Management — Non-Negotiable Rules

1. No API key, secret, password, or credential ever appears in client-side JavaScript or HTML
2. All secrets live in environment variables
3. In Vercel: secrets are set via the Vercel dashboard or CLI — never committed to the repo
4. The `.env.local` file is never committed to Git (it must be in `.gitignore`)
5. External API calls (LLM APIs, data provider APIs) are made from Route Handlers or server-side functions only
6. If a secret has been committed to a public or shared repo, treat it as compromised immediately — revoke and rotate, then fix the code

**Context on SalarySage incident:** The LLM API key (on Jeff Day's personal credit card) was embedded in the SalarySage HTML file, visible to anyone who viewed source. This is the specific pattern to never repeat. The fix is a server-side proxy — Route Handler in Next.js, or a separate serverless function — that holds the key and proxies the request.

## Vercel — Deployment Patterns

- **Preview deployments** are created automatically for every pull request. Use these for testing before merging to main
- **Production deployments** are triggered by merges to the main branch
- **Environment variables** are scoped per environment (Development, Preview, Production) in the Vercel dashboard
- **Edge vs Node.js runtime:** default to Node.js runtime for Route Handlers unless there is a specific reason for Edge

## shadcn/ui — Component Usage

- Components are added via `npx shadcn@latest add [component]` and copied into the project — they are not imported from a package
- Do not modify the base shadcn component files directly; wrap or extend them instead
- Tailwind classes on shadcn components should follow the existing pattern in the codebase for consistency

## Current Development Context

- Glen uses Claude Code as the primary development environment
- The NBIAI_TEAM project structure (this repo) defines AI agent roles; the actual Playsage and SalarySage code lives in separate project directories
- GDC 2026 demo has been prepared — the current codebase should be treated as active, not experimental
- SalarySage is production-candidate quality for internal/client demos; the API key issue must be fully resolved before any external distribution
