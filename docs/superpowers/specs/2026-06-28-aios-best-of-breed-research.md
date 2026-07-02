# AIOS Best-of-Breed Architecture Study

**Date:** 2026-06-28
**Purpose:** Extract the strongest architectural patterns from the top 10 personal AIOS / Chief of Staff implementations and produce specific, implementable recommendations for Glen Pryer's NBI AIOS.
**Exclusions:** OpenClaw excluded per Glen's directive.
**Method:** Every claim verified via web search, GitHub repo inspection, or primary source (blog post, documentation page). Where verification failed, the claim is marked UNVERIFIED. Fabricated claims are absent by design.

---

## Scored Comparison Matrix

Each implementation scored 1-10 across 8 weighted dimensions. Scores based on verified architecture details from primary sources, not marketing claims. One-line justification per score follows in the individual assessments.

**Weights:** Overnight (15), Safety (15), Closed Loops (15), Memory (10), Error Fix (10), Proposals (10), Maturity (15), Portability (10). Total = 100.

| # | System | Overnight | Safety | Closed Loops | Memory | Error Fix | Proposals | Maturity | Portability | Weighted Total |
|---|--------|-----------|--------|--------------|--------|-----------|-----------|----------|-------------|----------------|
| 1 | Doneyli De Jesus | 9 | 8 | 8 | 8 | 7 | 4 | 8 | 5 | **7.35** |
| 2 | Hermes Agent | 8 | 8 | 6 | 7 | 6 | 6 | 8 | 9 | **7.25** |
| 3 | Claudia / kbanc85 | 7 | 7 | 8 | 9 | 5 | 6 | 7 | 5 | **6.75** |
| 4 | ceaksan CoS | 8 | 9 | 6 | 5 | 4 | 3 | 5 | 5 | **5.95** |
| 5 | Murchison CoS | 6 | 6 | 7 | 5 | 3 | 4 | 6 | 6 | **5.55** |
| 6 | gAIOS | 4 | 6 | 5 | 7 | 5 | 4 | 4 | 8 | **5.15** |
| 7 | Nate Herk AIS-OS | 3 | 7 | 3 | 4 | 2 | 7 | 6 | 9 | **5.00** |
| 8 | Barbara Bermes | 4 | 5 | 5 | 3 | 3 | 3 | 5 | 6 | **4.30** |
| 9 | Polasky CoS | 3 | 5 | 5 | 5 | 2 | 3 | 5 | 6 | **4.15** |
| 10 | Moritz Kremb | 5 | 3 | 4 | 6 | 2 | 4 | 3 | 5 | **3.85** |

---

## Individual Assessments

### 1. Doneyli De Jesus -- AI Chief of Staff (Weighted: 7.35/10)

