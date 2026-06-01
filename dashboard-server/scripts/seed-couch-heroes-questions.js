// Seed script: Hand-crafted interview question bank for Couch Heroes
// 25 questions per discipline × 9 disciplines = 225 questions
// Categories: culture (5), technical (5), collaboration (5), leadership (5), depth (5)
//
// Run: cd dashboard-server && node scripts/seed-couch-heroes-questions.js

require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CLIENT_ID = '21be0772-73e5-4cca-8795-8b1a66f89ec2';
const CREATED_BY = '4e6887eb-9b89-4278-b254-42f57ebdcee2';

const QUESTIONS = {

  // ═══════════════════════════════════════════════════════════════
  // ENGINEERING
  // ═══════════════════════════════════════════════════════════════
  Engineering: {
    depth_type: 'code',
    questions: [
      // ── Culture ──
      { category: 'culture', text: 'We are a fully remote studio across the UK and Greece. What does your ideal remote working day look like, and how do you maintain focus without an office environment?' },
      { category: 'culture', text: 'Couch Heroes ships multiplayer games with tight deadlines. How do you balance code quality with the pressure to ship features quickly?' },
      { category: 'culture', text: 'Our engineering team spans multiple time zones. Describe how you have handled asynchronous communication on a previous project — what worked and what failed?' },
      { category: 'culture', text: 'We value engineers who raise problems early rather than hero-fixing them silently. Give an example of a time you flagged a risk that others were ignoring.' },
      { category: 'culture', text: 'How do you stay current with game engine and networking developments? Walk us through your learning routine and how you have applied something new to production code.' },

      // ── Technical ──
      { category: 'technical', text: 'Describe the networking model you are most experienced with for multiplayer games. What are the trade-offs between client-authoritative and server-authoritative approaches, and which would you recommend for a 50-player session?' },
      { category: 'technical', text: 'Walk us through how you would diagnose and fix a desync bug that only appears under high latency. What tools and techniques would you use?' },
      { category: 'technical', text: 'How do you approach memory management in a game that needs to run for extended play sessions? Describe a specific memory-related issue you have investigated and resolved.' },
      { category: 'technical', text: 'Explain your approach to automated testing in a game engine environment. What is realistic to unit test versus what requires integration or play testing?' },
      { category: 'technical', text: 'Describe your experience with CI/CD pipelines for game projects. What does a good build pipeline look like for a multiplayer title, and what are the common failure points?' },

      // ── Collaboration ──
      { category: 'collaboration', text: 'How do you work with designers who request features that are technically expensive? Walk us through a real negotiation where you had to find a compromise.' },
      { category: 'collaboration', text: 'Describe a time you had to integrate your systems work with another engineer\'s code and discovered fundamental disagreements about the architecture. How did you resolve it?' },
      { category: 'collaboration', text: 'When a QA tester files a bug you cannot reproduce, what is your process? How do you collaborate with QA to get to the root cause?' },
      { category: 'collaboration', text: 'How do you handle code reviews? Describe the most useful feedback you have received in a review and the most useful feedback you have given.' },
      { category: 'collaboration', text: 'Our artists and engineers share responsibility for performance. Describe how you have worked with an art team to solve a rendering or performance bottleneck.' },

      // ── Leadership ──
      { category: 'leadership', text: 'Describe a technical decision you drove that other engineers initially disagreed with. How did you build consensus, and what was the outcome?' },
      { category: 'leadership', text: 'How do you approach mentoring a junior engineer who is struggling with the complexity of multiplayer game code? Give a specific example.' },
      { category: 'leadership', text: 'When you see the same type of bug appearing repeatedly across the codebase, what do you do about it beyond fixing the immediate instance?' },
      { category: 'leadership', text: 'How do you decide when to pay down technical debt versus push forward with features? Describe a real example of how you made that call.' },
      { category: 'leadership', text: 'If you joined the team and found the codebase had significant architectural problems, how would you approach raising and addressing them without derailing current work?' },

      // ── Depth (Code) ──
      { category: 'depth', text: 'Design a real-time multiplayer inventory system that needs to handle item trades, crafting, and loot drops for 50 concurrent players. Walk us through your data model, synchronisation strategy, and how you handle conflict resolution.' },
      { category: 'depth', text: 'You need to implement lag compensation for a competitive multiplayer game. Explain the approaches you would consider, the trade-offs between them, and which you would choose for our context.' },
      { category: 'depth', text: 'Describe how you would architect a matchmaking system that supports skill-based matching, party grouping, and cross-region play. What are the failure modes and how do you mitigate them?' },
      { category: 'depth', text: 'Our game runs a live service with hot-fix capability. How would you design a system that allows server-side game logic changes without requiring a client patch? What are the security implications?' },
      { category: 'depth', text: 'Walk us through how you would profile and optimise a game server that is dropping below its target tick rate under load. What metrics do you capture, what tools do you use, and how do you prioritise fixes?' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // ART
  // ═══════════════════════════════════════════════════════════════
  Art: {
    depth_type: 'art_style',
    questions: [
      // ── Culture ──
      { category: 'culture', text: 'Working remotely means your art goes through digital review rather than in-person critiques. How do you present your work for feedback, and how do you handle critique you disagree with?' },
      { category: 'culture', text: 'Our studio culture values iteration over perfection on the first pass. How do you feel about producing rough work quickly and refining based on feedback?' },
      { category: 'culture', text: 'Couch Heroes is building a visual identity that needs to feel cohesive across many contributors. How have you adapted your personal style to fit an established art direction?' },
      { category: 'culture', text: 'Remote work can make it harder to stay inspired. What do you do to keep your creative energy up when you are working alone most of the day?' },
      { category: 'culture', text: 'Our team communicates heavily through Slack, Miro, and shared reference boards. Describe how you document and share your visual thinking process with teammates who are not in the same room.' },

      // ── Technical ──
      { category: 'technical', text: 'What is your pipeline for getting assets from concept to engine? Walk through the tools and stages you use, and where bottlenecks typically appear.' },
      { category: 'technical', text: 'Describe your experience with LOD (level of detail) systems. How do you balance visual quality against performance for assets that appear at varying distances in a multiplayer scene?' },
      { category: 'technical', text: 'How do you approach texture budgets for a game that needs to run across multiple hardware tiers? What trade-offs do you make and how do you validate your choices?' },
      { category: 'technical', text: 'Walk us through your process for creating assets that animate well. How do you think about topology, rigging constraints, and deformation when building a character or creature model?' },
      { category: 'technical', text: 'Describe a situation where a technical constraint from engineering significantly changed your art approach. How did you solve it without compromising the visual quality?' },

      // ── Collaboration ──
      { category: 'collaboration', text: 'How do you work with an art director whose vision differs from what you think would work better? Give a specific example and how you navigated it.' },
      { category: 'collaboration', text: 'Describe how you collaborate with engineers to debug visual issues — shading artefacts, lighting bugs, or performance problems with your assets.' },
      { category: 'collaboration', text: 'When multiple artists are building assets for the same environment or scene, how do you ensure visual consistency? What processes have you used?' },
      { category: 'collaboration', text: 'How do you work with game designers to translate gameplay mechanics into visual design? Give an example where the design requirement challenged your art approach.' },
      { category: 'collaboration', text: 'Describe a time you had to give constructive feedback on another artist\'s work that was not meeting the quality bar. How did you handle it?' },

      // ── Leadership ──
      { category: 'leadership', text: 'If you noticed the art team was producing inconsistent work because the style guide was unclear, what would you do about it?' },
      { category: 'leadership', text: 'How do you prioritise your work when you have requests from multiple leads — say the environment lead needs props and the character lead needs accessories for the same milestone?' },
      { category: 'leadership', text: 'Describe how you have helped onboard a new artist onto a project with an established visual style. What did you do to get them up to speed quickly?' },
      { category: 'leadership', text: 'When you see a process inefficiency in the art pipeline — for example, unnecessary handoff steps or manual work that could be automated — how do you go about improving it?' },
      { category: 'leadership', text: 'How do you advocate for art quality when production pressure pushes for cutting corners? Give a real example.' },

      // ── Depth (Art Style) ──
      { category: 'depth', text: 'Show us a piece from your portfolio that you are most proud of and walk us through the decisions you made — style references, colour palette, composition, and how it evolved through iteration.' },
      { category: 'depth', text: 'If we asked you to create a hero character for a stylised multiplayer game that needs to read clearly at distance in a chaotic 50-player battle, what are your design priorities and how do you validate silhouette readability?' },
      { category: 'depth', text: 'Describe your approach to creating a consistent lighting mood across a multiplayer map with dynamic time-of-day. How do you balance artistic intent with technical constraints?' },
      { category: 'depth', text: 'How do you approach VFX that needs to communicate gameplay information — for example, distinguishing friendly abilities from enemy abilities in a team-based game? What is your process from concept to implementation?' },
      { category: 'depth', text: 'We need to establish a visual language for UI elements that works across game, menus, and loading screens. Walk us through how you would approach creating that system from scratch.' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // NARRATIVE / WRITING
  // ═══════════════════════════════════════════════════════════════
  'Narrative/Writing': {
    depth_type: 'narrative',
    questions: [
      { category: 'culture', text: 'Narrative in multiplayer games often takes a back seat to systems and action. How do you feel about creating story that most players might skip or never fully engage with?' },
      { category: 'culture', text: 'Our writers work remotely and often asynchronously. How do you maintain a consistent voice and tone across multiple writers without daily face-to-face conversation?' },
      { category: 'culture', text: 'Couch Heroes builds games where narrative emerges through gameplay as much as through scripted moments. Describe your philosophy on environmental storytelling versus explicit narrative.' },
      { category: 'culture', text: 'How do you handle having your writing cut or rewritten due to design changes late in production? Walk us through a specific experience.' },
      { category: 'culture', text: 'Games writing often involves extensive collaboration with non-writers. How do you explain narrative structure and pacing to designers and engineers who may not have storytelling instincts?' },

      { category: 'technical', text: 'What tools and formats have you used for interactive dialogue systems? Describe your preferred approach to branching dialogue and how you keep it maintainable at scale.' },
      { category: 'technical', text: 'How do you write for localisation? What practices do you follow to ensure your text translates well across languages and cultures?' },
      { category: 'technical', text: 'Describe your experience with narrative scripting tools (Twine, Ink, Yarn, or proprietary). How do you bridge the gap between your writing and what gets implemented in engine?' },
      { category: 'technical', text: 'How do you approach writing barks, callouts, and short-form combat dialogue that needs to feel varied after hundreds of hours of play? What systems-level thinking goes into that?' },
      { category: 'technical', text: 'Walk us through how you document a narrative design — what goes in a story bible versus a design doc versus implementation notes? How do you keep them in sync?' },

      { category: 'collaboration', text: 'Describe how you have worked with a game designer to integrate narrative beats into gameplay without making either feel secondary.' },
      { category: 'collaboration', text: 'How do you collaborate with voice directors and actors? What preparation do you do to make a recording session productive?' },
      { category: 'collaboration', text: 'When an art team is building a world, how do you feed narrative context into their work? Give an example of how story requirements shaped environmental art.' },
      { category: 'collaboration', text: 'Describe a conflict between narrative goals and player-facing UX. How did you and the design team resolve it?' },
      { category: 'collaboration', text: 'How do you handle feedback from playtesting that suggests players are not connecting with the story the way you intended?' },

      { category: 'leadership', text: 'How do you champion narrative in a studio culture that prioritises systems and mechanics? What has worked and what has not?' },
      { category: 'leadership', text: 'Describe how you would build a story bible for a new multiplayer IP from scratch. What are the essential elements and how do you make it a living document?' },
      { category: 'leadership', text: 'If you joined mid-production and found the narrative was fragmented across documents, Confluence pages, and individual memory, how would you consolidate it?' },
      { category: 'leadership', text: 'How do you decide what narrative content to cut when scope reduction is needed? What is your framework for prioritisation?' },
      { category: 'leadership', text: 'Describe how you have mentored someone — a junior writer or a designer writing their first quest — to improve their narrative craft.' },

      { category: 'depth', text: 'Write a 200-word opening crawl for a multiplayer game where 50 players are dropped into a post-collapse city and must form factions to survive. Make it compelling enough that players actually read it.' },
      { category: 'depth', text: 'How would you design a lore delivery system for a multiplayer game that respects different player appetites — from lore-hungry completionists to action-focused players who ignore text?' },
      { category: 'depth', text: 'Describe how you build character voice. Pick two characters from your portfolio and explain how their dialogue patterns, vocabulary, and rhythm differ and why.' },
      { category: 'depth', text: 'Our game needs environmental storytelling that rewards observant players without blocking progression. Walk us through how you would design a narrative layer for a multiplayer map.' },
      { category: 'depth', text: 'How do you write for player agency when the multiplayer format means different players will experience events in different orders? Describe your approach to non-linear narrative coherence.' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // GAME DESIGN
  // ═══════════════════════════════════════════════════════════════
  'Game Design': {
    depth_type: 'code',
    questions: [
      { category: 'culture', text: 'Couch Heroes is a collaborative studio where design decisions are debated openly. Describe a time you changed your mind about a design decision based on team feedback.' },
      { category: 'culture', text: 'Our designers prototype in-engine rather than relying on documents. How comfortable are you building playable prototypes, and what is your preferred prototyping workflow?' },
      { category: 'culture', text: 'Remote game design means your work needs to be readable by people who cannot walk over and ask questions. How do you document design decisions so they survive asynchronous review?' },
      { category: 'culture', text: 'We iterate aggressively — features get tested, reworked, and sometimes cut. How do you handle having a design you are invested in deprioritised or removed?' },
      { category: 'culture', text: 'How do you stay connected to what players actually experience? Describe your relationship with playtesting, community feedback, and data-driven design.' },

      { category: 'technical', text: 'Describe your experience balancing a multiplayer game with asymmetric roles or classes. What methodology did you use and how did you validate balance changes?' },
      { category: 'technical', text: 'How do you approach designing progression systems that keep multiplayer games engaging beyond the first 10 hours without creating pay-to-win dynamics?' },
      { category: 'technical', text: 'Walk us through how you would design a tutorial flow for a multiplayer game where new players join sessions with experienced players. How do you onboard without disrupting?' },
      { category: 'technical', text: 'Explain your approach to designing UI/UX for complex game systems. How do you make deep mechanics accessible without dumbing them down?' },
      { category: 'technical', text: 'Describe your experience with economy design in a live service game. How do you model currency flows, identify inflation risks, and tune sink/faucet ratios?' },

      { category: 'collaboration', text: 'How do you communicate a game feel target to engineers? Describe a time you needed to iterate on the feel of a mechanic and how you worked with the engineering team.' },
      { category: 'collaboration', text: 'Describe how you collaborate with level designers to ensure systemic mechanics play well in specific spaces. What does that feedback loop look like?' },
      { category: 'collaboration', text: 'When art and design have conflicting priorities — for example, an environment that looks beautiful but plays poorly — how do you navigate the compromise?' },
      { category: 'collaboration', text: 'How do you work with QA to define test cases for game feel and balance? These are inherently subjective — how do you make them testable?' },
      { category: 'collaboration', text: 'Describe a feature you designed that required tight coordination between multiple disciplines. How did you manage the dependencies?' },

      { category: 'leadership', text: 'How do you build a shared design vision across a remote team? What artefacts, rituals, or practices have you found effective?' },
      { category: 'leadership', text: 'Describe how you have handled a situation where playtest data contradicted your design intuition. What did you do?' },
      { category: 'leadership', text: 'If you joined a project where the game design document was outdated and the actual game had drifted significantly, how would you approach re-establishing a clear design direction?' },
      { category: 'leadership', text: 'How do you make scope decisions when the team wants to do more than the schedule allows? What is your framework for cutting features without gutting the experience?' },
      { category: 'leadership', text: 'Describe your approach to running a design review. How do you create an environment where people feel safe challenging each other\'s ideas?' },

      { category: 'depth', text: 'Design a respawn system for a 50-player competitive game that discourages camping, maintains match pacing, and creates interesting strategic choices. Walk us through your reasoning.' },
      { category: 'depth', text: 'How would you design a crafting system that creates meaningful player-to-player trade without overwhelming new players with complexity? Sketch the core loop.' },
      { category: 'depth', text: 'Our game needs a seasonal content model that keeps players engaged quarter over quarter. Describe how you would structure seasons, what content cadence you would target, and how you measure success.' },
      { category: 'depth', text: 'Design an anti-griefing system for a multiplayer game that allows emergent player behaviour without enabling toxic play. What mechanics and policies would you combine?' },
      { category: 'depth', text: 'Walk us through how you would approach designing the moment-to-moment combat feel for a multiplayer action game. From first prototype to shipping, what are your milestones and decision points?' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // QA
  // ═══════════════════════════════════════════════════════════════
  QA: {
    depth_type: 'code',
    questions: [
      { category: 'culture', text: 'QA in a remote studio requires proactive communication — you cannot tap someone on the shoulder. How do you escalate critical bugs and ensure they get the attention they need?' },
      { category: 'culture', text: 'Our studio values QA as a craft, not a checkbox. What does quality assurance mean to you beyond finding and logging bugs?' },
      { category: 'culture', text: 'How do you maintain testing rigour during crunch periods when the pressure is on to approve builds quickly? Describe a time you pushed back on shipping something that was not ready.' },
      { category: 'culture', text: 'Multiplayer games generate bugs that are hard to reproduce and even harder to describe. How do you write bug reports that engineers can actually act on?' },
      { category: 'culture', text: 'How do you stay motivated during repetitive testing phases like regression or compatibility sweeps? What keeps you sharp?' },

      { category: 'technical', text: 'Describe your experience with multiplayer test automation. What tools have you used to simulate concurrent players and network conditions?' },
      { category: 'technical', text: 'How do you approach testing network-dependent features — lag, packet loss, reconnection, and session migration? What is your test matrix?' },
      { category: 'technical', text: 'Walk us through your process for setting up a test plan for a new multiplayer feature from scratch. What sections does it include and how do you prioritise test cases?' },
      { category: 'technical', text: 'Describe your experience with performance testing for games. How do you identify, measure, and report frame rate issues, memory leaks, and load time regressions?' },
      { category: 'technical', text: 'What is your approach to compatibility testing across different hardware, OS versions, and network configurations? How do you decide what to test and what to skip?' },

      { category: 'collaboration', text: 'Describe how you build a working relationship with engineers who are initially resistant to the bugs you file. How do you establish credibility?' },
      { category: 'collaboration', text: 'How do you work with designers to understand intended behaviour versus bugs? Not every unexpected outcome is a bug — how do you navigate that grey area?' },
      { category: 'collaboration', text: 'When you find a critical bug close to a milestone deadline, how do you handle the communication across the team? Walk us through the process.' },
      { category: 'collaboration', text: 'Describe how you collaborate with other testers to divide testing coverage without gaps or unnecessary overlap.' },
      { category: 'collaboration', text: 'How do you provide feedback on game feel and balance issues that are not technically bugs but affect player experience? Where does that feedback go and how do you frame it?' },

      { category: 'leadership', text: 'How do you advocate for QA resources and time in sprint planning? Describe a situation where testing was being squeezed and how you handled it.' },
      { category: 'leadership', text: 'Describe how you would build a QA process from scratch for a small multiplayer studio. What are the essentials versus nice-to-haves?' },
      { category: 'leadership', text: 'When you notice patterns in the types of bugs being shipped, how do you drive process improvement rather than just logging more bugs?' },
      { category: 'leadership', text: 'How do you mentor junior testers to move beyond surface-level testing into understanding systems well enough to find deep, non-obvious bugs?' },
      { category: 'leadership', text: 'Describe your approach to risk-based testing. How do you decide where to focus testing effort when you cannot test everything?' },

      { category: 'depth', text: 'Design a test strategy for a live multiplayer game that ships weekly patches. How do you balance regression coverage with new feature testing under tight turnaround?' },
      { category: 'depth', text: 'Describe how you would set up automated smoke tests for a multiplayer game. What do you test, what frameworks do you use, and how do you handle test flakiness from network timing?' },
      { category: 'depth', text: 'You discover a bug that only reproduces when 40+ players are in the same zone with specific ability combinations. How do you create a reliable reproduction case and communicate it to engineering?' },
      { category: 'depth', text: 'Walk us through how you would test a matchmaking system end-to-end. What are the failure modes you check for beyond basic functionality?' },
      { category: 'depth', text: 'How do you approach testing live service features like seasonal events, limited-time modes, and time-gated content? What are the unique challenges?' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // PRODUCTION
  // ═══════════════════════════════════════════════════════════════
  Production: {
    depth_type: null,
    questions: [
      { category: 'culture', text: 'Couch Heroes is fully remote across UK and Greece. How do you run a production rhythm that works across time zones without burning people out on meetings?' },
      { category: 'culture', text: 'Our studio values autonomy — teams own their work and producers facilitate rather than dictate. How does this compare to how you have worked before, and how do you thrive in that model?' },
      { category: 'culture', text: 'How do you keep a remote team connected and motivated during long development cycles? What rituals, check-ins, or practices have you found effective?' },
      { category: 'culture', text: 'Describe your relationship with scope management. How do you balance protecting the team from crunch with delivering on commitments to stakeholders?' },
      { category: 'culture', text: 'What does a healthy production culture look like to you, and how do you actively cultivate it?' },

      { category: 'technical', text: 'What project management tools and methodologies have you used for game development? Describe your preferred setup and why it works for multiplayer projects.' },
      { category: 'technical', text: 'How do you track and communicate project health — not just task completion but actual risk, morale, and velocity? What metrics matter to you?' },
      { category: 'technical', text: 'Describe your experience with milestone planning for a game that has both development and live service phases. How does your approach differ between the two?' },
      { category: 'technical', text: 'How do you create and maintain a project schedule that accounts for the inherent uncertainty in game development? What buffers, contingencies, and review points do you build in?' },
      { category: 'technical', text: 'Walk us through how you run a sprint or cycle. What ceremonies do you keep, what do you skip, and how do you adapt the process to the team\'s needs?' },

      { category: 'collaboration', text: 'How do you handle a situation where engineering and art are both blocked on each other? Describe your approach to cross-discipline dependency management.' },
      { category: 'collaboration', text: 'Describe a time you had to mediate a conflict between a lead and a team member. How did you approach it and what was the outcome?' },
      { category: 'collaboration', text: 'How do you work with external partners, outsourcers, or contractors? What practices keep external contributors aligned with the internal team?' },
      { category: 'collaboration', text: 'When leadership wants visibility into progress but the team feels over-reported, how do you balance transparency with protecting the team\'s focus?' },
      { category: 'collaboration', text: 'Describe how you facilitate a post-mortem or retrospective that actually produces actionable change rather than just venting.' },

      { category: 'leadership', text: 'How do you identify when a team is heading for trouble — slipping schedules, declining morale, or growing technical debt — before it becomes a crisis?' },
      { category: 'leadership', text: 'Describe your approach to capacity planning for a team that includes both full-time staff and contractors across multiple locations.' },
      { category: 'leadership', text: 'When a feature needs to be cut, how do you manage the communication with the team that built it? Describe a specific experience.' },
      { category: 'leadership', text: 'How do you build trust with a new team that has had bad experiences with producers in the past?' },
      { category: 'leadership', text: 'Describe how you have improved a production process that was clearly broken. What did you change, how did you get buy-in, and what was the result?' },

      { category: 'depth', text: 'We are planning our next major content update with a 16-week timeline, four disciplines, and partial team overlap with maintenance work on the live game. Walk us through how you would plan this.' },
      { category: 'depth', text: 'Describe how you would set up production processes for a new multiplayer game from greenlight to first playable. What do you put in place during each phase?' },
      { category: 'depth', text: 'How do you manage the competing priorities of a live game — player-reported bugs, planned content, technical debt, and platform requirements — when every stakeholder thinks their priority is the most urgent?' },
      { category: 'depth', text: 'Walk us through how you would structure team communication for a 55-person remote studio. What channels, cadences, and tools would you recommend and why?' },
      { category: 'depth', text: 'Describe your approach to risk management. Give an example of a project risk you identified early and how your mitigation plan played out.' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // AUDIO
  // ═══════════════════════════════════════════════════════════════
  Audio: {
    depth_type: 'art_style',
    questions: [
      { category: 'culture', text: 'Audio is often one of the last disciplines to get resources in game development. How do you ensure your work gets the attention and review time it needs in a remote studio?' },
      { category: 'culture', text: 'Working remotely means you cannot walk someone over to your speakers to demonstrate a mix issue. How do you communicate audio concerns effectively through digital channels?' },
      { category: 'culture', text: 'Couch Heroes values audio as a core part of the player experience, not polish. How have you advocated for audio being involved earlier in the design process?' },
      { category: 'culture', text: 'How do you maintain consistent monitoring and mixing standards when working from a home studio rather than a treated control room?' },
      { category: 'culture', text: 'Describe your approach to receiving and acting on feedback about audio from non-audio team members. How do you translate subjective feedback like "it does not feel right" into actionable changes?' },

      { category: 'technical', text: 'Describe your experience with audio middleware (Wwise, FMOD, or similar). What is your preferred tool and how do you integrate it into a game engine pipeline?' },
      { category: 'technical', text: 'How do you approach spatial audio for a multiplayer game where 50 players are generating sounds simultaneously? What prioritisation and culling strategies do you use?' },
      { category: 'technical', text: 'Walk us through your process for creating adaptive music that responds to gameplay state transitions without jarring cuts or inappropriate silence.' },
      { category: 'technical', text: 'Describe your experience with voice-over pipeline management — from casting through recording, editing, implementation, and localisation. What are the common failure points?' },
      { category: 'technical', text: 'How do you manage audio memory budgets across platforms? Describe your approach to compression, streaming, and bank management.' },

      { category: 'collaboration', text: 'How do you work with designers to establish the audio identity of a new feature? Describe the back-and-forth process from concept to implementation.' },
      { category: 'collaboration', text: 'Describe how you collaborate with animators to ensure sound and motion feel connected. What tools and workflows do you use to stay in sync?' },
      { category: 'collaboration', text: 'When engineering makes a system change that breaks your audio implementation, how do you work with them to fix it without creating friction?' },
      { category: 'collaboration', text: 'How do you collaborate with the music composer or licensed music provider to ensure in-game music works with the dynamic soundscape?' },
      { category: 'collaboration', text: 'Describe a time you had to push back on a sound request because it would create a bad player experience (too loud, too repetitive, misleading feedback). How did you handle it?' },

      { category: 'leadership', text: 'If you joined a project with no audio direction document, how would you establish one? What does a good audio direction look like?' },
      { category: 'leadership', text: 'How do you prioritise audio work when there are more requests than capacity? What gets done first and what can wait?' },
      { category: 'leadership', text: 'Describe how you have built an audio asset library or tagging system that the team can self-serve from. What made it successful?' },
      { category: 'leadership', text: 'How do you educate non-audio colleagues about why certain audio decisions matter for the player experience?' },
      { category: 'leadership', text: 'When you identify a systemic audio problem — for example, every weapon sounds the same or footsteps are inconsistent — how do you drive a fix across the project?' },

      { category: 'depth', text: 'Design the complete audio system for a multiplayer battle royale match — from the lobby through drop, exploration, combat, and victory/defeat. Walk us through the layers, priorities, and player communication through sound.' },
      { category: 'depth', text: 'How would you create an audio system that helps players locate other players by sound alone in a 3D environment? Describe the technical implementation and design considerations.' },
      { category: 'depth', text: 'Walk us through how you would approach creating a dynamic mix system that adjusts audio levels based on gameplay context — combat intensity, proximity to objectives, health state.' },
      { category: 'depth', text: 'Describe your approach to creating sound design for a new ability or weapon that needs to feel powerful, communicate gameplay information, and not fatigue the player after hours of use.' },
      { category: 'depth', text: 'How do you approach audio for different perspectives — first person versus third person versus spectator mode — in the same multiplayer game? What changes and what stays consistent?' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // HR / PEOPLE
  // ═══════════════════════════════════════════════════════════════
  'HR/People': {
    depth_type: null,
    questions: [
      { category: 'culture', text: 'Couch Heroes is a ~55-person remote studio across the UK and Greece, with different employment laws in each jurisdiction. How have you managed HR across multiple countries before?' },
      { category: 'culture', text: 'Our studio is small enough that every hire significantly changes the team dynamic. How do you think about culture fit without creating a monoculture?' },
      { category: 'culture', text: 'Remote work makes it harder to read team morale and catch issues early. What signals do you look for, and what proactive measures do you take?' },
      { category: 'culture', text: 'How do you handle confidential HR matters in a small, tight-knit team where everyone knows everyone? Describe the balance between transparency and discretion.' },
      { category: 'culture', text: 'Games industry HR faces unique challenges — crunch culture, contractor reliance, and high turnover. How does your approach to people operations account for these realities?' },

      { category: 'technical', text: 'What HRIS and people tools have you used for distributed teams? Describe your ideal toolset for a 55-person remote studio and why.' },
      { category: 'technical', text: 'Walk us through how you would set up an onboarding programme for a remote employee joining from a different country. What happens before day one, during the first week, and during the first month?' },
      { category: 'technical', text: 'Describe your experience with employment compliance across UK and EU jurisdictions. What are the key differences and common pitfalls?' },
      { category: 'technical', text: 'How do you approach compensation benchmarking for a games studio that competes with both AAA and indie studios for talent? What data sources do you use?' },
      { category: 'technical', text: 'Walk us through how you would design a performance review process for a remote creative studio. What cadence, format, and criteria would you use?' },

      { category: 'collaboration', text: 'How do you work with hiring managers who have very specific (sometimes unrealistic) candidate requirements? Describe how you help them refine what they actually need.' },
      { category: 'collaboration', text: 'Describe how you build trust with employees who see HR as "management\'s side." What do you do to be genuinely accessible?' },
      { category: 'collaboration', text: 'How do you work with finance on headcount planning, compensation decisions, and budget forecasting? Describe the relationship and information flow.' },
      { category: 'collaboration', text: 'When a manager is struggling with a difficult team member, how do you coach them through the situation rather than taking over?' },
      { category: 'collaboration', text: 'Describe how you collaborate with external legal counsel on employment matters. How do you decide what to handle internally versus when to escalate?' },

      { category: 'leadership', text: 'How do you build a people strategy for a growing studio? What do you put in place at 55 people that prepares for 100 without over-engineering for today?' },
      { category: 'leadership', text: 'Describe your approach to employee retention in the games industry. What works beyond compensation?' },
      { category: 'leadership', text: 'When you need to conduct a restructuring or redundancy process, how do you manage the legal requirements, the communication, and the impact on remaining team morale?' },
      { category: 'leadership', text: 'How do you measure whether your people operations are actually working? What metrics do you track and what signals do you act on?' },
      { category: 'leadership', text: 'Describe how you have handled a sensitive employee relations issue — harassment complaint, discrimination concern, or serious interpersonal conflict. Walk us through your process.' },

      { category: 'depth', text: 'A team lead in Greece reports that a UK-based direct report is consistently underperforming and wants to begin a performance improvement process. Walk us through the entire process from first conversation to resolution, including cross-border considerations.' },
      { category: 'depth', text: 'Design a benefits package for a 55-person remote studio with employees in the UK and Greece that is competitive for the games industry and practical to administer. What do you include and what do you leave out?' },
      { category: 'depth', text: 'We want to hire a senior engineer in a country where we do not currently have an entity. Walk us through the options — employer of record, contractor arrangement, entity setup — and your recommendation.' },
      { category: 'depth', text: 'Describe how you would build a hiring pipeline for a studio that needs to hire 10 people in the next quarter across engineering, art, and design. What is your sourcing strategy, interview process, and timeline?' },
      { category: 'depth', text: 'How do you design a remote-first company handbook that actually gets read and followed? What goes in it, what stays out, and how do you keep it current?' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // LEADERSHIP
  // ═══════════════════════════════════════════════════════════════
  Leadership: {
    depth_type: null,
    questions: [
      { category: 'culture', text: 'Couch Heroes is a small studio where leaders are hands-on, not just managers. How do you balance strategic work with staying close to the craft and the team?' },
      { category: 'culture', text: 'Our studio is fully remote — you will not have the casual hallway conversations that build trust. How do you establish credibility and connection with a distributed team?' },
      { category: 'culture', text: 'How do you set the tone for a team where people feel safe to raise problems, disagree with decisions, and admit mistakes? Give concrete examples of what you have done.' },
      { category: 'culture', text: 'Describe your approach to work-life balance as a leader. How do you model healthy working patterns in an industry known for crunch?' },
      { category: 'culture', text: 'What does accountability look like to you — both holding others accountable and being held accountable yourself? Describe a time you were wrong and how you handled it.' },

      { category: 'technical', text: 'How do you stay technically credible as you take on more leadership responsibility? Describe how you keep your understanding of the work sharp.' },
      { category: 'technical', text: 'Describe your experience leading teams through a major technical transition — engine migration, platform expansion, or infrastructure overhaul. How did you manage risk while keeping the team productive?' },
      { category: 'technical', text: 'How do you evaluate technical talent during hiring? What signals distinguish a genuinely strong candidate from someone who interviews well?' },
      { category: 'technical', text: 'Walk us through how you approach architecture and technology decisions that will constrain the team for years. What is your decision-making framework?' },
      { category: 'technical', text: 'Describe your experience with live service operations at a leadership level. How do you balance ongoing support with new development?' },

      { category: 'collaboration', text: 'How do you work with peers at your level — other leads or directors — when your teams have competing priorities? Describe a real conflict and how you resolved it.' },
      { category: 'collaboration', text: 'Describe how you build alignment between disciplines that naturally see the game differently — for example, art wanting visual fidelity while engineering wants performance.' },
      { category: 'collaboration', text: 'How do you communicate upward to executives and stakeholders who want different levels of detail? Describe how you tailor your communication.' },
      { category: 'collaboration', text: 'When you inherit a team with existing dynamics, cliques, and unresolved tensions, how do you navigate that in the first 90 days?' },
      { category: 'collaboration', text: 'Describe how you have built a productive relationship with an external publisher, investor, or partner whose incentives do not perfectly align with the studio\'s.' },

      { category: 'leadership', text: 'How do you make hard calls — cancelling a feature, letting someone go, pivoting direction — when the decision will be unpopular? Walk us through your process.' },
      { category: 'leadership', text: 'Describe your approach to building a team. How do you decide what roles to hire, what to grow internally, and what to outsource?' },
      { category: 'leadership', text: 'How do you develop the next generation of leaders on your team? Describe someone you have helped grow into a leadership role.' },
      { category: 'leadership', text: 'When a project is in trouble — behind schedule, over budget, or losing team confidence — what is your playbook? Describe a real turnaround.' },
      { category: 'leadership', text: 'How do you create a vision for your discipline or team that is both ambitious and credible? Describe a vision you set and how you brought the team along.' },

      { category: 'depth', text: 'You are hired to lead a discipline of 15 people at Couch Heroes. In your first 90 days, what do you do? Walk us through your priorities, who you talk to, what you assess, and what you change versus what you leave alone.' },
      { category: 'depth', text: 'The studio needs to grow from 55 to 80 people over the next year to support a second project. How do you approach this growth without breaking the culture or overstretching existing leadership?' },
      { category: 'depth', text: 'Describe how you would handle a situation where a high-performing individual contributor is toxic to team morale. They produce great work but people do not want to work with them.' },
      { category: 'depth', text: 'Walk us through how you would set up a team structure for a new multiplayer project. How do you organise people — by discipline, by feature, or some hybrid? What are the trade-offs?' },
      { category: 'depth', text: 'The studio is considering taking on a second client project while continuing the main game. How do you assess whether the team can handle it, and what organisational changes would you recommend?' },
    ]
  },
};

async function main() {
  let total = 0;
  for (const [discipline, data] of Object.entries(QUESTIONS)) {
    // Check if questions already exist for this discipline
    const { rows: existing } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM interview_question_bank WHERE client_id = $1 AND discipline = $2',
      [CLIENT_ID, discipline]
    );
    if (parseInt(existing[0].cnt, 10) > 0) {
      console.log(`Skipping ${discipline} — ${existing[0].cnt} questions already exist`);
      continue;
    }

    let inserted = 0;
    for (const q of data.questions) {
      await pool.query(
        `INSERT INTO interview_question_bank (client_id, discipline, category, question_text, depth_type, source, created_by)
         VALUES ($1, $2, $3, $4, $5, 'curated', $6)`,
        [CLIENT_ID, discipline, q.category, q.text, q.category === 'depth' ? data.depth_type : null, CREATED_BY]
      );
      inserted++;
    }
    console.log(`${discipline}: ${inserted} questions inserted`);
    total += inserted;
  }
  console.log(`\nDone — ${total} questions inserted total`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
