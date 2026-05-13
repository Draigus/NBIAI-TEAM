# Couch Heroes Offsite - Glen's Working Document (Apr 27-30, 2026)

**For Glen's eyes only.** Speaking notes, watch-fors, decision criteria, standard responses. Use alongside `offsite_agenda_2026-04-27.md` and `offsite_pre_decisions_2026-04-27.md`.

---

## How to Use This Doc

- The agenda is the structure attendees see. This doc is what you use to drive the room.
- Each session has: the **opening line** to set tone, the **outcome you must leave with**, the **standard pushbacks** to expect and how to handle them, and **what to capture** before moving on.
- Watch-fors are the failure modes specific to this room. You know these people; this is your reminder so they don't slip past you mid-session.
- Standard responses give you a phrase-bank when energy is low or someone is grandstanding.
- "Move on" criteria are the green-light signal that tells you the room has done enough on this session.

---

## Session 1 (Day 1) - The Rules

**Opening line:**
> "Before anything: the rules. These are not aspirational. These are conditions of being in this room for the next three days. I'm going to read each one. After each, I want each of you to verbally agree. Silence does not count."

**The six rules:**
1. Verbal interaction from everybody.
2. Lean in. Active. Proactive. Thinking ahead.
3. Disagree. Must disagree.
4. Take breaks without announcing.
5. Everything happens in this room. Laptops for the room. Phones for breaks.
6. No "we'll figure that out later". Parking lot only.

**Watch-fors:**
- **Mustafa**, on dial-in due to visa, will default to silent observer. Force him in early. First verbal commitment from him.
- **David** has a tendency to defer to Robin on creative. Today specifically, art-design alignment is on the line; David's voice matters as much as Robin's.
- **Aris** is a "let's discuss offline" person by reflex. Re-state the rule when you hear it.
- **Vardis** will sometimes try to converge too quickly. The rules include "must disagree" specifically to slow this.
- **Lorenz** may feel the staff assessment day is exposing; reassure that quad review is leadership-only.

**Standard responses:**
- "Great point, can we take that to a one-on-one?" -> "No. In the room or not at all."
- "I'll think about it and come back" -> "If you can't decide now, name what evidence you need by end of day."
- Long monologue from any one person -> Hold a hand up. "Pause. I want to hear [other name] on this."

**Move on criteria:** Every attendee has verbally said "yes" to each of the six rules. Document who said yes to what.

---

## Session 2 (Day 1) - The Goal

**Opening line:**
> "Here's why we're in this room. We leave Day 3 with a roadmap manifest the leads can take, size, subtask, true up, and roll into JIRA. It covers features, gates, success factors, live services, GTM, pipelines, ownership, and our staff plan. Studio leadership - everyone in this room - is the delivery vehicle. We do not leave until we have it. If we slip, we extend the day. There is no homework."

**Then state the six pre-decisions verbatim from the headline list. Use this exact framing:**
> "Six decisions are made. If anyone disagrees with any of them, must disagree now or during the relevant session today or tomorrow. After tomorrow, these are locked. Here they are: [read the six]. Questions on what they mean, ask now. Questions on why, talk to me on a break or one-on-one. Right now, just hear them."

**Watch-fors:**
- **Mustafa** may push on Cross-play and Unified Account given tech load. Acknowledge: "this is heavy, the tech architecture session on Day 2 will scope it." Don't relitigate the decision.
- **Robin** may push on the Demo / Beta / EA decision because of his marketing instinct. "We agreed Founder's Pack carries the early-access value. Beta access is the perk."
- **Vardis** may want to add a seventh decision in the moment. Don't let that happen here. "Capture in parking lot, decide at offsite Wrap if it's still alive."

**Standard responses:**
- "Are you sure about [decision]?" -> "I am, and I'd rather you push at the relevant session today/tomorrow with evidence than agree silently now."
- "What if X changes?" -> "Then we update the decision in the open. Today we work from these positions."

