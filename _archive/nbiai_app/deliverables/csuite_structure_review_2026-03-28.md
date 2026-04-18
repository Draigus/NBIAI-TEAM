# C-Suite Cross-Functional Review: 33-Role Company Structure

**Prepared by:** CEO Agent (consolidating CFO, COO, CTO, VP Product perspectives)
**Date:** 28 March 2026
**Classification:** Board-level -- for Glen Pryer

---

## What Was Reviewed

The entire 33-role AI company structure built during this session was reviewed by four C-suite perspectives:
- **CFO:** Financial sustainability, token cost, cost-benefit by department
- **COO:** Operational feasibility, span of control, coordination overhead, overlaps
- **CTO:** Engineering sizing, knowledge architecture, technical gaps
- **VP Product:** Client-role mapping, Playsage readiness, overlap analysis

---

## Where All Four Agree

### 1. The 33-role structure is a capability map, not a staffing plan

Every reviewer independently concluded the same thing: 33 roles should NOT all be active simultaneously. The structure represents what NBI can do, not what NBI should run at all times. The COO put it best: "The structure is a menu, not a mandate."

### 2. Phased activation is essential

All four recommend activating in phases based on actual work demand. Running 33 agents simultaneously wastes tokens and, more critically, creates a review bottleneck on Glen.

### 3. Token cost is not the constraint -- Glen's attention is

CFO projects $404/month at moderate usage for all 33 agents. That is less than one day of a human consultant's billing. The real constraint is that every agent output needs Glen's review before going external. 33 agents generating work simultaneously would drown Glen.

### 4. Role definitions should be kept even when dormant

Building the role definitions was valuable. They cost nothing when dormant. They represent institutional knowledge about how NBI scales. The investment is the structure itself, not the activation.

---

## Where They Disagree

### Phase 1 Size: CFO says 10, COO says 6

| CFO Phase 1 (10 roles) | COO Phase 1 (6 roles) |
|---|---|
| CEO, COO, CFO, CTO, Producer, Data Analyst, Senior Engineer, CMO, Content Marketer, General Counsel | CEO, COO, Producer, Gaming Practice Lead, Game Economy Consultant, CFO |

**The disagreement:** The CFO includes engineering (CTO + Senior Engineer), marketing (CMO + Content Marketer), and legal (GC). The COO strips it to the revenue-generating core: consulting + operations + finance.

**CEO assessment:** The COO's Phase 1 is closer to right. NBI's immediate revenue comes from consulting, not engineering or marketing. However, the CFO is right that the CMO + Content Marketer are needed soon because the case study gap is NBI's biggest credibility problem and case studies do not require Glen's attention to produce. The GC can wait unless the NSI wind-down or PlaySage trademark has an imminent timeline.

**Recommended Phase 1: 8 roles.** CEO, COO, CFO, Producer, Gaming Practice Lead, Game Economy Consultant, CMO, Content Marketer.

### Opus Tier Assignments: CFO challenges three

The CFO flags Gaming Practice Lead, General Counsel, and VP Engineering as potentially over-tiered at Opus.

**CTO's counter on VP Engineering:** "If Playsage runs multiple parallel workstreams, VP Engineering becomes essential." Valid, but that is a future state.

**CEO assessment on each:**

| Role | CFO Says | CEO Assessment |
|---|---|---|
| Gaming Practice Lead | Downgrade to Sonnet | **Disagree.** This role IS the business. It synthesises across four consulting domains and reviews all client deliverables. Sonnet cannot do cross-domain synthesis at Glen's quality level. Keep Opus |
| General Counsel | Downgrade to Sonnet | **Partially agree.** Day-to-day drafting can be Sonnet. Complex risk assessments and investment documentation (the $10M raise) need Opus reasoning. Keep Opus but note it will be intermittently active |
| VP Engineering | Downgrade to Sonnet | **Agree for now.** With 4 engineers and sequential projects, the CTO can manage directly. VP Engineering at Sonnet as a team lead, not a strategic tier. Revisit when engineering scales |

### CTO Depth Concern: 4 layers to code

COO and CTO both flag that the chain CEO > CTO > VP Engineering > Engineers is too deep for NBI's current size.

**CEO assessment:** Agree. For Phase 1, CTO manages engineers directly. VP Engineering activates when engineering workload justifies a separate management layer (Playsage parallel workstreams).

---

## Specific Risks and Boundaries Identified

### Overlapping Functions (3 identified, all manageable)

