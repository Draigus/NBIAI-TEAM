# Senior DevOps Engineer JD — Line-by-Line Critique

Companion to `Senior_DevOps_Engineer_JD.docx`. Created 2026-06-10.
For each line: what it is for, what response it is designed to provoke in the candidate, and what expectation it sets. Benchmarked against: Epic Games Senior DevOps Engineer (Online Game Services), OtherSide Entertainment Senior DevOps Engineer (UE5 required), Rushdown Studios DevOps/Infrastructure Engineer, plus the existing CH `DevOps_Engineer_JD.docx` it must sit alongside.

---

## Title: "Senior DevOps Engineer"

**Purpose:** Market-standard, searchable title. "Senior" places it in the senior IC band alongside the Senior Network Engineer JD: no people management requirement, but architecture ownership and mentoring expected.
**Response sought:** Engineers who want to own decisions, not just execute tickets.
**Resolved (Glen, 2026-06-10):** Both roles stand — the senior and the existing Development Operations Engineer coexist. As written, the senior owns architecture, standards, and live-ops readiness; the mid-level role executes within that, so the pair reads coherently. The mid JD's "Development Operations Engineer" H1 stays as is per Glen.

## About Couch Heroes (2 paragraphs, fixed boilerplate)

**Purpose:** Identical across all 30 CH JDs now. For a DevOps candidate the load-bearing phrases are "MMO", "Unreal Engine", "early production", "multi-year live-service roadmap", and "remote-first".
**Response sought:** Self-selection. "MMO + live-service" tells an infrastructure engineer this is a real distributed-systems job, not a build-machine babysitting job. "Early production" tells them they get to choose the stack rather than inherit someone's Jenkins archaeology — a major attractor for senior candidates.
**Expectation set:** Multi-country team means async collaboration and timezone-tolerant operational practices.

## About the Job — paragraph 1

> "A persistent MMO is an operations problem as much as it is a game... We need a Senior DevOps Engineer who can own the architecture of our build, deployment, and infrastructure systems and carry them from early production through to live operations."

**Purpose:** House pattern: discipline thesis, then "We need a [Role] who can own X". The thesis ("operations problem as much as a game") elevates the discipline the same way every other CH JD does for its own craft.
**Response sought:** "Own the architecture" and "carry them through to live operations" are the seniority markers. Candidates who have only maintained other people's pipelines should feel the stretch; candidates who have designed systems should feel seen.
**Benchmark:** Epic's OGS posting frames the role around site reliability for live services; this paragraph plants the same flag at the studio's stage. Aligned.

## About the Job — paragraph 2

> "You will report into the technology team and work closely with gameplay engineering, backend services, QA, and production. You will own the architectural decisions... and you will set the standards that keep those systems reliable as the studio scales."