**Move on criteria:** Each attendee has heard the six decisions. Each has had the chance to flag must-disagree-now if any decision is fundamentally unworkable. None has triggered a re-decision yet.

---

## Session 3 (Day 1) - Walk the Workbook

**Opening line:**
> "The artefact is the WorkSage workbook. 2,216 items across 7+AI projects. Game project alone is 1,194 items. _VALIDATION sheet has 264 flagged items - those are the explicit "decide together" pile. Most of today and tomorrow operates on the Game sheet. We open MASTER first to orient, then drop into Game."

**What to do in this session:**
- Project the MASTER sheet.
- Walk through the project structure visibly. Show people where their work lives.
- Show the classification fields (type, layer, confidence). Explain the framework in two sentences.
- Show the validation sheet flag breakdown (180 low-conf classifications, 65 missing assignees, 19 UK duplicates).
- Open the Game sheet, autofilter to confidence=low. 180 items. "These are what we work through during sessions 3 and 4 today."

**Watch-fors:**
- People will get lost in the volume. Repeat: "We are not reviewing every row. We are reviewing the flags and the placements. The leads will fill body after."
- Someone will ask about a feature outside the scope of the day. Capture in parking lot, move on.
- Someone will spot something they want to fix. Right answer is "make a note in the validation sheet, we'll batch-fix end of day, do not rabbit-hole now."

**Move on criteria:** Everyone knows where their work lives. The 180 low-confidence items are visible. The room understands what we're about to attack.

---

## Sessions 4-5 (Day 1) - Feature Sweep

**Opening line:**
> "We are going through Game Features and Game Systems. For each row that's flagged or that any of you wants to lift, we add: success factor in one line, tech owner, content owner, design owner, rough size S/M/L/XL, gate target. Two minutes per row max. If a row needs longer, it goes to needs-spec parking lot. We don't perfect; we get coverage."

**The discipline:**
- One person reads the row out loud.
- Owners self-claim within ten seconds.
- Glen captures success factor (one line).
- Sizing pinpoint - no "it depends" - if it depends, the size is L by default.
- Gate target: which of the eight columns does this go in.
- If any of these can't be agreed in two minutes - parking lot, move on.

**Watch-fors:**
- **Robin and David** will both want to be design owner for art-related features. Force the question: "Robin owns design intent. David owns visual language. Who owns the feature? One name."
- **Mustafa** is solo on tech for many systems. Acknowledge load. Some will go "Mustafa + tech lead TBC" - that's fine, just visible.
- The room will want to brainstorm new features. Resist. "Capture in 'new ideas' parking lot. Today is about what's already in the sheet."

**Standard responses:**
- "We need more time to think about this one" -> "Three options: put it in needs-spec, take a default and revisit Day 2, or default to L size and current gate placement. Pick one."
- "Is this a feature or a system?" -> "Read the type column. The classification is already done. If you disagree, that's a row to flag."

**Move on criteria:**
- Game Features (561 items): the flagged ones (~80-90 of them) all have owner triplets and gate targets. The rest stay at their classification with "TBD owner" and a deadline.
- Game Systems (162 items): all have tech owner; design and content owners where applicable.

---

## Session 5 (Day 1) - Gate Wall

**Opening line:**
> "Eight columns on the wall. Concept. Pre-prod. Early prod. Mid prod. Late prod. Alpha. Beta. Launch. Every feature we touched in the last two sessions goes on a sticky on the wall in its column. We're going to look at the wall together. If a column is empty or overstuffed, that's data. We'll fix tomorrow."

**Watch-fors:**
- The wall will look terrifyingly stuffed in the early columns and thin in late ones. Normal. Day 2 fixes.
- Someone will want to start moving stickies during placement. No - place first, evaluate after.

**Move on criteria:** Wall has every Day 1 feature on it. Photo taken before Day 2 starts.

---

## Session 6 (Day 1) - Wrap

