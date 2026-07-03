<!--
DRAFT for Glen Pryer's approval. Do not send, email, or share.
Primary source: CH_Performance_Reviews.html (Glen-iterated interactive review tool, last modified 2026-07-02), section p-m (Mustafa Sibai), lines 295-394.
Source path: C:\Users\gpbea\AppData\Local\Temp\claude\d--OneDrive-Claude-code-NBIAI-TEAM\40c1ea42-9d1b-42fe-b98e-5b883d89f8ae\scratchpad\CH_Performance_Reviews.html
Instructions recovered from docs/HANDOFF.md at git commit 3af81d2 (1 July 2026).
Supporting context: intelligence/banks/client_couch_heroes.md, brain/clients_detailed.md.
Every evidence item below names its original source (person, channel or meeting, date) as recorded in the review tool. Verbatim quotes are preserved exactly as captured.
-->

# Performance Review: Mustafa Sibai

**DRAFT. Prepared for Glen Pryer's review and approval. Not for distribution.**

| | |
|---|---|
| **Role** | Head of Engineering |
| **Studio** | Couch Heroes (CH Game Development UK Ltd) |
| **Reviewer** | Glen Pryer, fractional CPO (NBI) |
| **Review date** | [GAP: needs Glen input. Formal review date and the review period this document covers.] |
| **Status** | Trending up. April 2026 intervention was the turning point. Persistent deadline concerns. |

Assessments are written in the third person. Each evidence item names its source. The raw verbatim quote is preserved beneath each assessment for traceability. Ratings are 1 to 5 per competency and are for Glen to assign.

---

## 1. Craft Skill

**Rating:** [GAP: needs Glen input, 1 to 5 rating]

Mustafa Sibai demonstrates deep technical competence across software engineering and infrastructure. He is the architect of Couch Heroes' server infrastructure, VPN system, CI/CD pipelines, and build toolchain. Following the Perforce migration build break (late 2025), he diagnosed root causes and designed the remediation across nine concurrent infrastructure workstreams. He was capable of diagnosing VPN issues (Oman blocking WireGuard traffic) remotely while in transit (29 May 2026).

Valeria Trofimova's most recent assessment confirmed strong technical estimation capability. Peer feedback (David's 360 round, May 2026) rated Mustafa 4/5. The gap is not in technical competence but in the breadth of responsibility: Mustafa simultaneously functions as Head of Engineering, de facto IT administrator, infrastructure architect, DevOps lead, and contributing coder, creating unsustainable single-point-of-failure risk.

### Evidence

1. **Mustafa, #production-council, 26 Apr 2026.** Mustafa publicly acknowledged full responsibility for build instability since the start of 2026, identifying it as the worst state since version 0.10. He accompanied this admission with a structured remediation plan listing nine concurrent infrastructure projects, demonstrating both diagnostic depth and candid ownership of the failure.
   > Verbatim: "Since the start of the year, the build has been in the worst state it's been since 0.10. This is entirely my fault"

2. **Valeria Trofimova, #production-team, 28 Jun 2026.** Production assessment confirmed Mustafa has demonstrated strong capability in leading in-depth feature discussions with developers and guiding them towards accurate estimations, representing a marked improvement in his technical leadership contribution.
   > Verbatim: "proved himself to be really capable of in-depth feature discussions with the devs and to guide them towards good estimations"

3. **Glen, Studio Leadership Sync, 25 Jun 2026.** Leadership assessment at the 25 June sync acknowledged that Mustafa is not suited to the full CTO role but recognised significant improvement in his craft contribution and technical leadership since the April intervention.
   > Verbatim: "He's never going to be your CTO. But Jesus Christ is he improved"

4. **Mustafa, Leadership Expectations meeting.** When directly asked whether he was equipped for the full CTO role, Mustafa candidly acknowledged he was not, stating he had assumed he could learn on the job but recognised there was no senior technical reference to learn from. This self-awareness represents an honest assessment of his craft ceiling.
   > Verbatim: "fuck no... I don't know they gave it to me, I thought I could learn it as I go and he's like but there's no one to learn from"

