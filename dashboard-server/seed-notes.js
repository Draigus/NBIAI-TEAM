require('dotenv').config();
const { Client } = require('pg');
const DB_URL = process.env.DATABASE_URL;

const notes = [
  // ===== COUCH HEROES =====
  {
    client: 'Couch Heroes',
    title: 'London Trip Planning - April 27-May 1',
    meeting_date: '2026-03-30',
    source: 'granola',
    source_id: '3736f6ee-fb4a-459a-a9e6-6c7be0122beb',
    source_url: 'https://notes.granola.ai/d/3736f6ee-fb4a-459a-a9e6-6c7be0122beb',
    content: `Dates: Sun Apr 26 arrival, Fri May 1 departure. One week delay from original plan (visa + David availability).

MEETING STRUCTURE (4 days):
- Days 1-3 (Mon-Wed): Roadmap discussions - Mustafa, Valeria, David, Robin, Glenn. Focus: studio pipeline development, feature roadmapping.
- Day 4 (Thu): Strategy session led by Ari and Vardy. Topics: company strategy, core values, culture. Dinner Thu evening.

VISA STATUS:
- Mustafa: applied, waiting for CH documents
- David: applying Friday with all docs prepared
- Backup: video conference if visas denied

PRE-MEETING PREP:
- Feature documentation (Valeria leading) - Monstrous Excel needs completion by all departments
- Pipeline structures critical for Day 3 - each dept head must bring detailed proposals
- Cross-departmental integration points needed

EXECUTIVE PIPELINE:
- Creative Director split into: (1) Creative gatekeeper, (2) CEO approval gates
- Graham may join for executive pipeline discussions
- COO involvement needed for hiring gates and finance approvals

ACTION ITEMS:
- Valeria: share pipeline materials and Excel feature list
- All dept heads: support Valeria with feature docs
- David/Mustafa: complete visa applications, check expedite
- David: verify US travel auth requirements
- Ari: handle bookings and hotel
- Glenn/Lorenza: backup support for prep`
  },
  {
    client: 'Couch Heroes',
    title: 'HR Meeting - Structure, Reviews, UK Transition',
    meeting_date: '2026-03-19',
    source: 'granola',
    source_id: '78275a44-dcea-4c6c-aa0d-8ef3575f2810',
    source_url: 'https://notes.granola.ai/d/78275a44-dcea-4c6c-aa0d-8ef3575f2810',
    content: `COMPANY STRUCTURE:
- Reducing from 40 categories to 4 clusters: legal, financial, operational, HR
- Decision tree framework in development (Lorenza and Glenn framing)

PERFORMANCE REVIEWS:
- Mustafa: delayed, rolling into performance discussion with Glenn/Ari
- Robin: concerns about interaction style, too personality-focused in interviews
- David: ongoing rolling discussions, focus on being more assertive

UK TRANSITION TIMELINE:
- Tue: close all assessments
- Wed: leadership review and strategic decisions
- Thu: finalise contract termination list
- Fri: begin individual closures
- 2-day buffer for IP security verification

RECRUITMENT:
- Lead Level Designer: 6 candidates, 2 advancing to final round
- Lily (Head of Finance): needs Vardy interview, 1-month notice
- Nelly Hughes (Head of Design): 3 pages of questions pending Glenn. Nelly as Head of Design, Robin transitioning to R&D under her.
- Graham: 120k offer, stock options as future opportunity

SYSTEMS:
- HiBob HR system setup in progress (org charts, policies, salary history)
- Integration with Xero payroll confirmed via API
- 30-day mandatory window for all FTE hires`
  },
  {
    client: 'Couch Heroes',
    title: 'Investor Outreach Strategy',
    meeting_date: '2026-03-11',
    source: 'granola',
    source_id: '014580b3-5c6d-4da6-a8e8-283b739eccc0',
    source_url: 'https://notes.granola.ai/d/014580b3-5c6d-4da6-a8e8-283b739eccc0',
    content: `CH exiting investment partner, wants help with transition. Potential 3k-5k monthly revenue opportunity.

INVESTOR DATABASE PROJECT:
- Core: automated, updating database of game investors
- Replace current 600-person Excel (6 months outdated)
- Data points: name, location, avg round size, lead vs follower, domains
- Technical approach: replicate salary structure methodology (same as PTP research scraping)
- Signal platform has comprehensive investor data

IMPLEMENTATION:
- Tom leads project
- Devin builds (covered under existing arrangement)
- Jeff consultation hourly for technical guidance
- 70% of framework already exists from previous projects
- Cost: 2 cents per 3 queries, scaling question for 12 concurrent users

FUTURE: investor signup funnel, fee structure once traction achieved`
  },

  // ===== SARGE UNIVERSE =====
  {
    client: 'Sarge Universe',
    title: 'Monetization Strategy Overview',
    meeting_date: '2026-03-10',
    source: 'granola',
    source_id: '2003a304-c0eb-4418-9ad1-23707fa1cd1e',
    source_url: 'https://notes.granola.ai/d/2003a304-c0eb-4418-9ad1-23707fa1cd1e',
    content: `Four-tier MTX system:
1. Consumables - speed ups, heals, fast rebuilds
2. Durables - hero skins, tank skins, base cosmetics
3. Seasonal pass - provides currency access, cosmetic units (no gameplay advantage)
4. Tournament system - player prize pools, platform takes revenue cut

Financial plan needed (Tom leading, 80% ownership). Must integrate with monetization strategy as line items. Revenue growth projections over time required.`
  },
  {
    client: 'Sarge Universe',
    title: 'Sarge Universe Game Overview - Pitch Practice',
    meeting_date: '2026-03-10',
    source: 'granola',
    source_id: '4380a160-81ae-41fd-8ca9-e41a16bc9a44',
    source_url: 'https://notes.granola.ai/d/4380a160-81ae-41fd-8ca9-e41a16bc9a44',
    content: `4X strategy game launching on Telegram (explore, expand, exploit, exterminate). Clash of Clans meets Last War with built-in social media platform.

MARKET:
- Telegram: 1B total users, 200M gamers, 120M PvP gamers
- Target: 30M users. Hamster Combat hit 300M in 6 months.
- One-click play eliminates 30% installation churn
- CPI: $0.25 on Telegram vs $10+ on Apple/Android
- No 30% store fees

REVENUE:
- $4 ARPU target (competitors $12-16)
- Conservative: 30M x $4 = $120M annual
- Cosmetic MTX + Battle Pass (no pay-to-win)
- Tournament system with prize pools

DIFFERENTIATION:
- Skill-based combat (not rock-paper-scissors)
- Built-in social ecosystem for UGC
- Player-hosted tournaments with real rewards

FEEDBACK: Start with lead-in, 3-5 key bullets then expand, shorten demo video.`
  },
  {
    client: 'Sarge Universe',
    title: 'Pitch Deck Walkthrough Prep for Steve',
    meeting_date: '2026-03-09',
    source: 'granola',
    source_id: '66668bde-4625-4e00-bc67-bbfc97d6a4b2',
    source_url: 'https://notes.granola.ai/d/66668bde-4625-4e00-bc67-bbfc97d6a4b2',
    content: `Core positioning: "The only 4X strategy game on Telegram" - first-mover advantage.

MESSAGING: Evolved from "Clash of Clans meets TikTok" to "Clash of Clans style gameplay multiplied by social ecosystem". Avoid clone implications.

KEY VALUE PROPS:
- 30% attrition elimination (one-click play)
- Viral acquisition through Telegram social architecture
- 1B+ user base, zero competition

METRICS:
- 1B MAU > 200M gamers > 120M PvP > target 30M (30%)
- Revenue at $4 ARPU: $120M annually
- CPI: $0.04 estimated

DECK IMPROVEMENTS:
- Move market opportunity higher
- Lead with "who we are" > market size > game details
- Add visual funnel: Apple vs Telegram acquisition
- TAM/SAM framework needed
- 3-5 "dopamine moment" visuals

TARGET: $1M raise within 30-60 days. Glenn to connect with Jim for introductions.`
  },

  // ===== GOALS STUDIO =====
  {
    client: 'Goals Studio',
    title: 'Follow-up with Jonas on Pricing',
    meeting_date: '2026-03-11',
    source: 'granola',
    source_id: '0418d967-0486-4146-a477-5240aba77848',
    source_url: 'https://notes.granola.ai/d/0418d967-0486-4146-a477-5240aba77848',
    content: `Brief follow-up. Jonas interested in finalising pricing deal. Meeting to take place in office next week.

ACTION: Schedule follow-up with Jonas, discuss pricing structure and finalise deal terms.`
  },
  {
    client: 'Goals Studio',
    title: 'PlayGoals Beta Results & Launch Plans - Two Work Packages',
    meeting_date: '2026-03-31',
    source: 'manual',
    source_id: '',
    source_url: '',
    content: `Open beta ran throughout March, concluded yesterday. Launch: May 14th. Multi-platform day one: Steam, Epic, PlayStation, Xbox.

BETA RESULTS:
- 50% day-one retention on PlayStation
- Strong across all platforms
- Julius (new live ops specialist) credited with retention success

TWO PROPOSED WORK PACKAGES:

PACKAGE 1: Base Pricing & Regional Strategy
- Base price point determination
- Internal conversion rate optimisation (hard currency to USD)
- Competitive alignment and benchmarking
- Regional pricing strategy and implementation
- Cautionary: "Our Creators" example - advised against regional pricing by Patrick Soderlund, later faced backlash requiring complete pivot
- Sony potentially less flexible than other platforms
- Julius has data in required formats

PACKAGE 2: Live Ops Planning & Team Education
- Framework: engagement, excitement, pulse/tempo, retention
- Dual perspective: monetisation + general engagement
- Template creation for team education (most team never worked live service)
- Mock plan similar to recent work with other studio client
- Key milestones: May 14 launch, June World Cup, August content
- Educational: battle pass concepts, cadence beats, content scheduling, asset warehousing, AB testing

DESIGN CONSTRAINTS:
- Game specifically designed NOT to be season-based
- Seasonal elements need game designer (Frans) input
- New systems typically 3-4 months dev time, launch only 6 weeks away
- Strategy: first 30-60 days focus on bugs/playability, "earn the right" with players, heavier monetisation at 60-day mark
- Unreal Engine supports season triggering without heavy code architecture

NEXT STEPS:
- Glen to structure and document proposal by tomorrow
- Contract setup and pricing to follow
- Julius and Glen to coordinate on data and architecture`
  },

  // ===== LIGHTHOUSE STUDIOS =====
  {
    client: 'Lighthouse Studios',
    title: 'Telemetry, Auth, Build Access & Tencent Revenue Targets',
    meeting_date: '2026-03-19',
    source: 'granola',
    source_id: '1ea95e3e-a4b1-45ab-88f8-b74efa7a984b',
    source_url: 'https://notes.granola.ai/d/1ea95e3e-a4b1-45ab-88f8-b74efa7a984b',
    content: `CLIENT COMMUNICATION:
- Services team (Lewis and Fedge) unresponsive to email
- Switching to Teams DMs for better response rates

AUTH & SECURITY:
- Critical gap: unknown client-server auth structure
- Could be peer-to-peer (major security risk)
- James interested in outlier detection for cheat prevention

TELEMETRY:
- JSON schema validation implemented (CI generates schemas)
- Backend validates incoming telemetry against schemas
- Outstanding: error visibility in Unreal Editor

INFRASTRUCTURE:
- Pete (security lead) more cooperative than expected
- Granted Snowflake admin access
- Separate AWS accounts per environment (better than services team's single account)

BUILD ACCESS:
- No playable build until Alpha milestone
- UXR team resistant to playtesting
- External playtests in 2-3 weeks (vehicle handling focus)

REVENUE TARGETS:
- $1B revenue over 5 years (20% live service = $40M annually)
- $3.3M monthly, $800K weekly targets
- Mar 23: Pre-Alpha Milestone 2 review with Tencent
- Need sensitivity matrix: revenue vs box sales correlation
- Key message: "Give me 20M units, I'll deliver $80M revenue"

UGC:
- Planned but not at launch (90-day post-launch or mid-year)
- Prototype exists but tooling incomplete
- Meeting with Ricardo (platform head) scheduled`
  },

  // ===== NBI OPERATIONS =====
  {
    client: 'NBI Operations',
    title: 'BD Leads - UK Gaming Industry Connections',
    meeting_date: '2026-03-11',
    source: 'granola',
    source_id: 'f5dee235-3462-4447-9ea8-9a874e84c08f',
    source_url: 'https://notes.granola.ai/d/f5dee235-3462-4447-9ea8-9a874e84c08f',
    content: `LEADS:

EVERPLAY (ex-Team 17):
- Intro via Riley and Richard
- Previously considered Glen for CEO role (strong trust)
- Many ex-Jagex people (cultural overlap)
- Warm, relationship-based lead. Good for strategic/advisory work.

EMONA CAPITAL > SPLASH DAMAGE:
- Through Charlie Ruck (exec recruiter, True)
- Charlie connecting to Mike Palan at Emona Capital
- Emona recently acquired Splash Damage (UK studio)
- Angle: help Emona protect and grow their investment
- Newly acquired studios need: post-acquisition integration, scaling, production discipline, leadership hiring

OTHER LEADS:
- Jen McLean (Thu) re Dragon Snacks - may not have budget
- David Stoyler - retired/returned CEO of Dianova, co-founder Wiccaban, met on plane
- Josje > Poki follow-up needed`
  },
];