**Opening line:**
> "Three things before we go to dinner. Parking lot review. Tomorrow's preview. Pulse on the rules."

**The pulse:**
> "Round the room. One sentence. How are you feeling about what we've done today, and how are you feeling about the rules. If you're not at 8/10 confidence, say what's at 6 or 7."

**Watch-fors:**
- A low-confidence response from someone is data. Don't reassure - ask what would move them to 8.

**Move on criteria:** Every attendee has spoken in the pulse. Parking lot has owners on every item. Tomorrow's three sessions are previewed.

---

## Day 2 - Gates, Live Services, GTM

### Session 1 (Day 2) - Gate Criteria

**Opening line:**
> "Most-leveraged hour of the offsite. We define what it takes to enter and exit each of the eight gates. Get this right and every estimate downstream has a yardstick. Get it wrong and we waste the rest of the year."

**Per gate, the four questions:**
1. **Entry:** What must be true for us to declare this gate is started?
2. **Exit:** What must be true for us to declare this gate is done and we move to next?
3. **Gatekeeper:** Who has the authority to make the call. Single name preferred. Pair if necessary. Never a committee.
4. **Evidence:** What deliverables / artefacts / metrics show the criteria are met?

**Watch-fors:**
- The group will want to over-engineer Concept and Pre-prod and rush Late Prod and Beta. Live services pillar requires Beta and Launch criteria to be tight. Push there.
- "Gate criteria as inspirational" is a failure mode. Criteria must be testable. "Vertical slice complete" needs a definition; "feels good" does not count.

**Standard responses:**
- "We can't define Beta criteria yet, the design will evolve" -> "We define them now and update them at the Mid-Prod-to-Late-Prod transition. Not having them is worse than having approximate ones."

**Move on criteria:** Each of the eight gates has all four questions answered. Captured on the wall.

### Session 2 (Day 2) - Re-walk the Wall

**Opening line:**
> "Now we have criteria. Walk the wall. Anywhere a feature is in a column where it doesn't actually meet the entry criteria, move it. We're going to be ruthless. The wall after this session is the first version of the roadmap."

**Watch-fors:**
- Resistance to moving a feature later is normal - it feels like demoting work. Keep the framing on "we're being honest about where it actually is."

**Move on criteria:** Wall reflects criteria. Photo. Roadmap-v0 captured.

### Session 3 (Day 2) - Live Services Missing

**Opening line:**
> "Live Service Features sheet has 79 items. We pre-decided F2P with cosmetic monetisation and closed beta. Now we figure out what's missing. Three questions."

**The three questions:**
1. **Rhythm post-launch:** Seasons? Events? Patches? At what cadence? Who owns it?
2. **Tooling pre-launch:** What live ops tooling has to exist before we go to closed beta (let alone launch)? List the gaps.
3. **Hooks at architecture stage:** Which Game Features and Systems need live service hooks built in at design time so we don't bolt them on later? List them now.

**Watch-fors:**
- This session reveals tech debt the room hasn't named. Capture every gap as a task with an owner. Don't fix in this session.

**Move on criteria:** Three questions answered. Gaps captured with owners. Live Service Features sheet items reviewed against the gaps.

### Session 4 (Day 2) - GTM Lane

**Opening line:**
> "GTM lane. We have four sub-decisions inside the pricing decision. Segments, positioning, demo strategy, partnership direction. We don't relitigate the F2P decision; we plan around it."

**The four sub-decisions:**
1. **Segments:** Confirm Explorer-primary / Socialiser-secondary / Achiever-tertiary / Killer-supported per vision doc, OR explicitly revise.
2. **Positioning:** Anti-positioning statement (what we are NOT), positioning vs Light No Fire, Pax Dei, Palia.
3. **Demo strategy:** Beta wave size and gating. Public demo beats (Steam Next Fest yes/no, GDC yes/no).
4. **Partnership direction:** First three targeted partnerships to pursue (one platform, one regional, one IP cross-promo as starter pattern).