5. **Mustafa, #tech-support, 29 May 2026.** Mustafa demonstrated deep infrastructure knowledge by remotely diagnosing a VPN connectivity issue while in transit, correctly identifying that Oman had blocked WireGuard traffic and immediately working on a workaround.
   > Verbatim: "Looks like Oman blocked WireGuard traffic. So I need to find a way around that"

6. **David Luong, 360 feedback, May 2026.** In the May 2026 peer feedback round, David rated Mustafa 4 out of 5 for craft capability, noting no concerns with Mustafa's personal performance or that of the engineering department.
   > Verbatim: "Mustafa rated 4/5: 'no problems himself or with engineering.'"

7. **Alon Helman, #leads, 29 May 2026.** Alon raised a direct concern about single-point-of-failure risk, questioning why Mustafa appeared to be the only person in the company capable of troubleshooting VPN issues when a team member required assistance.
   > Verbatim: "seems like Kunjal is having VPN issues and the only person who can help is Mustafa? Is there no one else in the company who can troubleshoot VPN issues?"

8. **Michael Dunnam, #leads, 29 May 2026.** Michael corroborated the single-point-of-failure concern, identifying that Mustafa appeared to be the only person with server access, creating an operational risk for the studio.
   > Verbatim: "I think Mustafa might be the only one with access to the servers"

9. **David Luong, #leads, 29 May 2026.** David independently flagged the same infrastructure concentration risk, stating that a backup person was needed for VPN and server access responsibilities currently held solely by Mustafa.
   > Verbatim: "We definitely need a backup person for things like VPN"

### Development actions

1. Within 60 days of CTO start, complete responsibility transfer: IT admin, VPN, DevOps move to IT Lead. Mustafa in advisory/escalation only. Documented with runbooks.
2. Define with CTO which two craft areas Mustafa continues as IC. Not all of them.
3. Two sprints per quarter for tech debt, formally scheduled from Q3 2026.

---

## 2. Leadership

**Rating:** [GAP: needs Glen input, 1 to 5 rating]

Mustafa Sibai's leadership trajectory has two distinct halves. Prior to April 2026, he self-described as "doing the bare minimum" and "absolutely a passenger rather than leading". A comprehensive list of leadership failures was documented and communicated to him directly on 24 April 2026: failure to conduct performance reviews, pushing unvetted candidates through hiring, taking unannounced vacation, leaking confidential leadership information to staff, and defaulting to dismissive technical assessments.

The confidentiality breach was traced specifically: Mustafa disclosed champions/weak-links information to Matt, who told Maddalena, who told Rebecca. This was confirmed by Vardis on 7 April 2026.

Following the April intervention, a marked improvement was observed. Mustafa produced a substantive six-issue improvement proposal within 48 hours. By May, the engineering estimation sprint was assessed as "outstanding" with "genuinely impressive" leadership from Mustafa. The June director assessment rated him as "trending up, significant improvement noted". The question for the next period is whether the improvement is durable.

### Evidence

1. **Mustafa, 1:1 with Glen, 24 Apr 2026.** During the April intervention meeting, Mustafa acknowledged that he had been operating at a minimal level of engagement in his leadership role, confirming directly that his contribution had fallen to the bare minimum.
   > Verbatim: "I am doing the bare minimum. Yeah"

2. **Mustafa, 1:1 with Glen, 24 Apr 2026.** Mustafa self-assessed his leadership posture as entirely passive, describing himself as having been a passenger rather than actively leading. This admission was made during the same April intervention meeting and confirmed the leadership team's independent assessment.
   > Verbatim: "I have been absolutely a passenger rather than leading"

