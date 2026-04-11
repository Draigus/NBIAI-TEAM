# Glen Pryer -- Granola Meeting Notes Summary

**Generated:** 29 March 2026
**Coverage:** 9--19 March 2026 (8 meetings)
**Source:** Granola AI meeting notes

---

## Meeting Index

| # | Date | Title | Client/Context |
|---|------|-------|----------------|
| 1 | 19 Mar | HR Meeting | Couch Heroes |
| 2 | 19 Mar | New note (Analytics/Telemetry) | Couch Heroes |
| 3 | 11 Mar | Investor outreach strategy | NBI / Couch Heroes |
| 4 | 11 Mar | Follow-up with Jonas on pricing | NBI |
| 5 | 11 Mar | Business development leads tracking | NBI |
| 6 | 10 Mar | Monetization strategy overview | Sarge Universe |
| 7 | 10 Mar | Sarge Universe game overview | Sarge Universe |
| 8 | 9 Mar | Game presentation walkthrough for Steve | Sarge Universe |

---

## 1. HR Meeting (19 March)

**Context:** Couch Heroes HR and operations review with Lorenza.

### Company Structure and Process
- Reducing operational categories from 40 to 4 clusters: legal, financial, operational, HR
- Each cluster gets dedicated personnel and standardised processes
- Decision tree framework in development (Lorenza and Glen framing initial structure)
- FTE vs contractor pathways to be clearly defined

### Performance Reviews
- **Mustafa:** Review delayed due to absence, rolling into performance discussion with Glen/Ari
- **Robin:** Performance concerns -- interview approach too personality-focused, lacks technical depth. David's feedback aligns with previous patterns. London trip planned for transition discussion using vision doc
- **David:** Ongoing rolling discussions in 1:1s, focus on being more assertive

### UK Transition and Assessment
- Four-quadrants assessment underway (product/engineering completed)
- Critical timeline:
  - Tuesday: Close all assessments
  - Wednesday: Leadership review and strategic decisions
  - Thursday: Finalise contract termination list
  - Friday: Begin individual contract closures
- IP gap identification running in parallel (2-day buffer needed)
- Individual terminations preferred over bulk layoffs

### Recruitment and Hiring
- **Lead Level Designer:** 6 candidates to second interview, 4 completed, 2 advancing to final round. Glen and Vardy conducting finals due to Robin's weak evaluation approach
- **Lily (Head of Finance):** Needs Vardy final interview, 1-month notice period
- **Nelly Hughes (Head of Design):** 3 pages of questions pending Glen's response. Proposed structure: Nelly as Head of Design, Robin transitioning to R&D under her
- **Graham:** 120k salary offer, stock options discussed as future performance-based opportunity
- Hiring plan lock-up deadline: next HR meeting for Jack's guidance

### Systems and Admin
- HiBob HR system setup in progress: org charts, time-off policies, salary history, Xero payroll integration via API
- 30-day mandatory window for all FTE hires to complete setup
- Hardware policy review needed -- contractor requests on hold pending policy
- Asset registry creation required

### Action Items
- Glen: Provide Lily's contact for Vardy interview (immediate)
- Glen: Complete Nelly Hughes question responses
- Glen: London trip for Robin transition discussion
- Vardy: Schedule Lily interview
- Lorenza: Edit HR comms to address only bank holidays
- Glen/Lorenza: Contractor policy punch list (deadline: end of next week)
- All leadership: Lock hiring plan by next HR meeting

---

## 2. Analytics/Telemetry Meeting (19 March)

**Context:** Couch Heroes technical deep-dive on analytics infrastructure, security, and Tencent deliverables.

### Authentication and Security
- Critical gap: Unknown client-server auth structure
- Could be peer-to-peer setup (major security risk)
- James interested in outlier detection for cheat prevention
- Need direct confirmation from services team on auth setup
- Services team (Lewis and Fedge) unresponsive to emails -- switching to Teams DMs

### Telemetry
- JSON schema validation system implemented (CI generates schemas, backend validates)
- Outstanding: Error visibility integration in Unreal Editor
- Goal: Self-service validation for client developers