**Watch-fors:**
- **Robin** will push on the segments because he has strong instincts here. Listen, but the vision doc has an explicit hierarchy. Revise only if there's evidence.
- **Vardis** will want to talk publishers. Reframe: "targeted capability deals, not full-game licensing."

**Move on criteria:** Four sub-decisions captured. Studio Business backlog updated.

### Session 5 (Day 2) - Community

**Opening line:**
> "Community plan. Three questions. How do we set it up. When do we start. Why at that time."

**The three questions:**
1. **How:** Channels, tone, cadence, content. Who runs it. Barb at 10 hrs/week is not enough at scale; what's the ramp.
2. **When:** Start now, or after vertical slice, or at first public demo, or at beta? Pick one.
3. **Why at that time:** What makes earlier or later wrong. This forces honesty - if we can't articulate why "now" is right, we don't know.

**Watch-fors:**
- The instinct in the room will be "start now to build buzz". The discipline is to test that instinct against what we have to show. A community with nothing to look at burns out.

**Move on criteria:** Three answers captured. Community Manager (Barb) ramp plan locked. Community story for Day 3 wrap.

### Session 6 (Day 2) - Studio-Down Goals Cascade

**Opening line:**
> "We pre-decided the studio's 12-month goal. Now we cascade. Every major feature gets a one-line 'dream of success'. Anyone in the studio reading that line should know what success looks like for that feature. This is what makes Day 1's success-factor work land."

**The discipline:**
- One feature at a time, top of importance ranking.
- "If this feature is great, what does the player do or feel that proves it?" -> One line.
- Bind back to the studio goal: which of the three 12-month outcomes does this feature most contribute to?

**Watch-fors:**
- People will write "fun" or "engaging" or "polished". Force concrete. "What action? What feeling? What evidence?"

**Move on criteria:** Top 20-30 features have dream-of-success lines. Pattern is established for the leads to fill the rest.

### Session 7 (Day 2) - Wrap

Same shape as Day 1 wrap. Pulse. Tomorrow's preview.

---

## Day 3 - Pipelines, RACI, Staff, Wrap

### Session 1 (Day 3) - Pipelines Mechanical

**Opening line:**
> "Today is the operating system of the studio. We map every pipeline. Steps, tools, handoffs, what triggers the next step. We are not designing tools today. We are documenting how the studio actually moves work."

**Pipelines to map (work through them in this order, hardest first):**
1. Art (concept -> in-engine asset) - hardest, longest pipeline
2. Code (feature spec -> merged code) - intersection-heavy
3. Design (idea -> GDD -> feature spec) - feeds both above
4. Audio (brief -> ship-ready audio) - often under-mapped
5. QA (feature ready -> playtested -> released) - Hannah's domain
6. Content (idea -> in-game content: quest, level, item)
7. Live ops (event idea -> live -> retro)
8. Build (commit -> playable build)
9. Marketing (moment -> asset -> publish)

**Watch-fors:**
- Art and Code will be where the room's actual pain is. Spend disproportionate time there.
- Hannah is solo QA - the QA pipeline will reveal the gap. That's data for the staff assessment session.
- "We just do it ad hoc" - that's the answer that needs to die today.

**Move on criteria:** Each pipeline has steps, tools, handoffs, triggers. Even if rough.

### Session 2 (Day 3) - RACI per Pipeline

**Opening line:**
> "Each pipeline gets a RACI. Responsible. Accountable. Consulted. Informed. We mark which consultations are mandatory and which are optional. This is the document that prevents 'who decides this' loops."

**Watch-fors:**
- People will want to be C on everything. Resist the everyone-consulted pattern. RACI dies if everyone is C.
- Multiple A on a single role is forbidden. One Accountable per stage.

**Move on criteria:** Every pipeline has a RACI. Mandatory vs optional consultation marked. Owner for the Confluence write-up assigned per pipeline.