**Purpose:** Reporting line ("the technology team" rather than "the CTO" — Glen's call, 2026-06-10, because the CTO seat is in search and the eventual structure under the new CTO is unknown) and the scope upgrade from the mid-level JD: the mid JD says "own build pipelines"; this says "own the architectural decisions behind" them and "set the standards". That distinction is the entire difference between the two roles, stated in one sentence.
**Response sought:** "Report into the technology team" is honest without being alarming; candidates at this level will ask about the CTO situation at interview, which is the right place for that conversation rather than the JD.
**Expectation set:** Cross-discipline service role. Four named collaborator groups tell the candidate who their internal customers are.
**Note:** This deliberately diverges from the existing DevOps Engineer and Senior Network Engineer JDs, which say "report to the CTO". If CH republishes those, aligning them to the same wording would be tidy, but it is not blocking.

## About the Job — paragraph 3

> "We are in early production... the operational practices that live service will demand do not exist yet. You will be making infrastructure decisions that determine how smoothly this game ships and how reliably it runs for years afterwards."

**Purpose:** House stage-setting paragraph. The added clause about operational practices not existing yet is honest and seniority-targeted: it is the difference between "help us run our systems" and "decide how our systems will be run".
**Response sought:** Function-builders lean in; engineers who want a mature platform to operate self-deselect. Both outcomes save interview time.

## Your Role — "Build Infrastructure and CI/CD" (4 bullets)

- *Bullet 1 (own CI/CD architecture, set standards):* The verb is "own", versus the mid JD's "build and maintain". Expectation: this person decides, documents, and is accountable. Interview probe: "describe a pipeline architecture decision you got wrong and how you found out."
- *Bullet 2 (UE build pipelines, distributed builds: Horde, Incredibuild):* Naming Horde and Incredibuild signals the JD was written by someone who knows Unreal at scale — OtherSide explicitly lists "TeamCity and Unreal Engine's Horde", Rushdown lists "FastBuild, Incredibuild". Candidates rate studios on this kind of specificity. Aligned with both benchmarks.
- *Bullet 3 (Perforce administration: depots, permissions, branching):* Lifted from the mid JD and kept here deliberately: at CH's size the senior cannot delegate Perforce away. Epic and OtherSide both require Perforce admin skills. Expectation: hands-on, not architecture-only.
- *Bullet 4 (automated testing in the pipeline):* "Catch breakage before it blocks the team" frames testing as a velocity feature, which is how senior DevOps people actually think about it.

## Your Role — "Infrastructure and Live Operations" (5 bullets)

This section is where the senior JD most visibly outgrows the mid JD, which titled the equivalent section "Infrastructure and Operations". The renaming to "Live Operations" is deliberate: the live-service roadmap is the reason the senior band exists.
- *Bullet 1 (cloud environments, IaC as default):* Matches the mid JD's scope but adds "everything as infrastructure-as-code" as a non-negotiable stance rather than a tool choice.
- *Bullet 2 (game server deployment architecture: orchestration, auto-scaling, regional, failover):* The MMO-specific infrastructure mandate. "Work with our network and backend engineers to make it real" stitches this JD to the Senior Network Engineer JD, which says "work with DevOps to define server deployment, scaling, and monitoring strategies" — the two JDs interlock, same as the narrative/audio pair. Candidates reading both see a studio that has designed its seams.
- *Bullet 3 (observability stack, "define what healthy looks like"):* Epic's posting requires "backend monitoring, observability, and the runbooks necessary to achieve a high level of site reliability" — directly aligned. "Before players notice" sets the reliability culture expectation.
- *Bullet 4 (incident response, on-call structure, runbooks, established during production):* **The most seniority-defining bullet in the JD.** Designing an on-call structure is organisational work, not just technical work. Establishing it before launch is the hard-won live-service lesson. Epic requires on-call participation; CH is asking this hire to design the rotation, which is the senior-versus-mid distinction. Interview probe: "walk me through an incident you ran from page to post-mortem."
- *Bullet 5 (security posture and cost governance):* New versus the mid JD, where cost optimisation is a nice-to-have. At senior level, secrets management, access control, and the cloud bill are ownership areas. "Scales with need rather than neglect" sets the FinOps expectation in plain language. Rushdown lists security and compliance implementation as a core duty. Aligned.

## Your Role — "Technical Leadership and Collaboration" (5 bullets)

- *Bullet 1 (set technical direction, document so the function can grow beyond one person):* This is the senior IC leadership clause, mirroring the Senior Network Engineer's "provide technical guidance" pattern. "Beyond one person" honestly signals they are likely the first dedicated senior infrastructure hire and are expected to build for succession, not indispensability.
- *Bullet 2 (mentor across the team, raise operational maturity):* No direct reports (consistent with the senior IC band — no "2+ years people management" must-have), but influence is mandatory. Filters out brilliant hermits.
- *Bullet 3 (responsive support for build failures):* Kept verbatim in spirit from the mid JD. Deliberate: seniority does not exempt anyone from unblocking the team. Prevents the "architect who won't touch tickets" failure mode.
- *Bullet 4 (backend deployment, QA test environments):* House cross-discipline bullet, merged from two mid-JD bullets to keep the section tight.
- *Bullet 5 (forecast infrastructure against milestones, playtests, alphas, stress tests):* New versus the mid JD. Capacity planning against player-facing events is senior work, and "stress tests" echoes Epic's "multiplayer load tests". Aligned.

## Must-Haves (8 bullets)

- *"6+ years... at least one shipped game or live-service product":* Senior band matches the Senior Network Engineer (6+) and sits above the mid DevOps JD (4+). "Or live-service product" deliberately keeps the funnel open to engineers from SaaS/platform backgrounds — games-only DevOps talent is scarce, and infrastructure skills transfer. Epic and OtherSide do not gate on games-only either. Aligned.
- *"Designing and owning CI/CD pipeline architecture... not just maintaining pipelines someone else built":* The clause after the comma is the screen. It gives reviewers a concrete rejection criterion and tells candidates exactly what war stories to bring.
- *"Cloud infrastructure architecture... including production workloads":* "Production" excludes lab-only experience. Standard senior screen.
- *"IaC... as the default way of working rather than an occasional practice":* Distinguishes engineers who did a Terraform project once from engineers who live in it.
- *"Docker, plus Kubernetes or an equivalent orchestrator in production":* Promoted from the mid JD's nice-to-haves to a must-have. Justified: the game server deployment architecture in Your Role is an orchestration problem, and Epic requires "ECS (or Kubernetes) and Docker" at the equivalent level. Aligned.
- *"Scripting in Python, Bash, or PowerShell":* Carried from the mid JD unchanged. Floor requirement; the differentiation is above, not here.
- *"Monitoring and observability: you have built or owned the stack that told a team something was wrong before users did":* Outcome-phrased rather than tool-phrased, so candidates with Prometheus, Datadog, or CloudWatch backgrounds all qualify. The tool list stays in nice-to-haves where it belongs.
- *"Service-oriented approach":* Verbatim from the mid JD. House signal that DevOps at CH is a support function with customers, not a gatekeeping function.

## Nice-to-Haves (6 bullets)

- *UE build pipelines, Horde/Incredibuild:* The single biggest "dream candidate" marker, correctly placed as nice-to-have: requiring UE build experience at must-have level (as OtherSide does) would cut the candidate pool hard, and a strong platform engineer can learn UE cooking faster than a UE build engineer can learn distributed systems. This is a deliberate divergence from OtherSide's posting, and the right one for CH's hiring market.
- *Perforce at studio scale:* Depth bonus on top of the Your Role responsibility. Large binary asset workflows named because that is the actual hard part.
- *Game server infrastructure (dedicated servers, matchmaking, regional):* Carried from the mid JD. The MMO dream profile.
- *Shipped/operated an MMO through live service:* House senior-role nice-to-have, identical placement to Senior Network Engineer and Game Design Lead. Consistent.
- *SRE practices (SLOs, error budgets, incident tooling, post-incident reviews):* Epic's posting requires "SLAs, SLIs, and SLOs" — for CH's stage, nice-to-have is the honest level, but naming the vocabulary attracts candidates from mature reliability cultures.
- *FinOps:* Pairs with the cost governance bullet in Your Role. Increasingly a board-level concern for live-service studios; signals CH thinks about margins.

## About You (6 bullets)

- *"You build systems that other people depend on":* Verbatim from the mid DevOps JD. Keeping it identical is deliberate: the two roles share a creed, differing in scope not values.
- *"You automate by default":* Verbatim from the mid JD, same reasoning.
- *"You design for the worst case, not the demo. Launch day, peak load, and the 3am outage":* Adapted from the Senior Network Engineer's "You think about systems under stress. You design for the worst-case scenario, not the demo." Ties the senior infrastructure pair together with a shared sensibility.
- *Ambiguity (early production):* House standard, verbatim from the mid JD.
- *"You raise the people around you. You would rather teach a team to operate well than be the only person who can fix things":* The bespoke line. Directly targets the most expensive senior DevOps failure mode: the indispensable hero who becomes a single point of failure. Interview calibration: ask how they made themselves unnecessary in their last role.
- *Remote autonomy:* House standard, verbatim.

## Footer

House standard, identical to all CH JDs. Same salary-transparency note as the narrative critique: Rushdown publishes $100k–$135k for a mid-level equivalent; senior game DevOps in the UK market typically lands £70k–£95k+. "Competitive" is house policy, but if this search runs slow, a band is the first lever to pull.

---

## Alignment Summary vs Market

| Dimension | CH JD | Market benchmark | Verdict |
|---|---|---|---|
| Title | Senior DevOps Engineer | Same at Epic, OtherSide | Aligned (mid JD's H1 is the outlier) |
| Seniority bar | 6+ yrs, 1 shipped game/live service | Epic/OtherSide senior, unspecified years | Aligned, house-consistent |
| CI/CD architecture ownership | Explicit must-have | Epic "develop and maintain CI/CD infrastructure" | Slightly stronger than benchmark |
| UE/Horde/Incredibuild | Named, nice-to-have | OtherSide requires UE5; Rushdown lists Incredibuild | Deliberately softer — wider funnel, right for CH market |
| Perforce admin | Responsibility + depth nice-to-have | Epic and OtherSide require it | Aligned |
| K8s/orchestration | Must-have | Epic "ECS (or Kubernetes)" solid experience | Aligned |
| Observability/SLOs/on-call | Role owns design; SRE vocab nice-to-have | Epic requires runbooks, SLOs, on-call | Aligned, adapted to studio stage |
| Security + cost governance | Explicit ownership | Rushdown lists security/compliance | Aligned |
| Mentoring/technical leadership | Explicit section | Benchmarks mostly silent | Stronger than benchmark |
| Salary transparency | "Competitive" | Rushdown publishes band | Below benchmark, house policy |

**Open items:** none. Glen confirmed 2026-06-10: both DevOps roles coexist, the mid JD's title stays as is, and this JD reports into the technology team rather than the vacant CTO seat.

Sources: [Epic Games Senior DevOps Engineer, OGS](https://startup.jobs/senior-devops-engineer-ogs-epic-games-3268677), [OtherSide Entertainment Senior DevOps Engineer (UE5 required)](https://careers.otherside-e.com/jobs/459213-senior-devops-engineer-games-ue5-required), [Rushdown Studios DevOps Engineer, Built In](https://builtin.com/job/game-engineer-infrastructure-and-devops/6985011), [JetBrains: Game DevOps build pipelines](https://www.jetbrains.com/guide/gamedev/links/game-devops-elevating-your-unity-and-unreal-build-pipelines-with-teamcity/)