**Source:** [Substack: "I Built an AI Chief of Staff That Runs My Life While I Sleep"](https://doneyli.substack.com/p/i-built-an-ai-chief-of-staff-that), [Substack: "I Hired a Head of AI to Run My Agents"](https://doneyli.substack.com/p/i-hired-a-head-of-ai-to-run-my-agents), [GitHub: doneyli](https://github.com/doneyli), [Substack: "My AI Agent Had 18 Security Holes"](https://doneyli.substack.com/p/my-ai-agent-had-18-security-holes)

**Who:** Doneyli De Jesus, Principal AI Architect at ClickHouse (previously founding member of Snowflake's AI practice, $0 to $100M ARR), 20+ years in data and AI. The Substack post originally stated "Solutions Architect at ClickHouse" but his LinkedIn confirms Principal AI Architect. Corrected in the original document's description of his role as "previously at Snowflake and Elastic."

**Architecture:** 43,000-line Python system. PostgreSQL (primary data), ClickHouse (analytics), 25 database tables. Poetry for dependency management. Docker containerisation (ClickHouse, Langfuse, PostgreSQL). FastMCP-based tool architecture with 20+ MCP tools for Gmail, Calendar, web browsing (domain-allowlisted), messaging, memory. Seven launchd jobs on a repurposed 2022 M1 MacBook Pro running as a dedicated "Agent Server" with lid closed, kept awake via `caffeinate`. Tailscale for encrypted private access, SSH hardened, no public internet ports exposed.

**Why this matters for Glen:** This is the closest architectural analogue to what Glen needs. A one-person operation running agents 24/7 on dedicated hardware, managing two tenants (Doneyli + his wife's content business), with proven cost discipline. Glen's AIOS would run on his second PC (already designated for Hermes Agent), making the "repurposed laptop" model directly transferable.

**The chief-of-staff repository is private** -- Doneyli's GitHub profile shows 33 repos but only 3 are pinned (claude-code-langfuse-template at 102 stars, ClickHouse/agent-skills at 479 stars, langfuse-llm-certification-finance at 15 stars). The architecture details come from his Substack posts, which are detailed enough to be engineering specifications.

**Overnight (9/10):** Seven launchd jobs: urgent email scan every 30 minutes (Tier 1, rules-only, zero LLM cost), full email triage at 5 PM (Tier 2, LLM classification + draft generation), daily briefing at 5:30 PM, nightly memory reflection, Signal bot with watchdog auto-restart. Survives reboots. Runs on Claude Max subscription ($100/month) for unlimited overnight invocations. Tier 1 alerts delivered in under 10 seconds. Source: Substack post with detailed job schedule.

**Safety (8/10):** Three graduated trust levels with measurable, per-contact-category graduation criteria. This is the critical differentiator. Level 1 (Approval Required): all drafts queued for human review. Level 2 (Supervised): auto-send enabled only when ALL conditions are simultaneously met: edit distance below 10%, confidence score above 0.9, fewer than 5 auto-sends per hour, contact NOT in protected categories. Level 3 (Autonomous): full auto-send for qualifying contacts. Graduation thresholds: Level 1 to 2 requires 20+ approved drafts, less than 20% edit rate, greater than 80% send rate, minimum 7 days of tracking. Level 2 to 3 requires 50+ successful auto-sends, 14 consecutive days without issues, zero errors. Only the last 90 days count, so old successes do not prop up declining performance. Trust can be demoted immediately if edit rates spike or send rates drop. Hardcoded `NEVER_AUTO_SEND` list for VIP/family that overrides any trust level. Separate accounts per trust level. Source: Substack post and security audit article.

**Why the safety model matters for Glen:** Glen's system violated trust by sending a Telegram message to a client. Doneyli's graduated trust model would have prevented this because: (a) new contact categories start at Level 1 (approval required), (b) graduation requires 20+ reviewed drafts with demonstrated accuracy, and (c) a hardcoded never-auto-send list protects VIP contacts regardless of trust score. The 90-day decay window is particularly important because it means trust erodes if the system is not actively monitored.

**Closed Loops (8/10):** Two-tier processing: Tier 1 is rules-based urgency detection that handles approximately 80% of inputs at zero cost (keyword matching, date extraction, sender importance, channel priority, staleness rules). Tier 2 is LLM batch processing for the remaining 20% (classification, synthesis, drafting). Every classified input produces an output: triage, draft, task, or archive. Source linkage is maintained. Approximately 50 emails processed daily per tenant (100+ across both inboxes), 3-5 urgent alerts per day via Tier 1. Draft accuracy: greater than 80% send rate without human edits for graduated categories. Source: Substack post with processing metrics.

**Memory (8/10):** Three-layer system. Layer 1 (Observations): auto-captured structured logs at zero LLM cost (corrections, overrides, rules). Layer 2 (Synthesized Memories): daily LLM reflection consolidates observations, weekly consolidation merges redundancies. Layer 3 (Retrieval): FTS5 full-text search with BM25 ranking, hard-capped at approximately 550 tokens per query, four-tier context injection (3 core + 3 sender-specific + 2 topic-specific + 2 situational = 10 memory results max per query). Memory decay with three rates: recently accessed at 0.02 per cycle, normal at 0.05, long-forgotten at 0.08. Pinned memories immune to decay. Approximately 2,000 active observations, approximately 400 synthesized memories in production. Source: Substack post with exact token limits and decay rates.

**Error Fix (7/10):** Four-layer self-healing stack: (1) Docker `restart: on-failure:5` prevents infinite crash loops, (2) Docker autoheal restarts unhealthy containers within 30 seconds, (3) Gatus health monitoring with ntfy alerts when any agent fails, (4) external Docker watchdog catches daemon hangs that in-Docker monitoring cannot detect. Error classification from Langfuse traces feeds back into processing rules. This is infrastructure-level recovery (restart the container), not application-level repair (fix the bad data). Source: Substack post and security audit article. 396 passing tests including 52 security-specific tests, 18 adversarial prompt injection payloads, 10 false positive prevention tests, 8 trust-gaming scenarios.

**Proposals (4/10):** No formal automation proposal mechanism documented. The system focuses on operational execution, not suggesting new automations. Scored lower than original assessment because no evidence of proactive "you could automate X" capability was found in any of the Substack posts. Source: absence of evidence across 10+ published articles.

**Maturity (8/10):** 313 commits, 43,000 lines, 25 database tables, 133 test files, 396 passing tests. Real daily use by a Principal AI Architect at ClickHouse managing two tenants. Published a complete security audit finding 18 vulnerabilities (4 critical, 6 high, 7 medium, 1 low) and remediated all. Cost tracked at under $3/day for two tenants. Also produced the Langfuse observability template (102 GitHub stars) and agent skills contributed to ClickHouse's official repo (479 stars). Private repo, so community contribution metrics unavailable. Source: Substack posts, GitHub profile.

**Portability (5/10):** Python-native, macOS launchd for scheduling, PostgreSQL + ClickHouse for data, FastMCP for tools. Porting to Windows would require replacing launchd with Task Scheduler, reconfiguring Docker networking, and adapting shell scripts. Not designed for platform migration. Scored lower than original because the tight coupling to macOS launchd and Docker infrastructure makes this a non-trivial port. Source: architecture described in Substack posts.

---

### 2. Hermes Agent / Nous Research (Weighted: 7.25/10)

**Source:** [GitHub: NousResearch/hermes-agent](https://github.com/nousresearch/hermes-agent), [Official docs: hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com/), [Security docs](https://hermes-agent.nousresearch.com/docs/user-guide/security), [Memory docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory), [Releases](https://github.com/NousResearch/hermes-agent/releases)

**Who:** Nous Research -- the research lab behind Hermes, Nomos, and Psyche model families. This is not a solo project but a well-resourced open-source effort from a major AI research org.

**Architecture:** Python (82.2%) + TypeScript (13.9%). SQLite for all state (`~/.hermes/state.db`) with FTS5 full-text search. Built-in cron scheduler for headless jobs. Persistent daemon managed by launchd (macOS) or systemd (Linux). 16+ messaging platform integrations (Telegram, Discord, Slack, WhatsApp, Signal, iMessage via Photon, Home Assistant, Raft agent network). Skills system with auto-creation from observed patterns. MIT licensed. Current version v0.17.0 released 19 June 2026.

**Repository scale:** 193-201k stars, 36.9k forks, 13,404 commits, 1,400+ contributors. First public release tag v0.15.0 on 28 May 2026, developed internally for approximately 8 months before that. Four releases in 22 days (v0.15.0 through v0.17.0). Source: GitHub repo page and star-history.com.

**Why this matters for Glen:** Hermes is the only implementation with an industrial-grade security model AND overnight operation AND model-agnostic design. It runs on a $5 VPS, supports multiple LLM backends (Nous Portal, OpenRouter, OpenAI, custom endpoints, Ollama), and has container isolation that would protect Glen's systems from the kind of trust violation that occurred with Telegram. The skills self-improvement loop is the closest existing mechanism to Glen's requirement for daily automation proposals.

**Overnight (8/10):** Persistent daemon with built-in cron via `/api/jobs` endpoint. Runs on a $5 VPS minimum. Supports serverless persistence via Daytona and Modal (hibernates when idle, near-zero cost). Cron jobs can trigger processing and deliver results to any connected messaging platform while user is offline. `cron_mode` configuration controls whether dangerous commands auto-approve or auto-deny during headless operation. Source: official documentation, releases page.

**Safety (8/10):** Seven-layer defence-in-depth architecture (the most comprehensive of all implementations studied): (1) Dangerous command approval with three modes: manual (default, always prompts), smart (LLM risk assessment with auto-approve/deny/escalate), off. Hardline blocklist that cannot be bypassed even in YOLO mode (rm -rf /, fork bombs, mkfs on mounted devices, dd to physical disks, untrusted URL piping to shell). Approval triggers for recursive deletes, dangerous permissions, system modifications, SQL operations without WHERE clause, remote code execution patterns, config file overwrites. CLI approval flow with four options: once, session, always (saved to config.yaml), deny (default). (2) User authorisation via per-platform allowlists and DM pairing. (3) DM pairing system with OWASP/NIST SP 800-63-4 compliant 8-character codes (cryptographic randomness, 1-hour TTL, rate limiting at 1 per user per 10 minutes, max 3 pending per platform, 5-attempt lockout for 1 hour, chmod 0600 on data files, codes never logged). (4) Container isolation with --cap-drop ALL, --security-opt no-new-privileges, --pids-limit 256, configurable CPU/memory/disk limits. (5) MCP credential filtering (only safe system vars pass through; API keys, tokens, secrets stripped; explicit passthrough required). (6) Context file injection protection (scans for prompt injection, hidden HTML comments, credential exfiltration, invisible Unicode). (7) Supply-chain advisory checking for compromised Python packages. Plus Tirith pre-exec security scanning for homograph URL spoofing, pipe-to-interpreter attacks, terminal injection. Source: official security documentation, fully enumerated.

**Why the safety model matters for Glen:** This is mechanically enforced safety, not conventional/prompt-based. The hardline blocklist cannot be bypassed regardless of mode. The DM pairing system would have prevented the Telegram trust violation because unknown contacts would be denied by default and pairing requires explicit owner approval via CLI. Container isolation means even if the agent is compromised, it cannot access host credentials.

**Closed Loops (6/10):** Skills system creates reusable procedures from experience. Cron jobs can trigger processing and deliver to messaging platforms. But the loop architecture is more "execute scheduled task and deliver result" than "observe signal, classify, create controlled action with source linkage." There is no documented two-tier processing (rules first, LLM second) or commitment tracking. Source: official documentation.

**Memory (7/10):** Two markdown files: MEMORY.md (2,200 chars/~800 tokens for agent environmental notes) and USER.md (1,375 chars/~500 tokens for user preferences). Loaded as frozen snapshot at session start (preserves LLM prefix caching). Changes persist to disk immediately but only appear in next session. No auto-compaction (returns error when limit exceeded, prompts manual consolidation). SQLite FTS5 full-text search across all past sessions (~20ms queries) via `session_search` tool. Eight external memory provider plugins: Honcho (dialectic user modelling), OpenViking, Mem0, Hindsight, Holographic, RetainDB, ByteRover, Supermemory. Write approval gates for self-improvement writes (`/memory approve/reject`). Source: official memory documentation.

**Why the memory model matters for Glen:** The frozen-snapshot-at-session-start pattern is important because it prevents mid-session memory mutation (a source of unpredictability). The 800-token agent memory limit is aggressively small, which forces consolidation discipline. The external provider ecosystem means Glen could add semantic search (via Mem0 or Holographic) without replacing the core architecture.

**Error Fix (6/10):** Self-improving skills: the agent observes patterns and generates reusable skill files. 20+ self-created skills reportedly yield approximately 40% token reduction. Skills improve during use. But this is efficiency improvement (reduce tokens), not error correction (fix wrong outputs). No documented mechanism for detecting that a draft was generated from stale data or that a classification was wrong. Source: official documentation and feature descriptions.

**Proposals (6/10):** The skill self-improvement loop IS a form of proposal generation. After observing repeated multi-step tasks, Hermes encodes the process as a reusable skill stored as readable Markdown. This is closer to Glen's requirement for daily automation proposals than most systems because it generates actual working implementations, not just suggestions. However, it is reactive (creates skills after observing patterns) rather than proactive (surveying operations and proposing new automations). Source: official documentation.

**Maturity (8/10):** 193-201k stars, 13,404 commits, 1,400+ contributors. Backed by Nous Research (established AI research lab). v0.17.0 represents rapid feature velocity: 1,475 commits, 800 merged PRs, 300+ issues closed since v0.16.0 (14 days prior). MIT licensed. Comprehensive documentation site. However, the first public release was only 28 May 2026 (one month old as of this study), so production deployment evidence outside Nous Research is limited. Source: GitHub releases page, star-history.com.

**Portability (9/10):** Model-agnostic: Nous Portal, OpenRouter, OpenAI, custom endpoints, Ollama. Switch models via `hermes model` command without code changes. Runs on macOS (launchd), Linux (systemd), Docker, Singularity (HPC), Modal (serverless), Daytona (cloud sandbox). Desktop app available across all platforms as of v0.16.0. MCP server mode for integration with other tools. Source: official documentation, configuration reference.

---

### 3. Claudia / kbanc85 (Weighted: 6.75/10)

**Source:** [GitHub: kbanc85/claudia](https://github.com/kbanc85/claudia), [Dev.to article](https://dev.to/jonesrussell/claudia-an-ai-chief-of-staff-that-runs-on-claude-code-4p37), [skillsllm.com listing](https://skillsllm.com/skill/claudia)

**Who:** kbanc85 (author's real name not prominently published). The system is positioned as a commercial-adjacent personal tool with a PolyForm Noncommercial license.

**Architecture:** Python (67.2%) + JavaScript (28.4%) + Shell (2.3%) + PowerShell (1.6%). Claude Code + MCP daemon + SQLite with semantic vector embeddings via Ollama (all-minilm:l6-v2 model). Node.js 18+, Python 3.10-3.13. Two-tier agent delegation: Haiku workers for document processing, Sonnet research scout for autonomous multi-turn web research. Relationship judgement retained by primary Claude instance. 45 skills defined in markdown. Obsidian vault integration with PARA structure.

**Repository metrics:** 438 commits, 273 stars, 41 forks. PolyForm Noncommercial 1.0.0 license (free for personal, research, educational, nonprofit; commercial licensing available). Latest release v1.65.0 (Ambient Memory Capture, 16 June 2026). Source: GitHub repo page.

**Why this matters for Glen:** Claudia has the strongest relationship intelligence of any implementation studied. Glen manages relationships with clients (Couch Heroes, Lighthouse), contractors (Marie, Stavros), and prospects across the NBI pipeline. The commitment tracking ("I'll send that by Friday" becomes a dated reminder) would directly address the kind of commitments that currently live in Glen's head or session logs. The cooling relationship detection (comparing contact frequency against established baselines) would surface clients Glen hasn't spoken to in too long.

**Overnight (7/10):** Four scheduled overnight jobs running as standalone daemon (LaunchAgent, independent of active Claude Code sessions): adaptive decay at 2 AM (high-importance memories decay at half the standard rate), consolidation at 3 AM (merges duplicates, detects cross-week patterns, tracks relationship health trends), vault sync at 3:15 AM (syncs to Obsidian PARA structure), pattern detection every 6 hours (surfaces trends across conversations). Source: GitHub README.

**Safety (7/10):** Fully local processing, no external storage APIs. "Every email, calendar event, external action requires your explicit 'yes'." Dual data copies: SQLite + Obsidian vault (user-owned, no lock-in). Full user delete controls. No formal graduated trust levels, but the explicit approval requirement for all external actions is a reasonable safety floor. Scored lower than ceaksan because ceaksan's "never sends, period" is a harder boundary than "requires your explicit yes." Source: GitHub README and SECURITY.md.

**Closed Loops (8/10):** The tightest closed loop on relationship intelligence of any implementation studied. "I'll send that by Friday" is detected as a commitment, stored in SQLite with who, when, and confidence score, and Friday morning's brief proactively surfaces it. Cooling relationships detected by comparing contact frequency against established baselines (e.g. "Haven't spoken to Marcus in 18 days, usually weekly"). Overdue commitments flagged. Every fact stored with attribution: who said it, when, confidence level. Morning briefs structured by user-defined judgment rules from `context/judgment.yaml`. Slash commands: `/morning-brief`, `/research`, `/meditate` (end-of-session knowledge extraction), `/wiki` (synthesised entity pages), `/auto-research`. Source: GitHub README, skillsllm.com listing.

**Memory (9/10):** The standout memory architecture across all implementations. Hybrid ranking: 50% vector similarity + 25% importance + 10% recency + 15% full-text search. Rehearsal effect: accessing a memory boosts its score. Four scheduled overnight jobs maintain memory health (see Overnight section). Every memory stored with attribution (who, when, confidence) in SQLite with vector embeddings via Ollama all-minilm:l6-v2. Pattern detection works across weeks, not just sessions. `/meditate` extracts what was learned at session end: preferences, patterns, judgment calls. Every active person, project, and organisation gets a synthesised page in Obsidian with each fact citing its source memory. `/brain` launches a 3D network graph visualisation: entities as nodes, relationships as edges, interactive filtering and search. Source: GitHub README, detailed feature descriptions.

**Why the memory model matters for Glen:** The judgment.yaml is directly analogous to what Glen needs. Rules like "revenue work beats internal cleanup" are stored once and applied across sessions: briefs, triage, delegation, risk surfacing. This is what gives the system consistent priorities without re-explaining them every session. The rehearsal effect (accessing a memory boosts it) creates a natural relevance filter: memories Glen actually uses get stronger, memories he never references fade.

**Error Fix (5/10):** Basic error handling. Not a documented focus of the system. No error classification, no automatic retry, no quarantine mechanism. Source: absence of documentation.

**Proposals (6/10):** Pattern surfacing (cooling relationships, repeated behaviours, overcommitment detection) is a form of proactive intelligence. "Overcommitting again? A key relationship going cold? The same mistake twice? She sees it forming and speaks up." This is proactive awareness, though not formal automation proposals. Scored higher than original because the proactive pattern detection is more active than passive reporting. Source: GitHub README.

**Maturity (7/10):** 438 commits, 273 stars, 41 forks. Active development (v1.65.0 released 16 June 2026). Real usage by the author and a small community. Google Workspace integration (Gmail, Calendar, Drive, Docs, Sheets, Tasks). Two-tier agent delegation (Haiku workers + Sonnet scout) shows production-grade architecture thinking. Source: GitHub repo page.

**Portability (5/10):** Tied to Claude Code + MCP daemon + Ollama for embeddings. LaunchAgent for macOS scheduling. PowerShell support (1.6% of codebase) suggests some Windows awareness but primary development is macOS-targeted. PolyForm Noncommercial license limits deployment flexibility. Source: GitHub language breakdown.

---

### 4. ceaksan -- Chief of Staff (Weighted: 5.95/10)

**Source:** [GitHub: ceaksan/chief-of-staff](https://github.com/ceaksan/chief-of-staff), [Blog: ceaksan.com/en/chief-of-staff-local-ai-assistant](https://ceaksan.com/en/chief-of-staff-local-ai-assistant)

**Who:** ceaksan (Turkish developer, also maintains a turkish-diacritics Claude Code plugin). Solo entrepreneur building for solo entrepreneurs.

**Architecture:** Python 3.11+ (93.7%) + Shell (6.3%). SQLite (9 tables, 5 views) as single source of truth. macOS launchd for scheduling (or cron for Linux). Claude Sonnet for classification, Claude Opus for orchestration. MCP-first architecture for Gmail and Calendar via Claude's built-in MCP connectors. Obsidian as view layer (read-only renderer, not read-write database). Separate AI calendar to prevent mixing AI time blocks with real events. Domain agents (Calendar, Health, Task, Feed) run in parallel via asyncio. Content hash deduplication with idempotent inserts and audit trail on all classifications.

**Repository metrics:** 22 commits, 2 stars, 0 forks. MIT license (UNVERIFIED -- not visible in search results; assumed from typical open-source Python projects). Source: GitHub repo page.

**Why this matters for Glen:** ceaksan's "never sends" policy is the correct trust default for Glen's AIOS after the Telegram incident. The system proves that overnight classification produces actionable results without requiring any send capability. The classification taxonomy (DISPATCH/PREP/YOURS/SKIP) is directly implementable and avoids the complexity of Doneyli's three-tier trust model while still being useful.

**Overnight (8/10):** Genuinely runs overnight. Collection at 06:00 via launchd: Claude MCP session gathers Gmail and Calendar data, Python collectors retrieve RSS feeds, health metrics, and tasks. Classifier (Sonnet) sorts items into four categories: DISPATCH (AI can handle entirely, e.g. meeting confirmations), PREP (AI does 80%, user finishes, e.g. complex email drafts), YOURS (user's brain required, e.g. strategic decisions), SKIP (not today, e.g. low priority, distant deadlines). Renderer outputs Obsidian Daily Note. Pipeline: 09:00 collect, 09:02 render, 09:04 classify. If a source fails, others continue; the Daily Note shows a warning. Mutex locking via `shlock` prevents concurrent runs. Source: blog post with detailed pipeline architecture.

**Safety (9/10):** The strongest safety model by design simplicity. The system NEVER creates or sends emails. "Email drafts are classified but no agent creates drafts. You handle email manually." This is a hard safety boundary: the email agent exists in the codebase but is "excluded from the orchestrator's dispatch map." Critical decisions (pricing, strategy, contracts) are marked as `force_yours` and cannot be classified as DISPATCH regardless of confidence. Budget caps enforced via `--max-budget-usd` flag on every Claude process. All classifications require human approval before execution. Source: blog post and GitHub README.

**Why the safety model matters for Glen:** This is the simplest and most effective safety architecture. It eliminates the entire class of "Claude sent something to someone" failures by making send capability architecturally impossible, not just policy-restricted. For Glen's AIOS Phase 1, this should be the default: the system classifies and drafts but never sends. Doneyli's graduated trust can layer on top in Phase 2 after the classification pipeline is proven.

**Closed Loops (6/10):** Gmail/Calendar/RSS/Tasks collection leads to classification leads to Obsidian Daily Note. The loop creates a readable, structured output with items classified and prioritised. But the action step is still manual: Glen reads the note and decides. No commitment tracking, no relationship cooling detection, no structured task creation in an external system. The loop closes at "classified and presented," not at "action taken and verified." Source: blog post.

**Memory (5/10):** SQLite as intermediate database with content hash deduplication and idempotent inserts. Audit trail on classifications (model used, reasoning recorded). No memory decay, no cross-session knowledge graph, no nightly synthesis. Obsidian renders the data but does not serve as a memory layer. Source: blog post and GitHub README.

**Error Fix (4/10):** "If a source fails, the others continue running." The Daily Note shows warnings for failed sources. Parallel agents use semaphore-based concurrency with individual timeouts and log files. This is fault tolerance (keep running if one source fails), not error correction (detect and fix wrong classifications). Source: blog post.

**Proposals (3/10):** No automation proposal mechanism. The system classifies existing work; it does not suggest new automations. Source: absence of documentation.

**Maturity (5/10):** Only 22 commits, 2 stars, 0 forks. Real daily use by the author (documented in blog post). Well-architectured but minimal community adoption. The blog post demonstrates genuine production use, but the low commit count suggests limited iteration. Cost: approximately $2-7/day (collection + classification with Sonnet at $1-3/day, morning sweep with Opus at $1-3/day, day block with Sonnet at $0.25-1/day). Source: GitHub metrics, blog post cost breakdown.

**Portability (5/10):** Tied to macOS launchd (or cron for Linux). Requires Obsidian as view layer. Python-native with no Windows-specific code. Would need Task Scheduler replacement and Obsidian path adaptation for Windows. Source: GitHub README.

---

### 5. Murchison -- Claude Chief of Staff (Weighted: 5.55/10)

**Source:** [GitHub: mimurchison/claude-chief-of-staff](https://github.com/mimurchison/claude-chief-of-staff), [DeepWiki documentation](https://deepwiki.com/mimurchison/claude-chief-of-staff/5.1-writing-style-and-voice)

**Who:** Mike Murchison, CEO of Ada (agentic customer experience platform). This gives the architecture credibility: the CEO of a company that builds AI customer service agents uses this system for his own daily operations.

**Architecture:** Shell (100% of repository). Claude Code-based system with MCP server integrations. No traditional database; uses YAML configuration files (goals.yaml, my-tasks.yaml, schedules.yaml). contacts/ directory for relationship management. Four core commands: /gm (morning briefing), /triage (inbox triage), /my-tasks (task management), /enrich (contact enrichment).

**Repository metrics:** 4 commits, 416 stars, 79 forks. MIT license. Source: GitHub repo page.

**Why this matters for Glen:** The goals.yaml pattern is the single most transferable idea for Glen's AIOS. Every triage decision, every meeting proposal, every task prioritisation references the goals file. This gives the agent a priority spine that prevents it from surfacing whatever is most available rather than what is most important. Glen's NBI Brain already contains this information but it is not structured for machine consumption. Converting key priorities into a goals.yaml equivalent would immediately improve triage quality.

**Overnight (6/10):** schedules.yaml supports automated background operations. "Operates 24/7 in the background" per README. Contact auto-enrichment runs every 15 minutes ("160+ contacts tracked, auto-enriched every 15 minutes across all channels"). However, the implementation is Claude Code session-based, which means it depends on an active Claude Code process rather than a persistent daemon. Source: GitHub README.

**Safety (6/10):** Drafts responses in user's voice but requires approval before sending. Priority-based scoring tied to relationship importance and goal alignment. Claude "pushes back when your time allocation drifts from stated priorities." No formal trust levels, no hardcoded never-send list, no graduated autonomy. The safety model is goal-aligned filtering (refuse low-priority requests) rather than action-level safety (prevent sending). Source: GitHub README, customization docs.

**Closed Loops (7/10):** Email/Slack/messaging triage produces drafted responses prioritised by relationship importance and goal alignment. goals.yaml is the priority spine: every classification decision references it. Morning briefing reads current state, checks email/calendar via MCP, delivers structured triage. Contact enrichment runs in background. Reported result: "90 minutes to approximately 5 minutes" for morning inbox processing. The loop closes at "drafted and prioritised" rather than "sent and confirmed." Source: GitHub README.

**Memory (5/10):** contacts/ directory for relationship management (auto-enriched). goals.yaml and my-tasks.yaml as structured state. Session-based otherwise; no persistent memory database, no decay, no cross-session knowledge graph. The contact enrichment across channels is useful but the memory architecture is shallow compared to Doneyli or Claudia. Source: GitHub README.

**Error Fix (3/10):** No error correction mechanism documented. No health monitoring, no retry logic, no error classification. Source: absence of documentation.

**Proposals (4/10):** No automation proposal mechanism. The system triages and drafts; it does not propose new workflows. Source: absence of documentation.

**Maturity (6/10):** Only 4 commits, which suggests this is a polished template release rather than an actively iterated system. 416 stars and 79 forks indicate significant community interest. Real daily use by the CEO of Ada (a substantial company). The star-to-commit ratio (104:1) is unusually high, suggesting the value is in the concept and CLAUDE.md design rather than the codebase. Source: GitHub metrics.

**Portability (6/10):** Shell (100%), Claude Code-dependent. The goals.yaml and contacts/ patterns are tool-agnostic and transferable to any AIOS. MCP integrations (Gmail, Calendar, Slack, WhatsApp, iMessage, Granola, PostHog) are Claude-specific but the integration pattern is standard. Source: GitHub language breakdown.

---

### 6. gAIOS / alirezarezvani (Weighted: 5.15/10)

**Source:** [GitHub: alirezarezvani/gaios](https://github.com/alirezarezvani/gaios), [Medium article (paywalled)](https://alirezarezvani.medium.com/i-built-an-ai-operating-system-for-claude-code-and-codex-boring-is-the-whole-point-8af210d9de00)

**Who:** Alireza Rezvani. Inspired by Nate Herk's AIS-OS starter kit and Three Ms / Four Cs frameworks. Prolific publisher of Claude Code tools (337 skills in a separate repo, GitHub workflow blueprint).

**Architecture:** Python (82.7%) + HTML (10.1%) + CSS (7.2%). WAT model (Workflows, Agents, Tools): probabilistic AI reasoning combined with deterministic code execution. Second-brain wiki with knowledge graph (via graphify). Leakage-scanning lint gate for sensitive data. Self-verification gates per workflow step. Compliance guardrails block in CLAUDE.md for GDPR/HIPAA/SOC2/medical-device scenarios. 16 documented skills: /setup, /structure, /triage, /daily, /weekly, /wiki, /graph, /graph-query, /graph-ingest, /draft, /prep, /decide, /workflow, /experiment, /exec-cockpit, /onboard, /audit, /level-up.

**Repository metrics:** 29 commits (dev branch), 18 stars, 1 fork. MIT license. Source: GitHub repo page.

**Why this matters for Glen:** Two patterns are transferable. First, the deterministic tools layer: Python modules that perform reliable execution (date parsing, format conversion, validation) regardless of which LLM invokes them. Glen's AIOS should separate deterministic operations (date extraction, client name matching, keyword detection) from LLM reasoning. Second, the graphify knowledge graph converts code + wiki into a navigable, queryable graph (interactive graph.html, GRAPH_REPORT.md of hub nodes and surprising connections, MCP server). This is directly relevant to the NBI intelligence pipeline.

**Overnight (4/10):** /triage, /daily, /weekly batch skills exist but depend on session invocation or external scheduling. Not a persistent daemon. No documented launchd/systemd/cron integration. The system is a blueprint, not a running service. Scored lower than original because "batch skills that need manual invocation" is not overnight operation. Source: GitHub README.

**Safety (6/10):** Leakage-scanning lint gate prevents sensitive data in committed wiki pages. Self-verification gates per workflow step. Compliance framework for GDPR/HIPAA/SOC2. Operating discipline: think-before-acting, surgical changes, goal-driven verification. But no formal trust levels, no send/draft distinction, no graduated autonomy. The leakage scanning is a strong pattern (NBI handles sensitive client data), but safety is about preventing data exposure rather than preventing unwanted actions. Source: GitHub README.

**Closed Loops (5/10):** /structure converts fuzzy inputs into briefs. /prep validates briefings. /decide frames and logs decisions. /experiment formalises test-measure-keep/revert cycles. Self-verification gates per step. But loops are user-invoked, not autonomous. The system provides good tooling for manual loop execution but does not close loops independently. Source: GitHub README.

**Memory (7/10):** Second-brain wiki with cross-linked pages. Graphify produces interactive knowledge graph with hub-node analysis. Local-only processing (only de-identified wiki content sent to AI session). Raw notes feed into clean wiki pages. Leakage scanning prevents sensitive data persistence. Better than most for structured knowledge, but no memory decay, no nightly reflection, no temporal awareness. Source: GitHub README.

**Error Fix (5/10):** /experiment (autoresearch) formalises test-measure-keep/revert cycle: run an experiment, measure the result, keep or revert. Good for document improvement but operates on quality iteration, not operational error correction. Source: GitHub README.

**Proposals (4/10):** The /level-up concept exists (inherited from Nate Herk's framework) but is skill-invoked, not proactive. No documented mechanism for the system to independently survey operations and propose automations. Source: GitHub README.

**Maturity (4/10):** Only 29 commits, 18 stars, 1 fork. Well-documented blueprint with good architectural thinking. But "blueprint" means template, not battle-tested system. The separate claude-skills repo (337 skills) shows breadth but not depth of production use. Source: GitHub metrics.

**Portability (8/10):** Designed for both Claude Code and Codex with secondary support for Cursor, Gemini CLI, and Copilot. AGENTS.md mirrors CLAUDE.md (CLAUDE.md canonical, AGENTS.md defers on conflict). For Codex, skills auto-discover from `.codex/skills` (symlink; Windows falls back to reading `.claude/skills/` directly). Deterministic Python tools in `tools/` provide standardised execution regardless of runtime. This is the most deliberately portable architecture studied (tied with Nate Herk at the conceptual level but with actual multi-platform implementation). Source: GitHub README compatibility table.

---

### 7. Nate Herk -- AIS-OS (Weighted: 5.00/10)

**Source:** [GitHub: nateherkai/AIS-OS](https://github.com/nateherkai/AIS-OS), [3Ms Framework: references/3ms-framework.md](https://github.com/nateherkai/AIS-OS/blob/main/references/3ms-framework.md), [nateherk.com](https://www.nateherk.com/)

**Who:** Nate Herk, AI automation educator and founder of Uppit AI. Runs the AI Automation Society community. This is a teaching tool, not a production system. Nate's own production AIOS is more complex than AIS-OS.

**Architecture:** No code in the traditional sense. The entire kit is markdown files: CLAUDE.md (operating manual, auto-populated), connections.md (system integration registry), decisions/log.md (append-only decision record), references/3ms-framework.md (full framework documentation). Three skills: /onboard (7-question interview, generates Day-1 file set), /audit (Four-Cs gap report, read-only), /level-up (Three Ms interview, surfaces one automation to scope and ship).

**Repository metrics:** 2 commits (main branch), 878 stars, 281 forks. MIT license. Source: GitHub repo page.

**Why this matters for Glen:** AIS-OS's value is not in code but in frameworks. Three specific frameworks are directly implementable.

**Framework 1: The Autonomy Spectrum.** Five levels that provide a vocabulary for trust decisions:

| Level | Name | Behaviour |
|-------|------|-----------|
| L0 | Manual | Human does everything |
| L1 | Suggested | AI proposes, human decides each step |
| L2 | Drafted | AI creates draft, human reviews/edits |
| L3 | Supervised | Rules-based operation, human validates |
| L4 | Autonomous | End-to-end AI execution |

Principle: "Default to the lowest autonomy level that functions effectively. Escalate only after proving the lower tier works." This maps directly to Glen's trust violation: Telegram messaging was at L4 when it should have been at L2.

**Framework 2: The Bike Method (Phased Rollout).** Phase 1 (Training Wheels): manual execution with observation. Phase 2 (Guided): automation runs with full human review (drafts, doesn't send). Phase 3 (Watched): autonomous operation with monitoring and anomaly alerts. Phase 4 (Hands-Off): independent operation. Deploy 10% of volume initially, expand after one week of monitoring, use confidence thresholds (high sends, medium queues, low escalates). Source: 3ms-framework.md.

**Framework 3: The Intern Rule.** Treat AI systems as new employees: separate identity and credentials, read-only access by default, never impersonates your identity, no personal credentials stored, complete audit trail, scoped permissions (minimal necessary access). Source: 3ms-framework.md.

**Framework 4: EAD (Eliminate, Automate, Delegate).** Before automating, ask whether the process should exist at all (Eliminate). Then apply the 60/30/10 Golden Rule: approximately 60% fully automated, approximately 30% AI-assisted (human reviews), approximately 10% remains manual (too complex/risky). Source: 3ms-framework.md.

**Overnight (3/10):** No overnight operation. AIS-OS is a starter kit with markdown files; it has no daemon, no scheduler, no background jobs. Overnight operation depends entirely on what the user builds on top. Source: GitHub repo.

**Safety (7/10):** The Intern Rule and Bike Method are strong conceptual safety models with specific, implementable mechanics (see frameworks above). The autonomy spectrum provides a vocabulary for trust decisions. But these are documented principles, not mechanical enforcement. There is no code that prevents sending, no approval gate, no trust scoring. Source: 3ms-framework.md.

**Closed Loops (3/10):** /audit identifies gaps in Four Cs coverage. /level-up proposes one automation per session. Both are user-invoked skills, not autonomous loops. The kit teaches loop thinking but does not implement closed loops. Source: GitHub README.

**Memory (4/10):** context/ folder for personal/business info. decisions/log.md (append-only). connections.md (integration registry). Clean file structure but no database, no memory decay, no cross-session knowledge graph, no temporal awareness. Source: GitHub README, CLAUDE.md.

**Error Fix (2/10):** Kill Switch principle: "Discontinue automations that consistently underperform, produce poor quality, or cost more to maintain than they save. Dismantle without hesitation." This is a human decision framework, not an error correction mechanism. Source: 3ms-framework.md.

**Proposals (7/10):** /level-up is the strongest explicit proposal mechanism across simpler implementations. It runs as a Three Ms interview (Mindset: where can AI be leveraged? Method: what constraint to address? Machine: how to build it), surfacing one automation to scope and ship per session. "One run = one shipped artefact." The weekly ritual cadence is disciplined. But it requires human invocation and does not independently survey operations. Source: GitHub README, CLAUDE.md.

**Maturity (6/10):** 878 stars, 281 forks with only 2 commits. The star-to-commit ratio (439:1) confirms this is a concept/template, not a production system. Widely referenced in the Claude Code community. Nate's own production AIOS is separate and more complex. Value is in frameworks, not code. Source: GitHub metrics.

**Portability (9/10):** Maximally portable because there is no code. Pure markdown files that work with any LLM tool that reads project instruction files. Nate reportedly migrated his entire AIOS to a different platform "in approximately 2 minutes" (UNVERIFIED -- reported in community discussions but no primary source found). The frameworks are tool-agnostic by design. Source: GitHub README.

---

### 8. Barbara Bermes -- Chief of Staff (Weighted: 4.30/10)

**Source:** [Medium: "Building My Own AI Chief of Staff"](https://bbinto.medium.com/building-my-own-ai-chief-of-staff-and-why-you-might-want-one-too-7e862a052a85), [GitHub: bbinto/bb-chiefofstaff](https://github.com/bbinto/bb-chiefofstaff)

**Who:** Barbara Bermes, Director of Product at Workleap. Previously product roles at Deel, Lever, and Mozilla. Manages product teams and uses this to synthesise operational data.

**Architecture:** JavaScript (97.1%) + Shell (1.5%). Node.js 18+. Claude Sonnet 4.5 (configurable). Anthropic API with MCP integration. Multi-agent orchestration via agent-runner.js. Four sequential agents: Weekly Recap (team communications), Business Health (ARR, churn, deals), Product Engineering (velocity, features, usage), OKR Progress (strategic initiatives). Agents defined as markdown instruction files in agents/ directory. Reports generated as timestamped markdown files.

**Repository metrics:** 74 commits, 10 stars, 7 forks. MIT license. Source: GitHub repo page.

**Why this matters for Glen:** Two patterns are transferable. First, multi-source aggregation: the system ingests from Slack, Jira, Calendar, Mixpanel, Confluence, HubSpot, and Gong via a combination of MCP connections (Slack, Jira, Calendar) and manual exports (CSV from Mixpanel, JSON from analytics). This "some MCP, some file-based" approach is pragmatic and avoids the trap of requiring MCP integration for every data source. Second, agent definitions as markdown files: adding a new data source requires writing a new instruction set, not new code. This is the lowest-friction expansion pattern.

**Overnight (4/10):** Scheduling via cron jobs (macOS/Linux `0 8 * * 1` for weekly Monday 8 AM) or Windows Task Scheduler. Dedicated shell scripts: daily-brief-cron.sh, thoughtleadership-cron.sh. But the system is designed to produce weekly digests, not continuous overnight monitoring. No daemon, no real-time alerting, no urgent escalation. Source: GitHub README, Medium article.

**Safety (5/10):** MCP authentication centralised (not scattered). Rate limiting encountered during development (implies some cost awareness). No formal safety model, no trust levels, no send/draft distinction. The system is read-only by design (aggregates and reports), so the safety risk surface is smaller than systems with outbound capabilities. Source: Medium article.

**Closed Loops (5/10):** Multi-source aggregation produces a weekly digest synthesising: shipped work, merged PRs, closed tickets, Confluence updates, velocity metrics, engagement signals, sentiment indicators, operational issues. The digest identifies patterns and anomalies. But the output is a report, not structured actions. No commitment tracking, no task creation, no follow-up mechanism. Source: Medium article.

**Memory (3/10):** No persistent cross-session memory. The system ingests data into Claude's context window for analysis each run. No database, no memory decay, no knowledge graph. Each weekly run starts fresh. Source: Medium article (absence of memory architecture).

**Error Fix (3/10):** MCP retry configuration: MCP_MAX_RETRIES=3, MCP_RETRY_DELAY=2000ms, MCP_CONNECTION_TIMEOUT=30000ms. This is connection-level retry, not application-level error correction. Source: GitHub README.

**Proposals (3/10):** No automation proposal mechanism. The system reports on operational state; it does not suggest new workflows. Source: absence of documentation.

**Maturity (5/10):** 74 commits, 10 stars, 7 forks. Real production use by a Product Director at Workleap. Open-sourced with comprehensive documentation including architecture docs and agent definitions. Development cost reported as 12-15 hours initial, approximately $15-20 API costs for development iterations, $24/month ongoing (Claude Pro subscription). Source: GitHub metrics, Medium article.

**Portability (6/10):** JavaScript/Node.js (platform-independent). Agents defined as markdown (transferable). MCP integrations are Claude-specific but the agent-runner pattern could adapt to other LLM APIs. Windows Task Scheduler support documented alongside cron. Source: GitHub README.

---

### 9. Polasky -- AI Chief of Staff (Weighted: 4.15/10)

**Source:** [GitHub: jdpolasky/ai-chief-of-staff](https://github.com/jdpolasky/ai-chief-of-staff)

**Who:** JD Polasky, a non-coder with ADHD who built this for non-coders with ADHD. Tested through "over a hundred sessions against real client work and a public platform build."

**Architecture:** Python (100%). Claude Code + Obsidian vault. Four slash commands: /setup (initial wizard, approximately 10 minutes, collects user profile, priorities, ADHD patterns, vault path), /start (morning briefing: reads notes, generates Must/Should/Could prioritisation, surfaces calendar/email if configured), /sync (mid-session checkpoint: saves progress), /wrap (end-of-session reflection: updates notes, queues remaining tasks). RAG model reads vault notes before each session. Template vault included in repository.

**Repository metrics:** 12 commits, 77 stars, 11 forks. MIT license. Source: GitHub repo page.

**Why this matters for Glen:** The Must/Should/Could prioritisation framework is a clean alternative to P0/P1/P2 that maps well to daily triage. The ADHD-prosthetic design principle (reduce cognitive load, surface the one thing to do next) is relevant for any high-context-switching operator. The Command Centre as a single current-state document is a pattern Glen's session logs already approximate.

**Overnight (3/10):** No autonomous overnight operation. Session-dependent. No daemon, no scheduler, no background jobs. Source: GitHub README.

**Safety (5/10):** No formal safety model. Relies on Claude Code's default permissions. No send capability, no trust levels, no approval gates. The Obsidian vault is user-owned and local. Source: GitHub README.

**Closed Loops (5/10):** /start reads Command Centre and To-Do List, checks email/calendar via MCP, delivers Must/Should/Could briefing. /wrap captures session outcomes and queues tasks for next session. The loop is user-invoked (start/wrap bookends) and depends on consistent daily use. No autonomous monitoring or alerting. Source: GitHub README.

**Memory (5/10):** Obsidian vault as cross-session memory. RAG reads vault notes before each session. Command Centre (current state) and archive (historical) separation. Accumulates context over approximately 2 weeks of use. No database, no vector search, no memory decay, no automated consolidation. Source: GitHub README.

**Error Fix (2/10):** No error correction mechanism documented. Source: absence of documentation.

**Proposals (3/10):** No automation proposal mechanism. Source: absence of documentation.

**Maturity (5/10):** 12 commits, 77 stars, 11 forks. 100+ sessions of real client use by the author. Battle-tested for the ADHD use case. Documented architecture. But low commit count and small community. Source: GitHub metrics.

**Portability (6/10):** Python (100%). Obsidian vault is a folder of markdown files (portable). Claude Code dependency for execution. No platform-specific code documented. Source: GitHub language breakdown.

---

### 10. Moritz Kremb -- Personal OS (Weighted: 3.85/10)

**Source:** [YouTube: "Automate Your Life with Claude Code in 40 Minutes"](https://www.youtube.com/watch?v=ACRd0Ikg_KI), [Threads summary by Peter Yang](https://www.threads.com/@petergyang/post/DYM6iysGnmu/), [creatoreconomy.so interview](https://creatoreconomy.so/p/build-a-claude-code-personal-os-step-by-step-moritz), [GitHub: moritzkremb](https://github.com/moritzkremb)

**Who:** Moritz Kremb, AI creator, ex-PM, founder of komposo.ai. Content creator focused on Claude Code tutorials. 16 GitHub repos including axrah-trend-scraper and axrah-ceo-brief.

**Architecture:** Claude Code personal OS with four layers. Layer 1 (Folder with Memory): soul.md (agent personality/voice definition), user.md (agent's knowledge of the user), tools.md (running list of CLI/MCP/APIs), memory/ folder (daily notes from past chats + long-term memory file). Layer 2 (Tools): APIs, MCPs, CLIs for email, social posting (Postiz CLI), Google Drive. Layer 3 (Skills): detailed instructions for repetitive tasks (video upload, grocery management). Layer 4 (Routines): scheduled proactive jobs. Remote routines for weekly content planning and YouTube competitor monitoring.

**No public repository for the personal OS itself** -- architecture details come from the YouTube tutorial and podcast appearances. The GitHub repos (axrah-trend-scraper, axrah-ceo-brief) are related tools but not the core OS.

**Why this matters for Glen:** The "Dream" routine is the standout pattern. It runs overnight and compresses daily memory files into long-term memory, analogous to REM sleep in humans. The soul.md as personality/voice definition (separate from operational context) is a clean architectural separation that Glen's AIOS should adopt: one file defines how the agent communicates, another defines what it knows.

**Overnight (5/10):** Remote routines for weekly content planning and YouTube competitor monitoring. "Dream" routine compresses daily memory into long-term memory overnight. CEO Brief summarises the day. Daily todo list/planner. These are documented routines but the specific scheduling mechanism (Claude Code Routines, cron, or launchd) is not specified in available sources. Source: Threads summary, creatoreconomy.so article.

**Safety (3/10):** No formal safety model documented. Includes direct posting via Postiz CLI (social media posts sent autonomously without approval). This is L4 autonomy for external-facing content with no apparent guardrails. Source: Threads summary.

**Why the safety gap matters for Glen:** Moritz's system posts directly to social media without approval. This is the exact anti-pattern Glen's AIOS must avoid. Any content pipeline in Glen's AIOS must go through the drafts-only broker.

**Closed Loops (4/10):** Content pipeline: idea scraping leads to script generation leads to auto-post via Postiz CLI. This is a closed loop for content production but it is narrow (content only) and lacks the observe-classify-act structure needed for operational management. No email triage, no commitment tracking, no relationship management. Source: Threads summary.

**Memory (6/10):** "Dream" routine: overnight memory compression and synthesis. Daily notes (ephemeral) separated from long-term memory (persistent, compressed). Auto Dream reviews what Auto Memory has collected, strengthens what is still relevant, removes what is outdated, reorganises into clean indexed topic files. The concept is strong but implementation details are behind a paywall. No documented memory decay rates, no attribution tracking, no semantic search. Source: Threads summary, creatoreconomy.so article.

**Error Fix (2/10):** No error correction mechanism documented. Source: absence of documentation.

**Proposals (4/10):** Content idea generation (trend scraping, competitor monitoring) is a form of proposal. CEO Brief suggests daily priorities. But these are content-focused, not operational automation proposals. Source: Threads summary.

**Maturity (3/10):** No public repository for the core OS. Architecture documented only through YouTube/podcast content. GitHub repos (axrah-trend-scraper, axrah-ceo-brief) are related but separate. Limited evidence of breadth beyond content production. Source: GitHub profile.

**Portability (5/10):** Claude Code dependent. Postiz CLI for social posting. Content-production focused. The four-layer architecture (folder, tools, skills, routines) is conceptually portable but no multi-platform implementation exists. Source: Threads summary.

---

## Best-of-Breed Pattern Recommendations for NBI AIOS

### Pattern 1: Graduated Trust Levels with Measurable Criteria

**Source:** Doneyli De Jesus ([Substack](https://doneyli.substack.com/p/i-built-an-ai-chief-of-staff-that))

**What:** Three trust levels where graduation is EARNED through measured performance, not granted by configuration. Trust decays on a 90-day rolling window so stale good performance does not prop up declining accuracy.

**Why this matters for Glen specifically:** Glen's system violated trust by sending a Telegram message to a client. This happened because there was no mechanical distinction between "has permission to draft" and "has permission to send." Doneyli's model separates these with measurable gates that cannot be bypassed by prompt engineering.

**Implementation specification:**

```
TABLE trust_levels (
  action_type TEXT,       -- e.g. 'email_external', 'slack_internal', 'telegram'
  contact_category TEXT,  -- e.g. 'client_ceo', 'contractor', 'team_internal'
  current_level INTEGER,  -- 0, 1, or 2
  approved_count INTEGER, -- drafts sent without edit in last 90 days
  edited_count INTEGER,   -- drafts edited before sending in last 90 days
  rejected_count INTEGER, -- drafts rejected in last 90 days
  last_promotion TIMESTAMP,
  last_demotion TIMESTAMP,
  never_auto_send BOOLEAN DEFAULT FALSE  -- hardcoded override for VIPs
)

GRADUATION RULES:
  Level 0 -> Level 1:
    approved_count >= 20
    AND edited_count / (approved_count + edited_count) < 0.20
    AND approved_count / (approved_count + rejected_count) > 0.80
    AND days_since_first_tracked >= 7

  Level 1 -> Level 2:
    approved_count >= 50 (since Level 1 promotion)
    AND days_since_promotion >= 14
    AND rejected_count == 0 (since Level 1 promotion)
    AND never_auto_send == FALSE

  DEMOTION TRIGGERS (any level):
    rolling_7_day_edit_rate > 0.30 -> demote one level
    any_rejected_in_last_48_hours -> demote to Level 0
    never_auto_send flipped to TRUE -> force Level 0

  DECAY:
    Only events in last 90 days count for graduation calculation
    Events older than 90 days are archived, not deleted
```

**Level behaviours:**
- Level 0 (Read and Report): system classifies and presents information. Cannot draft. Cannot send. Glen reads the classification and acts manually.
- Level 1 (Draft and Queue): system creates drafts in Glen's voice. Drafts appear in a review queue. Glen approves, edits, or rejects each one. Approval/edit/reject rates feed the trust calculation.
- Level 2 (Supervised Internal): system can execute internal WorkSage operations (create tasks, update statuses, assign items) without per-action approval, but maintains audit trail and weekly summary. External communication remains at Level 1 permanently unless Glen manually overrides.

### Pattern 2: Two-Tier Processing with Deterministic Rules First

**Source:** Doneyli De Jesus ([Substack](https://doneyli.substack.com/p/i-built-an-ai-chief-of-staff-that)), gAIOS ([GitHub](https://github.com/alirezarezvani/gaios))

**What:** Tier 1 is deterministic rules-based processing that handles the predictable 80% at zero LLM cost. Tier 2 is LLM processing for the remaining 20% that requires judgement. The separation reduces cost, increases predictability, and makes behaviour explainable.

**Why this matters for Glen specifically:** Glen runs on a Claude Max subscription ($100/month flat) so LLM token cost is not the primary concern. But predictability IS the concern. When every input goes through an LLM, behaviour is non-deterministic and unexplainable. A Tier 1 rules engine produces the same output for the same input every time, which is essential for trust: Glen needs to know that an email from a known client mentioning "invoice" will ALWAYS be classified as financial/urgent, not "usually" classified that way.

**Implementation specification:**

```python
# Tier 1: Deterministic Rules Engine (Python, zero LLM cost)
class Tier1Classifier:
    def classify(self, signal: Signal) -> Optional[Classification]:
        # Rule 1: Known client + financial keyword = P0 financial
        if signal.sender in self.known_clients and \
           any(kw in signal.body.lower() for kw in
               ['invoice', 'payment', 'overdue', 'billing', 'wire']):
            return Classification(
                priority='P0', category='financial',
                action='create_task', project=self.client_map[signal.sender],
                due_date=self.extract_date(signal.body),
                source_link=signal.source_url,
                tier='T1', confidence=1.0
            )

        # Rule 2: Commitment detection (regex)
        commitment = self.detect_commitment(signal.body)
        # matches: "I'll X by DATE", "will send X by DATE",
        #          "committed to X by DATE"
        if commitment:
            return Classification(
                priority='P1', category='commitment',
                action='create_reminder', who=signal.sender,
                what=commitment.description, when=commitment.due_date,
                tier='T1', confidence=0.9
            )

        # Rule 3: Calendar conflict detection
        if signal.type == 'calendar_invite':
            conflicts = self.check_conflicts(signal.proposed_time)
            if conflicts:
                return Classification(
                    priority='P1', category='scheduling_conflict',
                    action='flag_for_review', conflicts=conflicts,
                    tier='T1', confidence=1.0
                )

        # Rule 4: Staleness detection
        if signal.type == 'email' and \
           self.days_since_last_contact(signal.sender) > 14 and \
           signal.sender in self.active_clients:
            return Classification(
                priority='P2', category='relationship_cooling',
                action='add_to_brief', note=f"First contact in "
                    f"{self.days_since_last_contact(signal.sender)} days",
                tier='T1', confidence=0.8
            )

        # No Tier 1 match -> escalate to Tier 2
        return None

# Tier 2: LLM Classification (Claude Haiku for triage, Sonnet for drafts)
class Tier2Classifier:
    def classify(self, signal: Signal, context: BriefContext) -> Classification:
        # Uses goals.yaml priorities, contact importance, current projects
        # to classify signals that Tier 1 could not handle deterministically
        ...
```

**Failure path:** If client not recognised by Tier 1, signal is escalated to Tier 2 with `unmatched_sender=True` flag. If Tier 2 also cannot classify, signal is logged to an error queue with `needs_manual_routing=True` and appears in the morning brief under a separate "Unrouted" section. Every created artefact links back to the source signal via `source_url`.

### Pattern 3: Memory Decay with Nightly Reflection and Consolidation

**Source:** Doneyli De Jesus ([Substack](https://doneyli.substack.com/p/i-built-an-ai-chief-of-staff-that)), Claudia/kbanc85 ([GitHub](https://github.com/kbanc85/claudia)), Moritz Kremb ([YouTube](https://www.youtube.com/watch?v=ACRd0Ikg_KI))

**What:** A nightly maintenance cycle that prevents memory from becoming an unbounded noise accumulator. Three complementary operations: decay (reduce importance of stale memories), consolidate (merge duplicates, detect contradictions), and reflect (synthesise daily observations into longer-term patterns).

**Why this matters for Glen specifically:** Glen's NBI Brain is already approximately 300 lines and growing. The intelligence pipeline has 7 banks. Without decay, the system accumulates noise until context windows overflow. Without consolidation, the same fact appears in multiple places with subtle contradictions. Without reflection, the system sees individual events but not trends (e.g., "Couch Heroes has been delaying deliverable reviews for three consecutive weeks").

**Implementation specification:**

```
NIGHTLY PIPELINE (runs at 02:00, after daily intelligence work completes):

STEP 1: DECAY (deterministic, zero LLM cost)
  FOR each memory in aios_memory WHERE pinned = FALSE:
    IF last_accessed within 7 days:
      importance *= (1 - 0.02)    -- recently active: slow decay
    ELIF last_accessed within 30 days:
      importance *= (1 - 0.05)    -- normal: medium decay
    ELSE:
      importance *= (1 - 0.08)    -- forgotten: fast decay
    IF importance < 0.1:
      archive(memory)             -- move to archive, not delete

STEP 2: CONSOLIDATION (LLM, Haiku)
  -- Find near-duplicates using vector similarity > 0.85
  FOR each pair (m1, m2) WHERE cosine_similarity(m1.embedding, m2.embedding) > 0.85:
    merged = llm_merge(m1, m2)    -- Haiku merges, preserving attribution
    merged.sources = [m1.id, m2.id]
    merged.importance = max(m1.importance, m2.importance)
    replace(m1, m2, merged)

  -- Detect contradictions against Brain
  FOR each memory WHERE category = 'client_fact' OR category = 'financial':
    brain_claim = lookup_brain(memory.entity, memory.claim_type)
    IF brain_claim AND contradicts(memory, brain_claim):
      flag_contradiction(memory, brain_claim, for='morning_brief')

STEP 3: REFLECTION (LLM, Haiku)
  -- Synthesise today's session log + aios_actions into patterns
  today_events = load_session_log(today) + load_aios_actions(today)
  patterns = llm_detect_patterns(today_events, existing_patterns)
  -- Patterns: recurring client behaviours, repeated manual sequences,
  --           relationship frequency changes, workload distribution shifts
  FOR each pattern:
    IF pattern.is_new:
      create_memory(pattern, category='pattern', importance=0.7)
    ELIF pattern.is_strengthened:
      update_memory(pattern.existing_id, importance += 0.1)
```

**Pinned memories** (immune to decay): client contract dates, financial commitments, Glen's hard rules from CLAUDE.md, any memory Glen explicitly pins.

### Pattern 4: Drafts Only as Trust Default

**Source:** ceaksan ([GitHub](https://github.com/ceaksan/chief-of-staff), [Blog](https://ceaksan.com/en/chief-of-staff-local-ai-assistant))

**What:** The system NEVER sends external messages autonomously. Zero exceptions. This is implemented architecturally (send capability excluded from dispatch map), not as a policy (prompt instruction to not send).

**Why this matters for Glen specifically:** After the Telegram incident, Glen needs a trust model where "the system cannot send" is a hard architectural boundary, not a prompt instruction that can be overridden by context or hallucination. ceaksan achieves this by having the email agent exist in the codebase but being excluded from the orchestrator's dispatch map. The agent can classify emails and prepare response data, but the function that actually sends is never called.

**Implementation for NBI:** The outbound broker pattern already in Glen's AIOS design spec is correct. Strengthening it:

```
OUTBOUND BROKER RULES:
1. ALL external communication (email, Slack DM, Telegram, SMS) flows
   through outbound_broker.queue()
2. outbound_broker.send() is a SEPARATE function that:
   a. Checks trust_level for (action_type, contact_category)
   b. If Level 0: reject with log entry
   c. If Level 1: add to review queue, await Glen's approval
   d. If Level 2: execute, but ONLY for action_types explicitly
      whitelisted in config (not derived from trust score)
3. The review queue is a WorkSage table visible in the dashboard
4. Even internal Slack messages to Glen go through the broker
   (for audit trail), but with auto-approve for Level 1+
5. NEVER_SEND list: hardcoded in config, not in database.
   Contains: all client CEOs, all external contacts, any contact
   Glen adds. Overrides all trust levels. Cannot be modified by
   the AIOS, only by Glen directly editing the config file.
```

### Pattern 5: Goals File as Priority Spine

**Source:** Murchison ([GitHub](https://github.com/mimurchison/claude-chief-of-staff))

**What:** A structured file that the agent references for every triage and prioritisation decision. Not a vague "priorities" document but a machine-parseable specification of what matters most, what matters least, and what the agent must never do.

**Why this matters for Glen specifically:** Without a priority spine, the AIOS surfaces whatever signal is most available (the loudest email, the most recent Slack message) rather than what is most aligned with Glen's current objectives. Murchison's system uses goals.yaml constantly when scoring tasks, triaging email, and proposing meetings. The result: morning inbox processing dropped from 90 minutes to approximately 5 minutes.

**Implementation specification:**

```yaml
# goals.yaml -- machine-parseable priority spine
# Updated weekly by Glen; AIOS reads, never writes

quarter: Q3-2026
last_updated: 2026-06-28

strategic_priorities:
  - id: revenue_concentration
    description: "Reduce revenue concentration risk below 40% single client"
    weight: 10  # highest priority
    metrics: ["client_count", "revenue_distribution_gini"]

  - id: playsage_product
    description: "Ship PlaySage MVP for first 3 subscription customers"
    weight: 8
    metrics: ["feature_completion_pct", "pilot_signups"]

  - id: team_capacity
    description: "Build contractor bench to 4 active delivery people"
    weight: 6
    metrics: ["active_contractors", "bench_availability"]

active_clients:
  - name: "Couch Heroes"
    importance: 10
    contacts:
      - name: "Vardis"
        role: "CEO"
        never_auto_send: true
      - name: "Aris"
        role: "COO"
        never_auto_send: true
    active_engagements: ["work_plan_consolidation", "ai_strategy"]

  - name: "Lighthouse"
    importance: 8
    contacts:
      - name: "James"
        never_auto_send: true
      - name: "Justin"
        never_auto_send: true
    active_engagements: ["wonderland_analytics"]

triage_rules:
  always_p0:
    - "invoice or payment from active client"
    - "legal document requiring review"
    - "production system down"
  always_skip:
    - "newsletter or marketing email"
    - "social media notification"
    - "automated build notification (unless failure)"
  never_do:
    - "Send any message to a client contact without Glen's approval"
    - "Modify production database directly"
    - "Commit financial resources"
    - "Respond to recruitment outreach"

this_week:
  focus: "Couch Heroes work plan delivery"
  commitments:
    - "Send CH work plan v15 to Vardis by Friday"
    - "Review Lighthouse wireframe feedback"
  blocked_on:
    - "Waiting for Riley on Saybrook contract"
```

### Pattern 6: Self-Improving Skills with Evidence-Based Proposals

**Source:** Hermes Agent ([GitHub](https://github.com/NousResearch/hermes-agent)), Nate Herk ([3ms-framework.md](https://github.com/nateherkai/AIS-OS/blob/main/references/3ms-framework.md))

**What:** The system observes repeated patterns in its own execution and generates proposals for new automations. Proposals must cite specific session evidence and include a working implementation.

**Why this matters for Glen specifically:** Glen's requirement for daily automation proposals needs both Hermes's pattern detection (automatically notice repeated manual sequences) and Nate Herk's /level-up discipline (one shipped artefact per week, not an unbounded list of ideas).

**Implementation specification:**

```
DAILY PROPOSAL MECHANISM (runs at 22:00, after day's work):

STEP 1: PATTERN DETECTION (deterministic scan)
  Scan aios_actions log for last 7 days:
  - Repeated manual sequences (same 3+ step sequence run 3+ times)
  - Repeated classifications (same signal type classified the same way 10+ times)
  - Repeated context loads (same Brain module or bank loaded 5+ times in a week)

STEP 2: PROPOSAL GENERATION (LLM, Haiku)
  For each detected pattern:
    proposal = {
      pattern_id: hash(pattern),
      evidence: [list of specific session log entries citing the pattern],
      frequency: count of occurrences in last 7 days,
      proposed_automation: {
        type: 'skill' | 'rule' | 'scheduled_job',
        implementation: <working code or skill definition>,
        estimated_savings: <tokens/time per occurrence>,
      },
      risk_classification: 'LOW' | 'MEDIUM' | 'HIGH',
      -- LOW: read-only operation, no external effects
      -- MEDIUM: writes internal state (memory, tasks, classifications)
      -- HIGH: touches external systems (email, Slack, calendar)
    }

STEP 3: AUTO-APPLY OR QUEUE
  IF risk == 'LOW' AND frequency >= 5:
    Auto-apply through RHO apply-gate
    Log to weekly digest: "Auto-applied: {description}"
  ELIF risk == 'MEDIUM':
    Queue for Glen's weekly review (Monday morning harness digest)
  ELIF risk == 'HIGH':
    Queue for explicit Glen approval with full evidence

STEP 4: WEEKLY LEVEL-UP (Monday morning, per Nate Herk's cadence)
  Present top 3 proposals ranked by (frequency * estimated_savings)
  Glen picks ONE to ship this week
  System tracks: proposal -> implementation -> deployment -> measured outcome
```

### Pattern 7: Four Cs Dependency Ordering

**Source:** Nate Herk ([3ms-framework.md](https://github.com/nateherkai/AIS-OS/blob/main/references/3ms-framework.md))

**What:** Context -> Connections + Capabilities -> Cadence. Cadence (autonomous operation) comes LAST, only after workflows are proven manually. This is a dependency graph, not a feature list.

**Why this matters for Glen specifically:** Glen's Telegram incident violated this ordering by connecting a dangerous capability (message sending) before cadence was proven at a safe autonomy level. The corrective is: no automation of any workflow that has not been proven manually. The Bike Method provides the phased rollout: Training Wheels (manual with observation) -> Guided (runs with full review) -> Watched (autonomous with alerts) -> Hands-Off (independent).

**Implementation for NBI:**
- Phase 1 (Context): NBI Brain, goals.yaml, intelligence banks loaded. Agent can answer questions about Glen's business, clients, priorities. No external connections yet. Prove that classification and prioritisation are accurate through manual testing.
- Phase 2 (Connections + Capabilities): MCP integrations for Gmail, Calendar, Slack (read-only). Classification pipeline runs. Agent produces Daily Briefing. Glen reviews every classification for 2 weeks. Track accuracy.
- Phase 3 (Cadence -- Guided): Classification runs on schedule. Drafts produced automatically. Glen approves each draft. Trust levels accumulate. 10% of volume first, expand after 1 week of clean operation.
- Phase 4 (Cadence -- Watched): Graduated trust enables Level 1 autonomy for proven categories. Monitoring and anomaly alerts active. Any anomaly demotes to Guided.

### Pattern 8: Overnight Memory Compression ("Dream" Routine)

**Source:** Moritz Kremb ([YouTube](https://www.youtube.com/watch?v=ACRd0Ikg_KI)), Claudia/kbanc85 ([GitHub](https://github.com/kbanc85/claudia))

**What:** A nightly routine that compresses daily ephemeral memory into long-term persistent facts. Separates what happened today (ephemeral, detailed) from what the system knows (persistent, compressed). Claudia's implementation adds pattern detection across weeks and relationship health tracking.

**Why this matters for Glen specifically:** Without compression, tomorrow's session starts by loading today's raw session log (potentially thousands of lines). With compression, tomorrow's session loads a synthesised 50-line summary plus any new patterns detected. This directly addresses the 300k token effective context window constraint.

**Implementation for NBI:**
```
NIGHTLY DREAM ROUTINE (runs at 03:00, after decay/consolidation):

INPUT:
  - Today's session log (projects/nbi_dashboard/session_logs/YYYY-MM-DD_session.md)
  - Today's aios_actions (all recorded agent actions)
  - Today's Granola meeting notes (if any)
  - Today's intelligence extracts (if any)

OUTPUT:
  - daily_summary.md: 50-line structured summary of what happened, what was
    decided, what changed, what is pending
  - Updated long-term memory entries (new facts, updated importance scores)
  - Pattern alerts (if any cross-week patterns detected)

PROCESS (LLM, Haiku):
  1. Read all inputs
  2. Extract: decisions made, tasks completed, tasks pending, facts learned,
     commitments made, client interactions
  3. Compare against existing long-term memory for contradictions
  4. Compress into daily_summary.md (structured, not prose)
  5. Create/update long-term memory entries with source attribution
  6. Run pattern detection: compare this week's daily summaries against
     last 4 weeks for recurring themes

CONSTRAINTS:
  - daily_summary.md must be < 100 lines
  - Each memory entry must have source_session and source_timestamp
  - Contradictions flagged, not silently resolved
  - Run cost target: < $0.50 per night (Haiku)
```

---

## Gap Analysis

### Gap 1: Application-Level Error Self-Correction

**Current state:** Only Doneyli has infrastructure-level recovery (container restart, health monitoring, watchdog). No implementation studied has application-level error repair.

**What this means concretely:** If the triage engine classifies a client email as SKIP when it should have been P0, no system detects and corrects this. If a draft is generated from stale data (e.g., referencing a project that was cancelled last week), no system catches it. If memory consolidation creates a contradiction (merging two memories that say different things about the same fact), no system flags this for correction.

**Why this gap exists:** Application-level error correction requires a feedback loop from outcomes to inputs. Most implementations are unidirectional pipelines: input leads to classification leads to action. The "action" step does not report back whether the classification was correct. Building this feedback loop requires: (a) tracking which classifications led to which outcomes, (b) defining what a "wrong" outcome looks like, (c) updating rules/weights when wrong outcomes accumulate.

**What it would take to close:** A per-action outcome log where Glen (or a downstream system) records whether each classification/draft/action was correct, edited, or wrong. Weekly analysis of wrong outcomes identifies systematic errors. Systematic errors feed back into Tier 1 rules (if pattern is deterministic) or Tier 2 prompt modifications (if pattern requires judgement). Estimated implementation: 2-3 weeks for the tracking infrastructure, ongoing for the feedback analysis.

### Gap 2: Proactive Cross-System Correlation

**Current state:** Each system is single-domain. Doneyli processes email. Claudia tracks relationships. ceaksan classifies tasks. No implementation correlates signals across domains to surface compound insights.

**What this means concretely:** None of the systems studied would notice: "Client X's emails have become more formal in the last 2 weeks AND they haven't responded to the last 3 meeting invitations AND their Jira activity has dropped 60%." Each of these signals lives in a different system and is individually below the alert threshold, but together they indicate a relationship problem.

**Why this gap exists:** Cross-system correlation requires both: (a) normalised signal ingestion from multiple sources into a single classification engine, and (b) temporal pattern detection that compares signal combinations against baselines. Most implementations either ingest one source (email) or aggregate without correlating (Barbara Bermes's weekly digest reports from multiple sources but does not detect cross-source patterns).

**What it would take to close:** A unified signal store where all ingested data (email, calendar, Slack, Granola, Jira, pipeline) is normalised into a common format with entity linking (e.g., "this email is from Vardis who is CEO of Couch Heroes which is an active client"). Then a correlation engine that runs periodically (weekly) looking for multi-signal patterns. This is the hardest gap to close because entity linking across systems is non-trivial. Estimated implementation: 4-6 weeks for the signal store and entity linking, ongoing for pattern rule development.

### Gap 3: Graduated Autonomy with Mechanical Enforcement

**Current state:** Doneyli has the best trust model (graduated levels with measurable criteria) but it is enforcement-by-design within his private codebase. ceaksan has the best safety boundary (never sends) but it is binary, not graduated. Hermes has the best mechanical enforcement (hardline blocklist, container isolation, DM pairing) but applies it to command execution, not to business operations. No implementation combines graduated business trust (Doneyli) with mechanical enforcement (Hermes).

**Why this gap exists:** Business trust graduation requires domain-specific logic (what does "send an email" mean in this context? what contacts are protected?) that general-purpose security models do not capture. Mechanical enforcement frameworks like Hermes's focus on system-level operations (rm -rf, chmod 777) rather than business-level operations (send to client CEO, modify financial data).

**What it would take to close:** Extend the RHO Verification State Machine's gate pattern to cover business operations. Gate 6 (outbound broker): block unless trust level permits action for this action_type and contact_category. Gate 7 (data modification): block modifications to client or financial data unless verification evidence exists. These gates operate on business semantics, not just system commands.

### Gap 4: Autonomous Closed Loops that Verify Their Own Outputs

**Current state:** Most implementations produce outputs (classifications, drafts, briefings) but none verify whether those outputs were acted on or whether the actions succeeded. Claudia's commitment tracking comes closest: it tracks whether "I'll send that by Friday" was actually sent, and surfaces overdue commitments.

**Why this gap exists:** Verification requires closing the full loop: detect signal leads to classify leads to act leads to verify outcome leads to update classification accuracy. The "verify outcome" step is the missing link because it requires access to downstream systems (did the email get replied to? did the task get completed?) and temporal awareness (check again in 48 hours).

**What it would take to close:** Add outcome tracking to the classification pipeline. After creating a task or draft, schedule a verification check (e.g., "in 48 hours, check if this task is marked complete or this draft was sent"). Failed verifications feed back into the morning brief as "stale actions" and into the error correction pipeline as potential classification errors.

---

## Implementation Priority Order

**Priority 1: Goals file and Tier 1 rules engine.** These are the foundation everything else depends on. The goals file provides the priority spine that makes triage meaningful. The Tier 1 rules engine provides deterministic classification that makes overnight operation predictable. Without these, any LLM-based triage will surface the wrong things. Implementation effort: 1-2 weeks. Depends on: nothing.

**Priority 2: Overnight classification pipeline (ceaksan model).** Once goals and rules exist, schedule them to run overnight via Windows Task Scheduler. Collect Gmail, Calendar, Slack (read-only MCP). Classify using Tier 1 rules first, Tier 2 LLM second. Output as a structured Daily Briefing (not Obsidian, but a WorkSage page or markdown file). No send capability at all. Implementation effort: 2-3 weeks. Depends on: Priority 1 (rules engine, goals file).

**Priority 3: Trust levels and outbound broker.** Once classification is proven accurate (2 weeks of Glen reviewing classifications with 80%+ agreement), add the outbound broker with Level 0 default. Glen manually promotes action types to Level 1 after demonstrating accuracy. Implementation effort: 1-2 weeks. Depends on: Priority 2 (proven classification accuracy).

**Priority 4: Memory architecture with nightly decay/reflection.** Once the pipeline produces daily data, add the memory layer: SQLite with vector embeddings, nightly decay, consolidation, and Dream routine. This prevents the system from drowning in accumulated data. Implementation effort: 2-3 weeks. Depends on: Priority 2 (daily data production).

**Priority 5: Self-improving skills and weekly proposals.** Once the pipeline has been running for 4+ weeks, enough pattern data exists to detect repeated sequences. Add the proposal mechanism with weekly /level-up ritual. Implementation effort: 1-2 weeks. Depends on: Priority 4 (accumulated pattern data).

**Priority 6: Commitment tracking and relationship intelligence (Claudia model).** Layer relationship awareness onto the existing memory architecture. Detect commitments from natural language, track contact frequency baselines, surface cooling relationships. Implementation effort: 2-3 weeks. Depends on: Priority 4 (memory architecture).

**Priority 7: Cross-system correlation.** Once multiple data sources are flowing through the pipeline (email, calendar, Slack, Granola, WorkSage), add the unified signal store and entity linking for cross-source pattern detection. This is the longest-horizon item and the highest-value one. Implementation effort: 4-6 weeks. Depends on: Priorities 1-6 all operational.

---

## Composite Architecture Specification

If Glen's AIOS adopted the strongest verified pattern from each implementation, the result would be:

| Component | Source | Mechanism |
|-----------|--------|-----------|
| **Trust model** | Doneyli (graduated levels) + ceaksan (drafts-only default) | Three levels with measurable graduation criteria. Level 0 default. Never-send list for all external contacts until graduated. 90-day decay window on trust scores. |
| **Processing** | Doneyli (two-tier) + gAIOS (deterministic tools) | Tier 1: Python rules engine for deterministic classification (keywords, dates, sender matching, commitment regex, staleness detection). Tier 2: LLM for judgement calls. Deterministic tools for reliable execution regardless of LLM variability. |
| **Priority** | Murchison (goals.yaml) | Machine-parseable goals file updated weekly by Glen. Referenced by every triage decision. Contains: strategic priorities with weights, active clients with importance scores, triage rules (always-P0, always-skip, never-do), this-week focus and commitments. |
| **Memory** | Doneyli (three-layer with decay) + Claudia (attribution, vector search, rehearsal) + Kremb (nightly compression) | SQLite + vector embeddings. Three decay rates. Nightly consolidation (merge duplicates, detect contradictions). Dream routine compresses daily ephemeral notes into long-term facts. Hybrid retrieval: 50% vector + 25% importance + 10% recency + 15% full-text. Every fact attributed (who, when, confidence). Rehearsal effect strengthens accessed memories. |
| **Closed loops** | Claudia (commitment tracking) + Doneyli (observe-classify-act) | Commitment detection from natural language. Contact frequency baselines with cooling alerts. Morning brief with Must/Should/Could (Polasky). Classification pipeline with source linkage. Outcome tracking with verification checks. |
| **Self-improvement** | Hermes (skill auto-creation) + Nate Herk (/level-up weekly ritual) | Nightly pattern detection scan. Weekly proposal generation with evidence citations. One shipped artefact per week cadence. Auto-apply for LOW-risk through RHO gate. Queue for Glen on MEDIUM/HIGH. |
| **Scheduling** | Windows Task Scheduler (local jobs) + Claude Code Routines (cloud jobs) | Local for anything touching local files, databases, or local APIs. Cloud for jobs that need to run when machine is off. Wake-from-sleep enabled for critical overnight jobs. |
| **Safety** | ceaksan (never-sends as default) + Doneyli (earned trust graduation) + Hermes (mechanical enforcement, DM pairing) + Nate Herk (Intern Rule, Bike Method, autonomy spectrum) | Architectural separation between classify/draft and send. Outbound broker as single enforcement point. Hardcoded never-send list. Graduated trust with measurable criteria and 90-day decay. Bike Method phased rollout (Training Wheels -> Guided -> Watched -> Hands-Off). L2 autonomy default for all new capabilities. |
| **Portability** | Nate Herk (context files survive tool changes) + gAIOS (deterministic tools) | Goals file, priority rules, memory schema, and skill definitions stored as plain files (YAML, Markdown, SQLite). These survive LLM tool changes. Deterministic Python tools for operations that must not vary by model. |
| **Error handling** | Doneyli (infrastructure recovery) + NBI gap analysis (application-level correction) | Docker/PM2 restart on crash. Per-action outcome log. Weekly error pattern analysis. Systematic errors feed back into Tier 1 rules or Tier 2 prompts. Stale action detection via scheduled verification checks. |
| **Philosophy** | "Boring is beautiful. Workflows beat agents." (Nate Herk + gAIOS) | Deterministic where possible. LLM only where judgement required. Every automation proven manually before scheduling. Default to lowest autonomy level that works. Dismantle (Kill Switch) automations that consistently underperform. |

This composite represents the strongest available architecture for a one-person consultancy AIOS as of June 2026. Every component has been verified against a primary source. The implementation priority ordering ensures each layer builds on proven foundations.

---

## Sources Index

| Implementation | Primary Sources |
|----------------|----------------|
| Doneyli De Jesus | [Substack: AI Chief of Staff](https://doneyli.substack.com/p/i-built-an-ai-chief-of-staff-that), [Substack: Head of AI](https://doneyli.substack.com/p/i-hired-a-head-of-ai-to-run-my-agents), [Substack: 18 Security Holes](https://doneyli.substack.com/p/my-ai-agent-had-18-security-holes), [GitHub](https://github.com/doneyli) |
| Hermes Agent | [GitHub](https://github.com/NousResearch/hermes-agent), [Security Docs](https://hermes-agent.nousresearch.com/docs/user-guide/security), [Memory Docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory), [Releases](https://github.com/NousResearch/hermes-agent/releases) |
| Claudia / kbanc85 | [GitHub](https://github.com/kbanc85/claudia), [Dev.to article](https://dev.to/jonesrussell/claudia-an-ai-chief-of-staff-that-runs-on-claude-code-4p37), [skillsllm.com](https://skillsllm.com/skill/claudia) |
| ceaksan CoS | [GitHub](https://github.com/ceaksan/chief-of-staff), [Blog](https://ceaksan.com/en/chief-of-staff-local-ai-assistant) |
| Murchison CoS | [GitHub](https://github.com/mimurchison/claude-chief-of-staff), [DeepWiki](https://deepwiki.com/mimurchison/claude-chief-of-staff/) |
| gAIOS | [GitHub](https://github.com/alirezarezvani/gaios), [Medium (paywalled)](https://alirezarezvani.medium.com/i-built-an-ai-operating-system-for-claude-code-and-codex-boring-is-the-whole-point-8af210d9de00) |
| Nate Herk AIS-OS | [GitHub](https://github.com/nateherkai/AIS-OS), [3Ms Framework](https://github.com/nateherkai/AIS-OS/blob/main/references/3ms-framework.md), [nateherk.com](https://www.nateherk.com/) |
| Barbara Bermes | [Medium](https://bbinto.medium.com/building-my-own-ai-chief-of-staff-and-why-you-might-want-one-too-7e862a052a85), [GitHub](https://github.com/bbinto/bb-chiefofstaff) |
| Polasky CoS | [GitHub](https://github.com/jdpolasky/ai-chief-of-staff) |
| Moritz Kremb | [YouTube](https://www.youtube.com/watch?v=ACRd0Ikg_KI), [Threads summary](https://www.threads.com/@petergyang/post/DYM6iysGnmu/), [GitHub](https://github.com/moritzkremb) |