### Session 3 (Day 3) - Maintenance Check

**Opening line:**
> "Maintenance overhead must be low or these documents die. For each pipeline RACI, three questions. How often does this need updating. Who updates it. What triggers an update."

**Standard answer to default to:** Review at gate transitions (so 8 reviews over the project lifetime, not weekly meetings).

**Move on criteria:** Each RACI has cadence + owner + trigger.

### Session 4 (Day 3) - Staff Assessment (C-Level Only)

**Leads excused for this session.** Make this explicit and unambiguous so it isn't perceived as exclusion.

**Opening line:**
> "C-level only. We have a quad review from earlier. We walk it against the new roadmap and ask: where does this put pressure on people. Where do we have strength we haven't used. Where are the gaps. We name 3-5 highest-pain-point people and a path forward. This is hard. Be direct."

**Watch-fors:**
- This room can be conflict-averse on personnel. The quad review framework helps - it's structured language. Use it.
- Lorenz will be cautious about anything that looks like a documented performance issue without process. Don't document plans here; document the names and the next step (e.g. "1:1 with Glen by week's end" or "performance plan kicked off via Riley HR").

**Standard responses:**
- "We can't decide that here without [HR process]" -> "We're not deciding the action; we're deciding the path. The action follows process."

**Move on criteria:** Quad review walked against new roadmap. 3-5 highest-pain-point people named. Path forward (not action) for each.

### Sessions 5-6 (Day 3) - Decisions Walkthrough + Confluence Rollout

**Opening line for 5:**
> "Read every decision we've made in three days. Confirm or revise. Capture owners and dates."

**Opening line for 6:**
> "Each pipeline RACI, each gate criterion, each studio-down goal cascade item: who writes the Confluence article and by when. Roadmap publication: who, when. We don't leave without these names."

**Watch-fors:**
- Volunteer-itis will not staff this. You'll need to assign. Don't hesitate.
- Aris owns Confluence-as-publication; Lorenz owns process-Confluence; Valeria owns production pipeline. Default ownership matrix.

**Move on criteria:** Every Confluence artifact has a named owner and a milestone. Roadmap publication owner and milestone named.

### Session 7 (Day 3) - Wrap

**Opening line:**
> "Each of you names one thing you commit to ship out of this offsite. One. Specific. By when. Then I name the top three risks I see coming out of the offsite. Then a final pulse. Photo. Done."

**Move on criteria:** Each attendee has stated a commitment. Three risks captured. Photo taken.

---

## Cross-Cutting Notes

### Energy management
- Days are long. Watch energy drop after lunch on each day.
- Mid-afternoon Day 2 is the nadir typically. Schedule the lighter session (Studio-Down Goals) there if you can flex.
- Day 3 staff assessment session is emotionally heavy. Schedule it before lunch, not at the end of the day.

### When the room is stuck
- Standard ladder: (a) restate the question, (b) ask each attendee individually for their answer in turn, (c) state the default and ask who objects, (d) write the answer on the wall and move on with "we revisit if we hit a contradiction."

### When someone is grandstanding
- Hold a hand. "Pause. Three sentences max from each of you on this." Forces concision.

### When you're personally stuck
- Step out. Walk. Come back. The rules apply to you too.

### Recording
- Granola transcripts every session. Glen has Granola access already.
- Whiteboard photos before any session ends.

### Decisions log location
- Pinned in the Slack #couch-heroes channel after each session, end-of-day Confluence article posted by Aris.

---

## Final Note Before Day 1

The biggest risk to this offsite is not content. It's drift, conflict-aversion, and "let's discuss offline". The rules exist to combat all three. Your job is to enforce them gently for the first hour and then ruthlessly thereafter.

If you walk out of Day 3 with a clean roadmap, gate criteria, pipeline RACIs, and a staff plan, the studio's next twelve months are operationally set. That is worth three exhausting days.