3. **Glen, Group DM with Vardis/Aris, 24 Apr 2026.** Glen assessed Mustafa's pre-April leadership failures as a persistent pattern of behaviours that had accumulated over time, characterising them as reckless with studio interests and damaging to the point where intent could reasonably be questioned by observers.
   > Verbatim: "These are persistent behaviors over time that all accumulate to him playing chicken with the studio and hurting the studio in a way that looked like it was on purpose"

4. **Glen, Group DM, 24 Apr 2026.** Glen communicated to senior leadership that Mustafa's pattern of behaviour required immediate cessation, warning that the accumulated damage to trust had reached a critical threshold and would become irreversible if not addressed.
   > Verbatim: "this behavior has to stop now. The pain that he's accumulated and the distrust that he's starting to build is terminal if it's not stopped"

5. **Vardis, Group DM, 7 Apr 2026.** Vardis confirmed that Mustafa was identified as the source of the confidentiality breach regarding the champions and weak-links staff categorisation exercise.
   > Verbatim: "Mustafa was the leak for the champions/weak link stuff"

6. **Vardis, Group DM, 7 Apr 2026.** The confidentiality breach chain was traced specifically: Mustafa disclosed the information to Matt, who passed it to Maddalena, who then informed Rebecca. This represented a three-step propagation of confidential leadership material to non-leadership staff.
   > Verbatim: "Mustafa told Matt, Matt told Maddalena, and Maddalena told Rebecca"

7. **Glen, Group DM, 7 Apr 2026.** Glen formally warned that breaching leadership confidence carries the consequence of losing the privilege of holding a leadership position, establishing the severity of the infraction.
   > Verbatim: "breaching leadership confidence can cause you to lose privilege of leadership"

8. **Glen, Group DM, 8 May 2026.** Post-April improvement was confirmed: Glen assessed the engineering team's estimation sprint as outstanding, noting immediate rhythm, constructive debate, and willingness to give ground where needed. Mustafa's leadership of this process was described as genuinely impressive.
   > Verbatim: "The engineering team has been outstanding from day one. They got into a rhythm immediately, debated constructively, gave ground where needed. Mustafa's leadership here has been genuinely impressive"

9. **Mustafa, post-confrontation, 24 Apr 2026.** Following the April confrontation, Mustafa acknowledged that the direct intervention was what he needed, describing his prior state as a period of disengagement from which he required forceful external correction.
   > Verbatim: "this one-on-one is what he needed. He probably needed to be slapped out of this, that he's been in a fugue"

10. **Vardis, DM to Raynor, Dec 2025.** Vardis identified a structural leadership development gap: both Mustafa and Raynor had been developing their leadership capabilities without access to a more senior reference point for years, which had slowed decision-making across the studio.
    > Verbatim: "both you and Mustafa have been learning leadership in a vacuum for years without a more senior reference. That has slowed decisions"

11. **Aris, Group DM, 8 May 2026.** During the CTO candidate search, Aris expressed frustration with Mustafa's technical leadership capacity, requesting any competent engineering candidate other than Mustafa, indicating a lack of confidence in Mustafa's ability to fulfil the senior technical role.
    > Verbatim: "just give me someone who knows how to code and is not named Mustafa and I am happy"

12. **Aris, Group DM, 7 Apr 2026.** When Vardis revealed the confidentiality breach, Aris's response indicated he had expected or suspected Mustafa as the source, suggesting the leak was consistent with a pattern of behaviour already observed by the COO.
    > Verbatim: "whaaattt? me acting surprised"

13. **Aris, Group DM, 25 Jun 2026.** Aris questioned Mustafa's technical judgement after observing that identical hardware specifications had been submitted for all three departments, despite each department having different computational requirements that should have been reflected in differentiated specifications.
    > Verbatim: "Mustafa just gave same specs for hardware for all three departments. Is that normal?"

### Development actions