| Overlap | Assessment | Resolution |
|---|---|---|
| Producer vs Production Consultant | Sharp. Both touch "production" but for different audiences | Producer tracks NBI's internal delivery. Production Consultant advises clients on their production processes. Document boundary explicitly |
| Gaming Practice Lead vs VP Product on Playsage | Dependency, not duplication | Practice Lead submits product signals. VP Product decides roadmap. Formalise the handoff workflow |
| Three-way research (Market Researcher, VP Product, Gaming Practice Lead) | Risk of conflicting intelligence | Scope boundaries already documented but must be enforced: Market Researcher = market sizing/trends, VP Product = product competitive analysis, Practice Lead = consulting market/client needs |

### Knowledge Architecture Risk (CTO)

33 roles loading Tier 1 knowledge multiplies every byte by 33 in token spend. The CTO recommends hard limits:
- Tier 1: max 3,000 tokens total
- Tier 2: max 5,000 tokens per role
- Tier 3: max 5,000 tokens per project
- Total loaded context per agent: under 15,000 tokens

**CEO assessment:** Sensible. This should be a tracked metric. Add to the CTO's responsibilities.

### Tech Writer Dual-Reporting (VP Product)

Tech Writer reports to VP Product but General Counsel commissions legal documentation. VP Product recommends an 80/20 capacity split formalised as a service-level agreement.

**CEO assessment:** Adopt Option 3. Formalise the split. If legal documentation volume grows beyond 20%, revisit.

### Missing Security Focus (CTO)

No dedicated Security Engineer role. Security currently split between CTO (architecture) and QA (testing). The SalarySage API key incident is the canonical failure.

**CEO assessment:** Do not create a new role. Add explicit security review responsibilities and a checklist to QA Lead's Tier 2 knowledge. The security policy already exists; QA needs to operationalise it.

### Playsage Cascade Engine (VP Product + CTO)

The Cascade Engine (Playsage's cross-module intelligence layer) cannot be built with only 2 engineers working on modules. Needs a dedicated third engineer when Playsage development begins.

**CEO assessment:** Noted. Flag for when Playsage build starts. Do not create the role now.

---

## Consolidated Recommendation to Glen

### The Structure

**Keep all 33 role definitions.** They are an asset that represents how NBI scales. They cost nothing when dormant.

### The Activation Plan

| Phase | Roles | Trigger | Monthly Token Cost |
|---|---|---|---|
| Phase 1: Core Revenue | CEO, COO, CFO, Producer, Gaming Practice Lead, Game Economy Consultant, CMO, Content Marketer | Now | ~$160 |
| Phase 2: Software Build | CTO, VP Product, Senior Engineer, QA Lead, Technical Writer, UI/UX Lead | Playsage development starts | ~$280 |
| Phase 3: Growth | VP Engineering, Engineer, Data Analyst, Market Researcher, Live Ops Consultant | Revenue exceeds £1M or parallel workstreams needed | ~$350 |
| Phase 4: On Demand | All remaining roles (Legal specialists, Production Consultant, Studio Ops Consultant, Data Engineer, DevOps, QA Engineer, UI/UX Designer, Brand Manager, Demand Gen, Head of People) | Specific work packages that cannot be absorbed by active roles | Up to ~$404 |

### Tier Adjustments

| Role | Current | Recommended | Reasoning |
|---|---|---|---|
| VP Engineering | Opus | Sonnet (when activated) | CTO can manage engineers directly at current scale |
| All others | As defined | No change | CFO's other downgrade suggestions (Gaming Practice Lead, GC) were contested and the CEO sided with keeping Opus for those roles |

### Immediate Actions

| Action | Owner |
|---|---|
| Document Producer vs Production Consultant boundary | COO + Gaming Practice Lead |
| Formalise Gaming Practice Lead to VP Product signal handoff | VP Product + Gaming Practice Lead |
| Set knowledge file token budgets and add to CTO monitoring | CTO |
| Formalise Tech Writer 80/20 capacity split | VP Product + General Counsel |
| Add security review checklist to QA Lead Tier 2 knowledge | CTO + QA Lead |
| Downgrade VP Engineering from Opus to Sonnet in role files | Head of People |

### What Changed From Before the Review

Before this C-suite review, the CEO would have presented Glen with "33 roles, all built, ready to go." After the review:

1. **Phased activation** replaces "everyone on at once" -- saves tokens and Glen's attention
2. **VP Engineering downgraded** from Opus to Sonnet based on CFO cost challenge and CTO/COO depth concerns
3. **Three overlap boundaries** identified and documented that would have caused confusion
4. **Knowledge token budgets** recommended to prevent Tier 1 bloat as the company grows
5. **Tech Writer capacity split** formalised before it becomes a conflict
6. **Cascade Engine staffing gap** flagged early for when Playsage build begins

**This is the difference that cross-functional review makes.** Six specific improvements that would not have surfaced from a single perspective.

---

*Consolidated by CEO Agent from CFO, COO, CTO, and VP Product reviews. 28 March 2026.*
