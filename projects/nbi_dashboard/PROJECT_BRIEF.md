# NBI Project Dashboard -- Project Brief

## What It Is

A bespoke work management platform replacing Microsoft Teams/Planner as the central operating system for NBI Gaming/NBI Analytics Ltd. Tracks all client engagements, tasks, hours, costs, client intelligence (profiles, contacts, meeting notes), BD pipeline, and generates reports for a distributed team of 5-6 people.

## Users

- Glen Pryer (MD, admin)
- Magnus Pryer (Producer)
- Tom Rieger (HC Partner, US-based)
- Devin Rieger (Data Analyst)
- Jeff Day (Data Scientist)
- Amir Didar (Senior Analyst)

## Tech Stack

- Frontend: Single-file HTML/CSS/JS (`nbi_project_dashboard.html`)
- Backend: Express.js on port 8888
- Database: PostgreSQL (`nbi_dashboard`) on localhost:5432
- Remote access: Cloudflare Tunnel
- Auth: bcrypt passwords + server-side sessions

## Master Plan

See `C:\Users\gpbea\.claude\plans\spicy-jumping-crayon.md` for the full phased roadmap.

## Source Files

| File | Role |
|------|------|
| `nbi_project_dashboard.html` | Frontend (single file, canonical) |
| `dashboard-server/server.js` | API server |
| `dashboard-server/init-db.js` | Database schema + seeds |
| `dashboard-server/seed-notes.js` | Granola meeting note seeds |
| `dashboard-server/package.json` | Dependencies |

## BD Pipeline Source

`D:\OneDrive\NBI\clean client list.xlsx` (Sheet: "Sheet1 (2)") -- 41 leads