1. Zero tolerance on confidentiality. Any further breach = immediate disciplinary action. No further warnings.
2. Formal mentoring relationship with incoming CTO. Fortnightly for 3 months, then monthly.
3. Sustain the post-April trajectory. The improvement is from a very low base.

---

## 3. Command Presence

**Rating:** [GAP: needs Glen input, 1 to 5 rating]

Prior to April 2026, Mustafa Sibai's command presence was characterised by deflection. The "piece of cake" pattern was specifically identified: dismissing technical decisions as trivial rather than engaging with complexity, providing false confidence rather than honest assessment. Performance review deadlines were missed repeatedly, with all deadlines exceeded despite advance notice and follow-up.

Post-April, command improved. The written improvement proposal demonstrated ownership: publicly stating the build instability was "entirely my fault" and listing specific corrective actions. Valeria confirmed improved estimation capability. However, a gap persists in operational command: when build environments fail, QA reported having to chase engineering for status updates rather than receiving proactive communication.

### Evidence

1. **Mustafa, #gamescom-2026, 10 Feb 2026.** Mustafa responded to a technical request with unsubstantiated assurances of simplicity and an unrealistic timeline, providing no breakdown of requirements, dependencies, or risks. This is the "piece of cake" deflection pattern identified as a recurring behaviour.
   > Verbatim: "Yeah, should be easy. I can have it ready tomorrow. As easy as a piece of cake"

2. **Glen, Group DM, 24 Apr 2026.** Glen identified a persistent pattern where Mustafa repeatedly dismissed technical decisions as trivial rather than engaging with the underlying complexity, providing false confidence instead of substantive technical assessment on core details.
   > Verbatim: "he was repetitively saying this is a piece of cake rather than actually leaning in and giving a true technical opinion on core details"

3. **Lorenza, #executive, 1 Dec 2025.** HR formally challenged Mustafa for missing all process deadlines over a 10-day period, rejecting the justification that team vacation explained the delay and noting that every single deadline had been exceeded.
   > Verbatim: "The fact that the team will be on vacation is not a justification for you not filling the file in the past 10 days and missing ALL the deadlines (all of them)"

4. **Lorenza, #executive, 1 Dec 2025.** HR flagged that Mustafa had taken approximately four weeks of leave within a six-week period, characterising this as imprudent and noting it was not sanctioned at the level taken.
   > Verbatim: "you took almost 4 week vacations in a 6 weeks window, which is not wise and not recommended"

5. **Hannah Pickard, Group DM, 24 Jun 2026.** The QA Lead reported that she was required to constantly chase engineering for build status updates, and that when updates were provided they contained little to no information about estimated resolution times. She requested that clear responsibility for proactive communication be established.
   > Verbatim: "It shouldn't be on me to constantly chase code for an update, and often even when code give one they give little to zero information about an ETA. We need to establish responsibility here"

6. **Hannah Pickard, DM to Glen, 17 Jun 2026.** Positive instance: when engaged directly about build machine issues, Mustafa was responsive and confirmed the upgrades had been completed. This demonstrates capability for prompt resolution when approached, contrasting with the lack of proactive communication.
   > Verbatim: "I spoke to Mustafa about those build machine issues I mentioned to you and he's said it's all been upgraded now"

7. **Mustafa, #production-council, 26 Apr 2026.** Post-April, Mustafa publicly accepted full ownership of the build instability in the production council, demonstrating a shift from the prior deflection pattern to direct accountability.
   > Verbatim: "This is entirely my fault"

### Development actions

1. Eliminate the "piece of cake" pattern. Every technical question gets a structured response: requirements, dependencies, realistic timeline, risks.
2. Standing build status to QA every Monday and Thursday by 10am. Deadline misses communicated 48 hours in advance.
3. No company-wide process deadline missed without written extension request 48 hours before.

---

## 4. Drive for Results

**Rating:** [GAP: needs Glen input, 1 to 5 rating]

