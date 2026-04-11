# NBIAI App -- Local Setup Guide

**App:** NBIAI Team App (Fastify + PostgreSQL + React)
**Deployment:** Runs locally on Glen's machine. Accessible remotely via Tailscale.
**Last updated:** 2026-03-28

---

## Prerequisites

Before setting up the app, verify these are installed on the machine:

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20 LTS or later | Check: `node --version` |
| npm | 10+ | Comes with Node.js |
| PostgreSQL | 15 or later | Check: `psql --version` |
| PM2 | Latest | Install globally: `npm install -g pm2` |
| Git | Any | For version control |

---

## Step 1: Clone / Navigate to the Repo

The NBIAI Team repository should already be at:
```
D:\OneDrive\Claude_code\NBIAI_TEAM\
```

The app source is at:
```
D:\OneDrive\Claude_code\NBIAI_TEAM\projects\nbiai_app\app\
```

All commands below run from `projects/nbiai_app/app/`.

---

## Step 2: Install Dependencies

```bash
cd D:\OneDrive\Claude_code\NBIAI_TEAM\projects\nbiai_app\app
npm install
```

This installs Fastify, Drizzle ORM, pg, bcryptjs, pino, PM2, zod, and all other dependencies listed in `package.json`.

---

## Step 3: Configure PostgreSQL

### 3a. Verify PostgreSQL is running

```bash
psql --version
# Expected: psql (PostgreSQL) 15.x or later
```

If PostgreSQL is not installed, download from: https://www.postgresql.org/download/windows/

### 3b. Create the database and user

Open a PostgreSQL prompt (run as postgres superuser):

```bash
psql -U postgres
```

Then run:

```sql
-- Create the database
CREATE DATABASE nbiai;

-- Create a dedicated user
CREATE USER nbiai WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE nbiai TO nbiai;

-- Connect to the database and grant schema privileges
\c nbiai
GRANT ALL ON SCHEMA public TO nbiai;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nbiai;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nbiai;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nbiai;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nbiai;

\q
```

---

## Step 4: Create the Environment File

Copy the example and fill in real values:

```bash
cp .env.example .env
```

Edit `.env` with the following values:

```env
# Application
NODE_ENV=production
PORT=3001

# Database (local PostgreSQL)
DATABASE_URL=postgresql://nbiai:your_secure_password_here@localhost:5432/nbiai

# JWT secrets -- generate fresh values, never share
# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64-byte hex string>
JWT_REFRESH_SECRET=<64-byte hex string>

# Board user password (Glen's login password for the app)
BOARD_USER_PASSWORD=<strong password, min 12 chars>

# Path to the NBIAI_TEAM repo (used by context loader for knowledge files)
NBIAI_REPO_PATH=D:/OneDrive/Claude_code/NBIAI_TEAM
```

### Generating JWT secrets

Run this command twice (once for each secret):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output into your `.env` file.

**IMPORTANT:** The `.env` file contains secrets. It is gitignored and must never be committed to the repository.

---

## Step 5: Run Database Migrations

```bash
npm run db:migrate
```

This creates all 21 database tables. Expected output ends with:
```
[migrate] Migrations complete.
```

If you see errors, check that:
- PostgreSQL is running
- The DATABASE_URL in `.env` is correct
- The `nbiai` user has the correct privileges (Step 3)

---

## Step 6: Seed the Database

```bash
npm run db:seed
```

This populates:
- 1 company record (NBI Analytics Ltd)
- 1 board user (Glen Pryer, glen@nbi.gg)
- 18 role records
- 18 agent records (all idle)
- 17 reporting relationships
- 5 Tier 1 knowledge files
- Initial revenue items

If you see `[seed]   ... already exists -- skipping` for all rows, the seed has already been run. That is fine.

**After seeding:** Log in to the app using glen@nbi.gg and the password set in BOARD_USER_PASSWORD.

---

## Step 7: Build the Application

```bash
npm run build
```

This compiles TypeScript to `dist/`. The `dist/` directory is gitignored.

---

## Step 8: Start with PM2

```bash
npm run pm2:start
```

This starts the Fastify server in the background as a PM2 managed process.

Verify it is running:

```bash
pm2 status
# Should show: nbiai-api | online
```

Check logs:

```bash
npm run pm2:logs
# Or: pm2 logs nbiai-api
```

Verify the health check:

```bash
curl http://localhost:3001/api/v1/health
# Expected: {"status":"ok","timestamp":"..."}
```

---

## Step 9: Configure PM2 to Start on Boot (Windows)

To ensure the app restarts automatically after a machine reboot:

```bash
# Save the current PM2 process list
pm2 save

# Generate a startup script (for Windows, use pm2-windows-startup or Task Scheduler)
npm install -g pm2-windows-startup
pm2-startup install
```

Alternatively, create a Windows Task Scheduler entry that runs `pm2 resurrect` on startup.

---

## Step 10: Remote Access via Tailscale

Tailscale should already be installed and configured on Glen's machine.

To access the app from your phone or other devices:
1. Open the Tailscale admin panel and find your machine's Tailscale IP address
2. Access the app at: `http://<tailscale-ip>:3001`

The app is not exposed to the public internet -- only accessible via the Tailscale private network.

---

## Useful PM2 Commands

```bash
pm2 status              # Show all running processes
pm2 logs nbiai-api      # Tail logs in real time
pm2 logs nbiai-api --lines 100  # Show last 100 log lines
pm2 restart nbiai-api   # Restart after code changes
pm2 stop nbiai-api      # Stop the process
pm2 delete nbiai-api    # Remove from PM2 (run pm2 save after)
pm2 monit               # Real-time process monitor (CPU, memory, logs)
```

---

## Troubleshooting

### Server fails to start
- Check: `pm2 logs nbiai-api` for error messages
- Check: `.env` file exists and has correct DATABASE_URL
- Check: PostgreSQL is running (`pg_ctl status` or check Services)

### Database connection error
- Verify PostgreSQL is listening: `netstat -an | findstr 5432`
- Verify credentials: `psql -U nbiai -d nbiai -h localhost`
- Check DATABASE_URL format: `postgresql://user:password@localhost:5432/dbname`

### Migration fails
- If "already exists" errors appear, the database may have partial migrations. Run:
  ```bash
  psql -U nbiai -d nbiai -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  npm run db:migrate
  npm run db:seed
  ```

### Port 3001 already in use
- Find what is using it: `netstat -ano | findstr 3001`
- Kill the process or change PORT in `.env`

---

## Queue Folder Structure

The task queue lives at the repository root:

```
D:\OneDrive\Claude_code\NBIAI_TEAM\queue\
  inbox/      ← App writes new task files here
  active/     ← Claude Desktop claims tasks here
  review/     ← Tasks pending Glen's review
  done/       ← Completed tasks archive
  failed/     ← Failed sessions
  scripts/    ← Task Scheduler trigger scripts (Sprint 6)
  schedules/  ← Task Scheduler XML configs (Sprint 6)
```

See `projects/nbiai_app/docs/queue_schema.md` for the task file format.

---

## Windows Task Scheduler (Sprint 6)

Automated session triggering via Windows Task Scheduler will be configured in Sprint 6. The `queue/scripts/README.md` file documents the planned approach.

---

*Document owner: VP Engineering / DevOps. Update after any infrastructure change.*