### Infrastructure
- Pete (security lead) granted Snowflake admin access
- Separate AWS accounts per environment (better than services team's single account)
- No playable build available until Alpha milestone

### Tencent Review (23 March)
- Pre-Alpha Milestone 2 review
- Live service presentation critical for continued funding
- Need sensitivity matrix: revenue vs box sales correlation
- Target: $1B revenue over 5 years, $40M annually from live service

### UGC Platform
- Confirmed planned but not at launch (90-day post-launch or mid-year)
- No current roadmap investment allocated
- Meeting with Ricardo (platform head) scheduled for tomorrow

### Timeline Concerns
- Alpha timeline may be unrealistic for analytics implementation
- Telemetry > tables > dashboards -- sequential dependency chain
- 20% buffer recommended for iteration/fixes

---

## 3. Investor Outreach Strategy (11 March)

**Context:** NBI business development -- building investor database tool.

### Key Points
- Couch Heroes exiting investment partner, wants help with transition (3k--5k monthly opportunity)
- Building automated investor database to replace outdated 600-person Excel list
- Data points: investor name, location, round size, lead/follower status, domains
- Tom leads project, Devin builds, Jeff consults hourly
- Reusing framework from salary structure methodology (70% already exists)
- System cost: 2 cents per 3 queries

---

## 4. Follow-up with Jonas on Pricing (11 March)

**Context:** Brief NBI follow-up.

- Schedule meeting with Jonas next week in office
- Discuss pricing structure and finalise deal terms

---

## 5. Business Development Leads Tracking (11 March)

**Context:** NBI pipeline management -- UK gaming industry connections.

### Active Leads
- **Everplay (ex-Team 17):** Intro via Riley and Richard. Previously considered Glen for CEO role. Many ex-Jagex staff
- **Splash Damage (via Emona Capital):** Through Charlie Ruck at True. Emona recently acquired Splash Damage. Opportunity: post-acquisition integration, scaling, org design
- **Dragon Snacks:** Meeting with Jen McLean Thursday -- may not have budget
- **Dianova/Wiccaban:** David Stoyler (retired CEO) wants to connect after plane meeting
- **Poki:** Need to follow up through Josje

### Positioning
- Everplay: Lean on prior CEO consideration and Jagex ties
- Splash Damage: Frame as de-risking and accelerating their acquisition

---

## 6. Monetization Strategy Overview (10 March)

**Context:** Sarge Universe pitch deck preparation.

### MTX System (4 tiers)
1. Consumables: speed-ups, heals, fast rebuilds
2. Durables: hero skins, tank skins, base cosmetics
3. Seasonal pass: currency access, cosmetic units (no gameplay advantage)
4. Tournament system: player prize pools, platform revenue cut

### Financial Integration
- Tom leading financial plan (80% ownership)
- Monetization must translate to line items in financial plan
- Revenue growth projections over time needed

---

## 7. Sarge Universe Game Overview (10 March)

**Context:** Pitch practice for Sarge Universe -- 4X strategy game on Telegram.

### Core Concept
- 4X strategy (explore, expand, exploit, exterminate) on Telegram
- "Clash of Clans meets Last War with built-in social media platform"
- Only 4X strategy game on Telegram -- first-mover advantage

### Market
- Telegram: 1B users, 200M gamers, 120M PvP
- Target: 30M users at $4 ARPU = $120M annual revenue
- CPI: $0.25 on Telegram vs $10+ on app stores
- No 30% store fees

### Differentiation
- Skill-based combat (not rock-paper-scissors)
- Built-in social/UGC ecosystem
- Player-hosted tournaments with real rewards

---

## 8. Game Presentation Walkthrough for Steve (9 March)

**Context:** Sarge Universe pitch deck refinement session.

### Key Decisions
- Position as "the only 4X strategy game on Telegram"
- Messaging: "Clash of Clans style gameplay multiplied by social ecosystem" (avoid clone implications)
- Move market opportunity data higher in deck
- Lead with "who we are" then market size then game details
- Add visual funnel: Apple vs Telegram user acquisition comparison
- Target: $1M raise within 30--60 days

---

## Cross-Meeting Action Items (All Meetings)

### Immediate (This Week)
- [ ] Provide Lily's contact for Vardy interview
- [ ] Complete Nelly Hughes question responses
- [ ] Close four-quadrants assessments (Tuesday)
- [ ] Leadership review and strategic decisions (Wednesday)
- [ ] Finalise contract termination list (Thursday)
- [ ] Begin contract closures (Friday)
- [ ] Follow up with Jonas on pricing (next week in office)

### Short-Term (Next 2 Weeks)
- [ ] London trip for Robin transition discussion
- [ ] Lock hiring plan by next HR meeting
- [ ] Contractor policy punch list (end of next week)
- [ ] Conduct Lead Level Designer final interviews
- [ ] Schedule and complete Lily (Head of Finance) interview
- [ ] Resolve client-server auth architecture question
- [ ] Revenue sensitivity matrix for Tencent review
- [ ] Meet with Ricardo re UGC platform roadmap

### Ongoing
- [ ] HiBob HR system setup and Xero integration
- [ ] Hardware policy review and asset registry
- [ ] IP gap identification and verification
- [ ] Telemetry schema validation -- Unreal Editor integration
- [ ] Investor database build (Tom/Devin/Jeff)
- [ ] Sarge Universe pitch deck refinements
- [ ] BD follow-ups: Everplay, Splash Damage, Dragon Snacks, Poki

---

*Summary generated from 8 Granola meetings, 9--19 March 2026.*