Prior to April 2026, Mustafa Sibai's results orientation was poor. The build was unstable for months following the Perforce migration, which was initiated during a hardlock period despite QA warnings. Performance reviews were repeatedly delayed. Hiring candidates were submitted without proper assessment.

Post-April, results improved. The engineering estimation sprint was described as outstanding. The improvement proposal listed nine concurrent infrastructure projects with specific corrective actions. By June 2026, the improvement was independently confirmed.

However, a persistent pattern of over-promising and under-delivering on deadlines has been documented as a "constant problem with Mustafa for years" that has "improved recently" but remains present. Communication about missed deadlines is described as "irregular".

### Evidence

1. **Hannah Pickard (QA Lead), #leads, 2 Sep 2025.** QA explicitly warned against proceeding with the Perforce migration near a deadline, expressing strong concern about the risk to build stability. The migration proceeded regardless of this warning; the build was subsequently broken for approximately three weeks.
   > Verbatim: "QA warned against the Perforce migration near a deadline. The migration proceeded; the build was broken for three weeks."

2. **Valeria, #production-team, 28 Jun 2026.** Production assessment identified a persistent pattern of over-promising and under-delivering on deadlines, characterised as a long-standing issue that has shown recent improvement in planning quality but continues to manifest through missed deadlines due to over-scoping. Communication about deadline misses was noted as irregular.
   > Verbatim: "Still has the tendency to over-promise and under-deliver in terms of deadlines tho; it's a constant problem with Mustafa for years, and I think it has improved recently, he really started planning better but this failing deadlines because of overplanning is still there. Communication about missed deadlines is also irregular"

3. **Glen, Group DM, 8 May 2026.** Post-April improvement was confirmed by Glen, who assessed the engineering team's output as outstanding from the first day of the estimation sprint, indicating a meaningful shift in results delivery under Mustafa's leadership.
   > Verbatim: "The engineering team has been outstanding from day one"

4. **Graeme Monk, DM to Glen, 2 Jun 2026.** On his second day at the studio, the incoming Executive Producer independently flagged concern about Mustafa's approach to delivery date transparency with his team, noting alarm at Mustafa's apparent comfort with withholding deadline information from engineering staff.
   > Verbatim: "Sorry for jumping in on the whole sprint celebration thing but I was a little alarmed at Mustafa's reaction to keeping his team in the dark about delivery dates"

### Development actions

1. Estimation accuracy tracking: record original estimate, revisions, actual delivery for every deliverable. Review monthly. Target: fewer than 20% misses within 6 months.
2. Weekly written status every Friday by 5pm: completed, on track, at risk, slipped.
3. Never communicate a deadline as easy without written breakdown of work, dependencies, and risks.

---

## 5. Communication

**Rating:** [GAP: needs Glen input, 1 to 5 rating]

Mustafa Sibai's communication presents a paradox. He is an outstanding informal communicator: his team likes talking to him, his written proposals are clear and insightful, and his studio-wide kudos post (May 2025) demonstrated granular personal knowledge of nearly every colleague. However, formal and upward communication has been a consistent failure point.

Pre-April failures included not communicating burnout until it surfaced through a candidate interview (the Nia incident), taking approximately 4 weeks of absence in a 6-week window without proper authorisation or notification to leadership, and leaking confidential leadership information. The Raynor performance rating incident (Feb 2026) illustrates the dynamic: Mustafa publicly challenged a calibration decision in #production-council without first seeking clarification through appropriate channels.

Post-April, the severe communication failures have not recurred. However, deadline communication remains "irregular" per Valeria, and build/environment status communication with QA has been consistently flagged as insufficient by Hannah Pickard.

### Evidence

1. **Mustafa, #production-council, 27 Feb 2026.** Mustafa publicly challenged a calibration decision regarding Raynor's performance rating in the production council without first seeking clarification through appropriate channels. The response was emotionally charged and included a threat to assume a different role, rather than following the expected process of private escalation followed by structured disagreement.
   > Verbatim: "How is this ok? I am pretty livid right now. How was this never run by me?... I am more than happy to be a principal if this sort of things is going to keep happening"

