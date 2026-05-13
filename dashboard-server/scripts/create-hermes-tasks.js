require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const NBI_CLIENT = '22eb76a7-4842-4c1d-8e2e-dd9ea01b3e0a';
const GLEN = ['Glen Pryer'];

(async () => {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    // 1. Find or create AI Infrastructure project
    let projectId;
    const existingProj = await dbClient.query(
      "SELECT id FROM tasks WHERE client_id = $1 AND item_type = 'project' AND title = 'AI Infrastructure'",
      [NBI_CLIENT]
    );
    if (existingProj.rows.length > 0) {
      projectId = existingProj.rows[0].id;
      console.log('Using existing AI Infrastructure project:', projectId);
    } else {
      const proj = await dbClient.query(
        `INSERT INTO tasks (title, client_id, item_type, status, priority, description, assignees, start_date, end_date, position)
         VALUES ($1, $2, 'project', 'In progress', 'high', $3, $4, '2026-05-10', '2026-05-16', 0) RETURNING id`,
        ['AI Infrastructure', NBI_CLIENT,
         'Internal AI tooling, automation, and agent infrastructure for NBI operations.',
         GLEN]
      );
      projectId = proj.rows[0].id;
      console.log('Created AI Infrastructure project:', projectId);
    }

    // 2. Create feature
    const feat = await dbClient.query(
      `INSERT INTO tasks (title, parent_id, client_id, item_type, status, priority, description, assignees, start_date, end_date, position)
       VALUES ($1, $2, $3, 'feature', 'In progress', 'high', $4, $5, '2026-05-10', '2026-05-16', 0) RETURNING id`,
      ['Hermes Agent Deployment', projectId, NBI_CLIENT,
       'Deploy Hermes Agent on second PC (WSL2) as always-on autonomous agent layer alongside Claude Code. Zero cost: Hermes handles scheduling/memory/routing, Claude Code CLI handles thinking via Max subscription, Discord for chat and alerts.',
       GLEN]
    );
    const featureId = feat.rows[0].id;
    console.log('Created feature:', featureId);

    // 3. Create story
    const storyDesc = `Full deployment of Hermes Agent as NBI's persistent autonomous agent infrastructure.

ARCHITECTURE:
- Hermes Agent (WSL2, always-on) = scheduler + persistent memory + delivery routing
- Claude Code CLI (claude -p) = the brain for all reasoning (covered by Max subscription)
- Discord = chat interface + alert channels (#bd-alerts, #intel, #ops-briefing, #comms-digest)

VALUE:
- BD pipeline monitoring (leads going cold = lost revenue)
- Persistent memory across sessions (eliminates context resets)
- Benchmark data freshness verification (competitive pricing, AERM)
- Proactive intelligence delivery (Monday briefings, industry scans)
- Multi-channel comms monitoring (Slack, Teams, Email)
- Overnight workflow orchestration (chains Claude Code sessions)
- Discord chat interface to Claude-quality AI

COST: GBP 0/month. MIT licensed, Glen's hardware, existing Max subscription.

REFERENCE FILES:
- Implementation plan: hermes_implementation_plan.md (repo root)
- Value proposal: hermes_value_proposal.html (repo root)

PHASES:
1. Foundation: WSL2 + Hermes + Discord bot + Claude CLI + first cron job
2. Intelligence Agent: Competitive pricing, industry scans, AERM verification, tech monitoring
3. BD + Ops Agent: Pipeline staleness alerts, Monday briefing, NSI monitoring, action tracking
4. Comms + Orchestration: Multi-channel monitoring, overnight workflows, persistent context`;

    const story = await dbClient.query(
      `INSERT INTO tasks (title, parent_id, client_id, item_type, status, priority, description, assignees, start_date, end_date, position)
       VALUES ($1, $2, $3, 'story', 'Not started', 'high', $4, $5, '2026-05-10', '2026-05-16', 0) RETURNING id`,
      ['Deploy Hermes Agent on Second PC', featureId, NBI_CLIENT, storyDesc, GLEN]
    );
    const storyId = story.rows[0].id;
    console.log('Created story:', storyId);

    // 4. Create tasks
    const tasks = [
      {
        title: 'P1: Install and configure WSL2 on second PC',
        description: `HANDS-ON (Glen at second machine).

1. Admin PowerShell: wsl --install (reboot after)
2. Verify version 2: wsl --list --verbose
3. Enable systemd: edit /etc/wsl.conf with [boot] systemd=true
4. Configure networking: create .wslconfig with networkingMode=mirrored
5. Restart WSL: wsl --shutdown

Verification: ps -p 1 -o comm= outputs 'systemd'`,
        priority: 'high'
      },
      {
        title: 'P1: Create Task Scheduler entry to keep WSL alive after reboot',
        description: `HANDS-ON (Glen at second machine).

Task Scheduler > Create Task:
- General: Name 'Keep WSL Running', run whether logged on or not
- Triggers: At log on (your user)
- Actions: Program C:\\Windows\\System32\\wsl.exe, Args: -d Ubuntu --exec /bin/sh -c "sleep infinity"
- Conditions: Uncheck 'Start only if on AC power'

Verification: After reboot, WSL stays running without an open terminal window.`,
        priority: 'high'
      },
      {
        title: 'P1: Install Hermes Agent in WSL2',
        description: `HANDS-ON (Glen at second machine).

In WSL terminal:
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
source ~/.bashrc

Run setup wizard:
hermes setup
- Provider: Anthropic (should detect Claude Code OAuth creds)
- Model: claude-sonnet-4-6 for orchestration
- Platform: Discord

Verification: hermes --version and hermes doctor both pass.`,
        priority: 'high'
      },
      {
        title: 'P1: Install and authenticate Claude Code CLI in WSL2',
        description: `HANDS-ON (Glen at second machine).

npm install -g @anthropic-ai/claude-code
claude login
(Opens Windows browser for OAuth - paste code back into terminal)

Verification: claude -p "Say hello" --max-turns 1 returns a response.`,
        priority: 'high'
      },
      {
        title: 'P1: Create Discord server and bot application',
        description: `HANDS-ON (Glen in browser).

1. Create Discord server 'NBI Ops' with channels: #general, #bd-alerts, #intel, #ops-briefing, #comms-digest
2. Discord Developer Portal > New Application > 'Hermes Agent'
3. Bot section: Enable Server Members Intent + Message Content Intent (CRITICAL)
4. Reset Token > copy immediately (shown once only)
5. Enable Developer Mode > right-click username > Copy User ID
6. Installation: scopes bot + applications.commands
7. Permissions: View/Send/Embed/Attach/ReadHistory/Threads/Reactions
8. Invite bot to NBI Ops server
9. Right-click each channel > Copy Channel ID (need all 5)

PROVIDE TO CLAUDE: Bot token, User ID, all 5 channel IDs.`,
        priority: 'high'
      },
      {
        title: 'P1: Prepare Hermes config files (SOUL.md, MEMORY.md, USER.md, env, config.yaml)',
        description: `CLAUDE PREPARES (before Glen's machine is ready).

Write all seed files into d:\\OneDrive\\Claude_code\\NBIAI_TEAM\\hermes_config\\:
- SOUL.md: NBI agent personality (British English, direct, gaming domain)
- MEMORY.md: Seeded with NBI business context, client portfolio, key facts
- USER.md: Glen's preferences, communication style, approval rules
- env_template: .env with placeholder tokens for Discord bot, channel IDs
- config.yaml: Main config (Discord, security hardening, cron settings)

These get cp'd into ~/.hermes/ after install.`,
        priority: 'medium'
      },
      {
        title: 'P1: Copy config files into Hermes and start gateway',
        description: `HANDS-ON (Glen at second machine, after Claude prepares configs).

cp /mnt/d/OneDrive/Claude_code/NBIAI_TEAM/hermes_config/SOUL.md ~/.hermes/SOUL.md
cp /mnt/d/OneDrive/Claude_code/NBIAI_TEAM/hermes_config/MEMORY.md ~/.hermes/memories/MEMORY.md
cp /mnt/d/OneDrive/Claude_code/NBIAI_TEAM/hermes_config/USER.md ~/.hermes/memories/USER.md
nano ~/.hermes/.env  (fill in bot token, user ID, channel IDs from env_template)

sudo loginctl enable-linger $USER
hermes gateway install
hermes gateway start

Verification: Bot appears online in Discord. @Hermes Agent hello gets a response.`,
        priority: 'high'
      },
      {
        title: 'P1: Test Claude Code CLI integration via Hermes in Discord',
        description: `HANDS-ON (Glen in Discord).

Send: @Hermes Agent use claude -p to check git status of /mnt/d/OneDrive/Claude_code/NBIAI_TEAM

Verification: Hermes calls claude -p, gets result, sends it back in Discord.`,
        priority: 'high'
      },
      {
        title: 'P1: Create first cron job (Opus 4.7 weekly check)',
        description: `HANDS-ON (Glen in WSL terminal).

hermes cron create "0 9 * * 6" "Search the internet for updates to Claude Opus 4.7. Has Anthropic released a patched model, new weights, or significant update? If nothing changed, respond with [SILENT]. If something material changed, summarise in 3-4 sentences." --name "opus-47-check" --deliver "discord:#intel"

Test: hermes cron run opus-47-check
Verify: Result appears in Discord #intel. [SILENT] suppression works when nothing noteworthy.`,
        priority: 'medium'
      },
      {
        title: 'P2: Write Intelligence Agent skills',
        description: `CLAUDE PREPARES.

Create skill directories in hermes_config/skills/:
- competitive-pricing-monitor/SKILL.md: Check competitor pricing (Steam/PS/Xbox) for benchmark titles
- gaming-industry-scan/SKILL.md: Weekly news (funding, layoffs, launches, M&A, policy changes)
- aerm-benchmark-verify/SKILL.md: Verify AERM benchmarks, flag >15% drift
- tech-ai-monitor/SKILL.md: AI/ML releases, Claude updates, MCP ecosystem

Each skill: self-contained, clear triggers, procedures, verification steps.`,
        priority: 'medium'
      },
      {
        title: 'P2: Deploy Intelligence Agent cron jobs',
        description: `HANDS-ON (Glen in WSL after skills are copied).

cp -r hermes_config/skills/* ~/.hermes/skills/

hermes cron create "0 8 * * 1" "Run competitive pricing check" --skill competitive-pricing-monitor --name "pricing-monitor" --deliver "discord:#intel"
hermes cron create "0 9 * * 6" "Run gaming industry scan" --skill gaming-industry-scan --name "industry-scan" --deliver "discord:#intel"
hermes cron create "0 10 1,15 * *" "Verify AERM benchmarks" --skill aerm-benchmark-verify --name "aerm-verify" --deliver "discord:#intel"
hermes cron create "0 9 * * 3" "Run tech/AI monitoring" --skill tech-ai-monitor --name "tech-monitor" --deliver "discord:#intel"

Test each: hermes cron run <name>. Verify [SILENT] suppression.`,
        priority: 'medium'
      },
      {
        title: 'P3: Write BD and Ops Agent skills',
        description: `CLAUDE PREPARES.

Create skill directories:
- bd-pipeline-monitor/SKILL.md: Check BD pipeline staleness, draft follow-ups, alert on cold leads
- monday-briefing/SKILL.md: Aggregate all client status, pipeline, risks, deadlines
- nsi-risk-monitor/SKILL.md: Monitor for NSI wind-down timing signals
- action-item-tracker/SKILL.md: Process meeting notes, track action items, remind on deadlines`,
        priority: 'medium'
      },
      {
        title: 'P3: Deploy BD and Ops Agent cron jobs',
        description: `HANDS-ON (Glen in WSL after skills are copied).

hermes cron create "0 8 * * 1-5" "Check BD pipeline" --skill bd-pipeline-monitor --name "bd-monitor" --deliver "discord:#bd-alerts"
hermes cron create "30 7 * * 1" "Monday briefing" --skill monday-briefing --name "monday-brief" --deliver "discord:#ops-briefing"
hermes cron create "0 10 * * 4" "NSI risk check" --skill nsi-risk-monitor --name "nsi-monitor" --deliver "discord:#ops-briefing"
hermes cron create "0 18 * * 1-5" "Action item review" --skill action-item-tracker --name "action-tracker" --deliver "discord:#ops-briefing"

Test each. Verify delivery to correct Discord channels.`,
        priority: 'medium'
      },
      {
        title: 'P4: Write Comms and Orchestration skills',
        description: `CLAUDE PREPARES.

Create skill directories:
- slack-digest/SKILL.md: Summarise unread Slack threads from Couch Heroes, flag urgents
- overnight-orchestrator/SKILL.md: Chain multi-session Claude Code CLI workflows
- context-ground-truth/SKILL.md: Verify state files against repo, detect staleness

PREREQUISITE: Glen provides Slack app token (Couch Heroes workspace) and other platform creds.`,
        priority: 'low'
      },
      {
        title: 'P4: Connect Slack/Teams/Email and deploy Comms Agent',
        description: `HANDS-ON (Glen provides platform tokens).

Requires:
- Slack Bot Token (Couch Heroes workspace): channels:history, groups:history scopes
- MS Teams: MS Graph API app registration or MS365 MCP integration
- Email: IMAP credentials or MS365 integration

Add tokens to ~/.hermes/.env
Configure cron jobs for comms monitoring and overnight orchestration.
Test multi-channel delivery.`,
        priority: 'low'
      }
    ];

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      await dbClient.query(
        `INSERT INTO tasks (title, parent_id, client_id, item_type, status, priority, description, assignees, start_date, end_date, position)
         VALUES ($1, $2, $3, 'task', 'Not started', $4, $5, $6, '2026-05-10', '2026-05-16', $7)`,
        [t.title, storyId, NBI_CLIENT, t.priority, t.description, GLEN, i]
      );
    }

    await dbClient.query('COMMIT');
    console.log('SUCCESS: Created ' + tasks.length + ' tasks under story ' + storyId);
    console.log('Hierarchy: AI Infrastructure (project) > Hermes Agent Deployment (feature) > Deploy Hermes Agent on Second PC (story) > ' + tasks.length + ' tasks');
  } catch (err) {
    await dbClient.query('ROLLBACK');
    console.error('ERROR:', err.message, err.stack);
  } finally {
    dbClient.release();
    await pool.end();
  }
})();
