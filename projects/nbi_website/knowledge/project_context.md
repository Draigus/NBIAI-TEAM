# NBI Website Redesign — Project Context (Tier 3 Knowledge)

> This file is the deep knowledge base for any agent working on the NBI website redesign. It contains the full current site assessment, prototype details, brand decisions, deployment options, and all open decisions.

**Source of truth:** NBI_Brain.md Section 2.9 (Brand and Website), Section 2.12 (Open Items)
**Last updated:** 2026-03-28

---

## Current Site Assessment

**URL:** nbi-consulting.com
**Platform:** Framer
**Overall score:** 4.8/10 (assessed February 2026, Claude Chat "About NBI" project)

### Scores by Area

| Area | Score | Notes |
|---|---|---|
| Social proof | 7/10 | Blizzard, Xbox, NASA logos and exec-level testimonials. This is the site's strongest element |
| Visual design | 5-6/10 | Clean but template-feeling; no distinctive identity |
| Navigation | 5-6/10 | Simple but lacks depth |
| Hero section | 3/10 | Loads as near-empty dark screen due to animation timing issue |
| Services content | 3/10 | Three one-sentence descriptions — no depth, no differentiation |
| Differentiation | 3/10 | Behavioural science and consulting differentiation completely invisible |
| Conversion | 3/10 | One-dimensional: every button says "Get Started" leading to the same basic form |

### Specific Identified Issues
1. Hero section animation timing causes near-empty load — looks broken on first visit
2. Equal weight given to three service areas dilutes gaming-first message
3. Organisational health and gaming presented as co-equal — confuses both audiences
4. Does not reflect the actual business (gaming drives all revenue)
5. Client carousel missing 4 active clients: Lighthouse Studios, Sarge Universe, Couch Heroes, Goals Studio
6. Conversion strategy one-dimensional: "Get Started" → single basic form
7. Content is extremely thin — looks like a placeholder, not a professional firm's site

---

## The HTML/CSS Prototype

Built in the Claude Chat "About NBI" project (February 2026). The prototype is the agreed design direction and should not be discarded or significantly redesigned.

### Files (10 total)