2. **Lorenza, reviewing Valeria, 12 Feb 2026.** HR identified a failure in upward communication: Mustafa experienced issues within a process but did not proactively report them, resulting in delays being discovered only after they had become unrecoverable.
   > Verbatim: "when Mustafa was experiencing issues within the process but did not proactively communicate them, the delays were discovered too late"

3. **Valeria, #production-team, 28 Jun 2026.** Production assessment noted that Mustafa's communication about missed deadlines remains irregular, indicating that while planning has improved, the formal communication of slippage has not been consistently addressed.
   > Verbatim: "Communication about missed deadlines is also irregular"

4. **Hannah Pickard, Group DM, 24 Jun 2026.** The QA Lead reported discovering all builds were failing when she attempted to run them, with no prior communication from engineering about the failures. She expressed frustration with what she described as a constant lack of communication from the engineering department.
   > Verbatim: "when I went to run new builds on Friday, all builds were failing... I am frustrated by this constant lack of comms"

5. **Lorenza, DM, 28 May 2026.** HR assessed that the Daniel offer conversation went well primarily because of HR's direct involvement. Mustafa's performance in the meeting was noted as below standard, but his genuine engagement with the process and proactive request for feedback demonstrated willingness to improve in formal communication settings.
   > Verbatim: "it went well because I was there, Mustafa did a bit poorly but he cared a lot about doing it right and asked for feedback"

6. **Lorenza, DM, 14 Jan 2026.** HR noted that while Mustafa did complete the performance evaluation scores for his team, the submissions contained no supporting examples or written commentary, failing to meet the standard required for meaningful performance documentation.
   > Verbatim: "For performance review. Mustafa evaluated the team, no examples or comments though"

7. **Lorenza, #human-resources, 4 Dec 2025.** HR reported that Mustafa failed to follow up on Tech Animator CV screening as requested before Lorenza's vacation. He responded only after multiple follow-up attempts and with complaints about the process, rather than completing the assigned action.
   > Verbatim: "I screened Tech Animator CVs before my vacation and asked Mustafa to follow up. He didn't -- only replied after multiple nudges and with complaints"

### Development actions

1. "No surprises" standard: any deadline miss, team issue, or infrastructure risk communicated in writing within 24 hours. Impact assessment and mitigation included.
2. Before reacting emotionally to a leadership decision, request a clarification call within 48 hours. State disagreement with evidence, then accept and communicate cleanly.
3. Shared running document with Valeria for all in-flight commitments. Updated Tuesday and Friday.

---

## 6. People Management

**Rating:** [GAP: needs Glen input, 1 to 5 rating]

Mustafa Sibai's relationship with his team is the strongest of any director. Peer feedback, the studio-wide kudos response, and team culture all indicate genuine mutual respect and affection. However, formal people management processes have been consistently below standard.

Performance reviews were not completed on time. When eventually submitted, they contained placeholder scores (all 5/5) with no comments or examples. Hiring candidates were submitted without proper evaluation. One assessment consisted entirely of "He is phenomenal. He is 100% couch heroes material. He is also British. That's always an extra point in my book." This does not meet the standard for a hiring assessment.

Mustafa did appropriately escalate a technical performance concern (Samer coding poorly with AI), which resulted in a formal warning. This shows capability in identifying people issues when they manifest as technical quality problems. Post-April, he is actively engaged in hiring (Tech Producer interviews, Lead Full-Stack offer).

### Evidence

1. **Lorenza, DM, 13 Jan 2026.** HR confirmed that Mustafa did not complete the performance evaluations. The 5/5 scores submitted were identified as placeholders rather than genuine assessments, rendering the entire evaluation exercise invalid for his department.
   > Verbatim: "mustafa did not finish the performance evaluation (so those 5s were not real they were placeholders"

