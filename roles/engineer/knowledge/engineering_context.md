# Engineer — Engineering Context

## NBI's Active Products

### Playsage
A gaming industry intelligence SaaS platform. B2B, targeting AA-to-AAA live-service studios. Provides competitive intelligence, sentiment analysis, market forecasting, and AI-driven recommendations across app stores and Steam.

**Core modules:**
1. Market Overview & TAM
2. Competitive Landscape
3. Sentiment Analysis
4. Foresight (forecasting)
5. Market Watch / Release Calendar
6. Alerts
7. The Sage (recommendation engine — the key differentiator)
8. Executive Dashboard & Scenario Planning
9. Finance / IAP Intelligence
10. API & Integrations

### SalarySage
A global gaming salary intelligence tool with a natural language AI query interface. Currently a standalone HTML/React/CSV application. Will eventually become a module within Playsage.

**Components:**
- `SalarySage-Standalone.html` — main app
- `Demo_Salary.csv` — 5MB salary database
- `SalarySage.jsx` — React component
- `SalarySage-Auth.html` — authentication front end

**Important:** The API key for the LLM query interface must never appear in client-side HTML or JavaScript. This was a real security incident. All API calls go through server-side code only.

## Tech Stack

### Playsage Stack
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
| Auth | SHA-256 hashed credentials |
| AI Query | LLM API (server-side only) |

## Next.js App Router — What You Need to Know

**Server vs Client Components:**
- Components are Server Components by default — they run on the server and cannot use browser APIs or React hooks
- Add `"use client"` at the top of a file only when the component needs interactivity, event listeners, useState, useEffect, or browser APIs
- If you are unsure whether to use `"use client"`, ask the Senior Engineer

**Route Handlers:**
- Live in `app/api/[route]/route.ts`
- This is where external API calls must go — any call using a secret key must happen here, not in client-side code
- Never call an LLM API or any external API with a secret key from a Client Component

**Data Fetching:**
- In Server Components, fetch data with async/await directly in the component
- Do not use `useEffect` to fetch data that could be fetched server-side

**Patterns to follow:**
- Find a similar existing feature in the codebase and match its structure
- If nothing similar exists, ask the Senior Engineer before inventing a new pattern

## Supabase — What You Need to Know

- **Do not touch the schema without Senior Engineer involvement.** Schema changes require SQL migrations and RLS policy review
- **RLS (Row Level Security) is always on.** Do not disable it. Do not work around it without Senior Engineer approval
- **Client choice matters:**
  - Server Components / Route Handlers: use the server-side Supabase client
  - Client Components (real-time only): use the browser client
  - When in doubt: ask the Senior Engineer which client to use

## Secrets — The Hard Rules

1. No secret, API key, password, or credential ever goes in client-side code
2. No secret is ever committed to the Git repo
3. Secrets live in `.env.local` for local development (this file is in `.gitignore` and never committed)
4. Deployed secrets are managed in the Vercel dashboard
5. If you find a key or secret in client-side code or committed to the repo: stop immediately and tell the Senior Engineer

## Vercel Deployments

- Every pull request gets a preview deployment automatically — use this to test your work in a real environment before merging
- Production deploys happen when the main branch is updated
- Do not merge to main without Senior Engineer approval of your PR

## shadcn/ui Components

- Components are added to the project via `npx shadcn@latest add [component-name]` — they live in the `components/ui/` folder
- Do not edit the base shadcn files directly
- Use Tailwind classes to style them as per the existing patterns in the codebase