async function run() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  // Get client ID mapping
  const clients = await db.query('SELECT id, name FROM clients');
  const clientMap = {};
  clients.rows.forEach(r => { clientMap[r.name] = r.id; });

  let inserted = 0;
  for (const note of notes) {
    const clientId = clientMap[note.client];
    if (!clientId) {
      console.log(`WARNING: client "${note.client}" not found, skipping: ${note.title}`);
      continue;
    }
    // Check for duplicate by source_id or title+date
    const existing = await db.query(
      'SELECT id FROM client_notes WHERE client_id = $1 AND title = $2',
      [clientId, note.title]
    );
    if (existing.rows.length > 0) {
      console.log(`SKIP (exists): ${note.title}`);
      continue;
    }
    await db.query(
      `INSERT INTO client_notes (client_id, title, content, source, source_id, source_url, meeting_date, author)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [clientId, note.title, note.content, note.source, note.source_id, note.source_url,
       note.meeting_date ? new Date(note.meeting_date) : null, 'Glen']
    );
    inserted++;
    console.log(`OK: [${note.client}] ${note.title}`);
  }

  // Summary
  const summary = await db.query(`
    SELECT c.name, count(n.id) as note_count
    FROM clients c LEFT JOIN client_notes n ON n.client_id = c.id
    GROUP BY c.name ORDER BY c.name
  `);
  console.log('\nNotes by client:');
  summary.rows.forEach(r => console.log(`  ${r.name}: ${r.note_count}`));
  console.log(`\nInserted ${inserted} notes total`);

  await db.end();
}

run().catch(e => { console.error(e); process.exit(1); });