2. **Mustafa via Lorenza, DM, 13 Jan 2026.** Mustafa's hiring assessment for candidate Benjamin consisted entirely of personal enthusiasm and cultural affinity rather than structured evaluation of skills, experience, or role fit. This does not meet the standard required for a director-level hiring recommendation.
   > Verbatim: "He is phenomenal. He is 100% couch heroes material. He is also British. That's always an extra point in my book"

3. **Glen, Group DM, 24 Apr 2026.** Glen assessed that Mustafa had damaged his own team by pushing unvetted candidates through the hiring pipeline, consuming team members' time with inadequately assessed applicants rather than protecting the team from poor-quality hiring processes.
   > Verbatim: "hurt his team by not delivering them to the poor candidates that he just pushed through the pipeline and ate up a bunch of people's time"

4. **Lorenza, #human-resources, 4 Dec 2025.** HR reported that Mustafa failed to meet the people management deadline despite receiving a dedicated 1:1 explanation session prior to the deadline being set, followed by additional follow-up reminders. The failure was not attributable to lack of clarity or support.
   > Verbatim: "Mustafa didn't meet the deadline despite follow-ups and a 1:1 explanation session with me done before setting the deadline"

5. **Lorenza, #human-resources, Oct 2025.** Mustafa appropriately escalated a technical performance concern regarding Samer's code quality when using AI tools, which resulted in a formal warning being issued. This demonstrates capability in identifying and acting on people issues when they manifest as measurable technical quality problems.
   > Verbatim: "Mustafa's concern about Samer escalated appropriately. Formal warning issued for coding poorly with AI."

6. **Mustafa, #kudos, 22 May 2025.** Mustafa's studio-wide kudos post individually recognised nearly every person in the company with specific, personal observations. The breadth of responses from across the studio demonstrated genuine mutual respect and affection, indicating strong interpersonal relationships at a team-culture level.
   > Verbatim: "Individually recognised nearly every person in the company. Responses from across the studio showed genuine affection."

7. **Mustafa, #production-council, 26 Apr 2026.** Mustafa proposed a sprint points system and a "king of the quarter" recognition programme, demonstrating engagement with team motivation mechanisms. The proposal reflected an understanding of gamification as a motivational tool, though the recognition framework requires formal structure to be effective.
   > Verbatim: "My brain loves seeing numbers go up, and I don't think I'm alone in that"

8. **Vardis, Group DM, 20 Mar 2026.** The CEO and COO independently identified a pattern of biased people assessment: Vardis observed that Mustafa appeared to hold a prejudice against Samer while simultaneously over-rating favoured team members, and Aris corroborated by noting Mustafa had consistently characterised Samer as underperforming. This dual pattern of favouritism and prejudice was flagged as a significant people management concern.
   > Verbatim: "I think Mustafa has a prejudice against Samer... with how we've seen Mustafa OVER rate some of his favourites in dev, he seems to downgrade others more than he should. Aris: Mustafa has always been saying Samer is underperforming."

### Development actions

1. Every hiring interview: standardised scorecard completed within 24 hours. Each score backed by a specific example.
2. Quarterly performance conversations with every direct report. Written notes shared with individual and Lorenza. First round by end Q3 2026.
3. Within 30 days, document all critical infrastructure access and train at least one backup. No single-person credential holders.

---

## Risk if no improvement

Deadline communication reverts to pre-April patterns. Single-point-of-failure risk materialises during a critical absence. Over-promising creates production schedule unreliability.

---

## Employee Response

The employee may provide a written response within 7 working days of receiving this review. The response will be attached to this document.

| Reviewer | Employee |
|---|---|
| Glen Pryer | Mustafa Sibai |
| Signature: _______________ | Signature: _______________ |
| Date: _______________ | Date: _______________ |