| File | Description |
|---|---|
| index.html | Homepage |
| services/production-roadmap.html | Production and Roadmap Planning service page |
| services/go-to-market.html | Go-to-Market Strategy service page |
| services/agile-for-studios.html | Agile for Game Studios service page |
| services/player-targeting.html | Player Targeting and Segmentation service page |
| services/investor-readiness.html | Investor Readiness and Data Rooms service page |
| services/studio-health.html | Studio Health and Team Performance (Tom's HC practice, reframed) |
| about.html | About page |
| contact.html | Contact page |
| styles.css | Shared stylesheet |

**Important note:** These files were built inside Claude Chat and may not have been saved to Glen's local machine or OneDrive. If the files cannot be located, they may need to be retrieved from the Claude Chat "About NBI" project history or rebuilt from scratch using the described design direction.

### Design Specification

**Typography:**
- Primary: Orbitron (headings — gaming-recognisable geometric typeface)
- Monospace: JetBrains Mono (technical/code elements)
- Body: Outfit (clean, readable, modern)

**Colours:**
- Background: dark (near-black)
- Accents: electric blue
- Glen confirmed: hates orange, likes electric blue. Do not change this.

**Visual elements:**
- Cinematic gaming-setup hero image
- SVG icons
- Grid patterns
- Scan line texture overlay
- Noise texture overlay

**Voice and copy direction:**
- Studio-native language throughout: "ship", "roadmap", "sprint", "greenlight", "go gold"
- Homepage leads with studio pain points, not what NBI is
- No consultant-speak ("leverage", "synergise", "optimise your workflow")
- Gaming culture is the register; corporate management language is banned

**Homepage structure:**
- Hero: leads with the problems studios face, not NBI's credentials
- Social proof: logos and testimonials (Blizzard, Xbox, NASA, executive testimonials from Paul Sams, J Allen Brack, Justin Logan)
- Service problem-framing: each service entry names the problem it solves
- CTA: Book a Call / Contact (not "Get Started")

---

## Service Pages — What Each Covers

The six service pages were named after real problems, not generic service categories. This is intentional and should be preserved.

### Production and Roadmap Planning
Realistic milestone-based roadmaps, pipeline audits, bottleneck identification, sprint cadence design, stakeholder reporting. Target client pain: "We keep missing milestones and don't know why."

### Go-to-Market Strategy
Platform strategy, launch timing, competitive positioning, community and marketing alignment. Target pain: "We built a game but don't know how to take it to market."

### Agile for Game Studios
Structured Agile implementation for studios. Communication plans, gate reviews, sprint design. Target pain: "We're chaotic; nothing ships on time."

### Player Targeting and Segmentation
Player segmentation, behavioural profiling, audience definition. Used for new titles and live service optimisation. Target pain: "We don't know who is actually playing our game."

### Investor Readiness and Data Rooms
Pitch materials, financial narrative, studio positioning for investors. Target pain: "We need to raise money but don't know how to present ourselves."

### Studio Health and Team Performance
Tom Rieger's human capital / organisational health practice, reframed in gaming language. Addresses team dynamics, organisational barriers, and performance culture in studios. Target pain: "Our team is broken and it's killing the game."

**Critical note on this page:** Tom's practice uses behavioural science and organisational research frameworks (Gallup heritage). The language on this page must be studio-native, not corporate HR language. Gaming studios are anti-corporate. Words like "organisational health assessment" and "behavioural mapping" need to be translated into language like "find out what's actually slowing your team down." Glen has specifically flagged this as a cultural fit concern with Tom's default approach.

---

## Brand State and Rename Decision

### Current Brand
- Trading names: NBI Consulting / NBI Gaming / NBI Analytics
- UK legal entity: NBI Analytics Ltd (Glen's entity)
- US entity: National Business Innovations, LLC (Tom's entity)
- Assessment: the name carries corporate/analytics connotations that are wrong for a gaming-first company

### Proposed Rename: PlaySage (or Playsage)
The proposed new trading name for the whole business. Note: "Playsage" is also the name of the software product (the gaming intelligence SaaS platform). Whether the company and the product share this name or diverge is an unresolved decision.

**Checks required before committing to the name:**
1. Domain availability: playsage.com
2. USPTO trademark search (Class 35 and 41)
3. UK IPO trademark search
4. EUIPO trademark search
5. Social handle availability: LinkedIn, X (Twitter), Instagram

**Legal check required:** UK immigration solicitor must confirm whether registering a new trading name for NBI Analytics Ltd requires Home Office notification or affects the sponsor licence. Also affects: existing contracts, banking, insurance, HMRC, and Companies House filings.

**Status:** None of these checks have been done as of 28 March 2026.

### Impact on Website
If the rename proceeds before launch: all copy, domain, metadata, and social links need to reflect PlaySage. If the site is deployed before the rename is finalised, it goes live under nbi-consulting.com with current brand, then migrated. Glen needs to decide whether to wait for the rename or deploy immediately.

---

## Deployment Decision

Two options are on the table. No decision has been made.

### Option A: Netlify or Vercel Direct Hosting
Deploy the 10 HTML/CSS files directly to Netlify or Vercel as a static site.

**Pros:**
- Fast to deploy — files are already built
- No recreation work needed
- Free tier available on both platforms
- Version control via Git
- Easy to update with code edits

**Cons:**
- Not in Framer, so Framer's visual editor cannot be used for future edits
- Any future content updates require editing HTML directly or through Claude Code

### Option B: Recreate in Framer
Use the HTML/CSS prototype as a visual blueprint and recreate the site inside Framer, matching the design direction.

**Pros:**
- Stays on the same platform as the existing site (less migration friction)
- Framer's visual editor enables non-technical content updates
- Consistent with existing Framer workflow Glen is familiar with

**Cons:**
- Significant recreation work — the prototype does not import directly into Framer
- Risk of design drift during recreation
- Slower to get to a live site

**Recommendation note:** Option A (Netlify/Vercel) is faster and lower risk for getting a live site. Option B preserves editorial flexibility but at significant time cost. Glen should decide based on how often he expects to make content edits without technical help.

---

## Client Carousel — Missing Clients

The current site carousel shows past/historical clients. Four active clients are missing and must be added.

### Clients to Add
1. Lighthouse Studios
2. Sarge Universe
3. Couch Heroes
4. Goals Studio

### Current Carousel (confirmed for public use, no NDAs blocking)
Xbox, Sega, 343 Industries, Mojang Studios, Activision, Electronic Arts (EA), Jagex, Google, Microsoft, NASA, OSHA, U.S. Department of Labor, Employee Benefits Security Administration, Automation Anywhere, AMP, MSHA (Mine Safety and Health Administration).

**Note:** Client consent for logo use on the public site should be confirmed for the 4 new additions before going live.

---

## Content Gaps for Future Phases

These are not blocking launch but should be planned for sprint 2.

### Team Bios
No bios exist on the site. To be sourced from LinkedIn profiles for Glen Pryer and Tom Rieger at minimum. Other team members as appropriate.

### Case Studies
Not built. Identified as a priority content gap. Glen to lead. Case studies would significantly strengthen the site's credibility given NBI's delivery track record across Blizzard, Xbox, Jagex, EA, Lighthouse, Couch Heroes.

### Outcome Metrics
NBI has a stated 200+ successful projects, 100+ clients claim. Supporting outcome metrics (e.g. "reduced milestone slippage by X%") have not been documented. This is a gap to address for both the website and client pitches.

---

## Approved Testimonials (for Use on Site)

**Paul Sams — COO, Blizzard Entertainment**
"NBI has an exceptional ability to blend deep industry expertise with actionable insights that drive real results. Their strategic guidance helped us navigate complex challenges, optimise our workflows, and ultimately deliver stronger, more engaging experiences for our players."

**J Allen Brack — President, Blizzard Entertainment**
"On behalf of all of Blizzard, I wanted to thank you for your continued partnership. Your desire to embrace Blizzard's uniqueness and work to truly understand the quirky world of passionate video game developers. Greatly appreciate you and your team."

**Justin Logan — Program Manager, Xbox**
"NBI delivered exceptional insights for Halo, Minecraft and the Xbox platform, helping us achieve breakthrough moments that significantly shaped our content strategy and player experience. Their expertise proved invaluable."

All three are confirmed approved for public use.

---

## Business and Brand Decisions Already Made

These are locked. Do not re-open unless Glen explicitly requests it.

1. One company, two practice areas (Gaming and Human Capital). Not two separate companies or websites.
2. Gaming leads. Human Capital is secondary.
3. Tom is aligned with the gaming-first direction.
4. Dark theme with electric blue accents. No orange.
5. Studio-native language throughout.
6. Tom's HC practice framed as "Studio Health and Team Performance" in gaming language.
7. Primary CTA is Book a Call / Contact.
8. Both lead generation and credibility are site goals (not one or the other).

---

## Open Decisions Requiring Glen's Input

1. **Hosting decision:** Netlify/Vercel vs Framer recreation
2. **Brand rename:** Proceed with PlaySage? When? Before or after site launch?
3. **Deploy timing:** Launch now under nbi-consulting.com, or wait for rename?
4. **Client logo consent:** Confirm Lighthouse, Sarge Universe, Couch Heroes, Goals Studio are happy to appear
5. **Team bio inclusion:** Which team members appear on the About page?
6. **LinkedIn activation:** Not in scope for the website but should be decided in parallel

---

## Related Projects

- **Playsage (product):** If NBI renames to PlaySage, the product and company may share a name. This needs an explicit decision before trademark filings. See projects/playsage.
- **NBI brand rename:** Tracked in NBI_Brain.md Section 2.12. Trademark and domain checks are prerequisite to any public deployment under the new name.
