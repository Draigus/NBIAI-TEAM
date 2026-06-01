// Supplement: 5 additional questions per category per discipline
// Run AFTER seed-couch-heroes-questions.js to reach 10 per category (50 per discipline)

require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CLIENT_ID = '21be0772-73e5-4cca-8795-8b1a66f89ec2';
const CREATED_BY = '4e6887eb-9b89-4278-b254-42f57ebdcee2';

const QUESTIONS = {

  // ═══════════════════════════════════════════════════════════════
  // ENGINEERING — batch 2
  // ═══════════════════════════════════════════════════════════════
  Engineering: {
    depth_type: 'code',
    questions: [
      { category: 'culture', text: 'How do you handle a situation where you disagree with a technical standard the team has adopted? Do you comply, advocate for change, or something else?' },
      { category: 'culture', text: 'Describe how you manage your own productivity in a remote setting. What are your biggest distractions and how do you deal with them?' },
      { category: 'culture', text: 'When you make a mistake that affects the build or another team member, how do you handle it? Give a real example.' },
      { category: 'culture', text: 'How do you approach documentation in a game codebase? What deserves documenting and what does not?' },
      { category: 'culture', text: 'Our team uses shared ownership — there are no personal fiefdoms over code. How do you feel about other engineers refactoring code you wrote?' },

      { category: 'technical', text: 'Describe your experience with entity component systems or similar data-oriented architectures in game engines. What are the practical benefits and when do they add unnecessary complexity?' },
      { category: 'technical', text: 'How do you approach API design for systems that other engineers will build on top of? Walk through a real example of an interface you designed.' },
      { category: 'technical', text: 'Explain how you would implement a replay system for a multiplayer game. What data do you capture, how do you handle determinism, and what are the storage implications?' },
      { category: 'technical', text: 'Describe your experience with anti-cheat systems. What server-side validation approaches have you implemented and how do you balance security with performance?' },
      { category: 'technical', text: 'How do you handle database schema migrations for a live multiplayer game that cannot afford extended downtime? Walk through your deployment strategy.' },

      { category: 'collaboration', text: 'Describe a time you pair-programmed with someone remotely. What tools did you use and was it effective compared to working alone?' },
      { category: 'collaboration', text: 'How do you communicate technical risks to producers or non-technical stakeholders without either understating the problem or creating unnecessary alarm?' },
      { category: 'collaboration', text: 'When you are blocked by another team and need their work before you can proceed, how do you handle the wait? Do you context-switch, help them, or escalate?' },
      { category: 'collaboration', text: 'Describe how you have onboarded into a large existing codebase. What was your approach to understanding unfamiliar systems, and how long before you felt productive?' },
      { category: 'collaboration', text: 'How do you handle a merge conflict in a critical system during a busy sprint? Walk us through your process.' },

      { category: 'leadership', text: 'Describe a time you said no to a feature request. What was your reasoning and how did you communicate it?' },
      { category: 'leadership', text: 'How do you evaluate new technology or middleware for adoption? What criteria matter most and how do you run a proof of concept?' },
      { category: 'leadership', text: 'When the team is split between two valid technical approaches, how do you break the deadlock and make a decision the team can commit to?' },
      { category: 'leadership', text: 'Describe your approach to estimating engineering work. How do you handle tasks with high uncertainty, and how accurate are your estimates typically?' },
      { category: 'leadership', text: 'How do you ensure knowledge sharing happens on a remote team where people can easily silo? What practices have you implemented or advocated for?' },

      { category: 'depth', text: 'Design a server architecture for a game that needs to support both persistent world sessions and instanced match-based gameplay. How do you handle player migration between the two modes?' },
      { category: 'depth', text: 'Describe how you would implement a damage calculation system that supports multiple damage types, resistances, buffs, debuffs, and environmental modifiers while remaining performant across 50 concurrent players.' },
      { category: 'depth', text: 'Walk us through how you would design a save/load system for a multiplayer game with persistent player progression. What do you store server-side versus client-side, and how do you handle versioning?' },
      { category: 'depth', text: 'You need to implement a spectator mode that allows viewing any player in a live match. What are the networking, security, and UX challenges, and how do you address each?' },
      { category: 'depth', text: 'Describe how you would architect a plugin or modding system that allows community content while maintaining game stability and preventing exploits in multiplayer.' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // ART — batch 2
  // ═══════════════════════════════════════════════════════════════
  Art: {
    depth_type: 'art_style',
    questions: [
      { category: 'culture', text: 'How do you handle tight turnaround art requests that interrupt your planned work? Describe your approach to prioritisation when everything feels urgent.' },
      { category: 'culture', text: 'Describe a time you received art direction that you felt was going in the wrong direction. How did you handle it?' },
      { category: 'culture', text: 'How do you approach reference gathering and mood boarding for a new asset or environment? Walk us through your process.' },
      { category: 'culture', text: 'What role does player feedback play in your art decisions? Describe a time community or playtest feedback changed your approach.' },
      { category: 'culture', text: 'How do you handle the gap between what you can see on your calibrated monitor and what players see on consumer hardware? How does that affect your choices?' },

      { category: 'technical', text: 'Describe your experience with shader authoring or material creation. How do you approach creating materials that look good under varying lighting conditions?' },
      { category: 'technical', text: 'Walk us through how you optimise a scene that is running below frame rate target. Where do you look first, what profiling tools do you use, and what are the typical culprits?' },
      { category: 'technical', text: 'How do you approach creating art that needs to tile, repeat, or be modular without looking repetitive? Describe your techniques.' },
      { category: 'technical', text: 'Describe your experience with motion capture cleanup or hand-keyed animation. How do you decide which approach to use for different types of movement?' },
      { category: 'technical', text: 'How do you manage version control for art assets? Describe your experience with Perforce, Git LFS, or similar tools and the challenges specific to binary asset versioning.' },

      { category: 'collaboration', text: 'How do you handle feedback from someone outside the art department who has strong opinions about visual quality? For example, an engineer who thinks something looks wrong.' },
      { category: 'collaboration', text: 'Describe how you have worked with a UI/UX designer to create game interfaces that are both functional and visually cohesive with the game world.' },
      { category: 'collaboration', text: 'When you are working on assets that will be shared across multiple environments or contexts, how do you coordinate with other artists to ensure consistency?' },
      { category: 'collaboration', text: 'Describe a time you had to outsource art work. How did you brief the external artist, review their output, and maintain quality standards?' },
      { category: 'collaboration', text: 'How do you give feedback on animation or VFX that you did not create but that appears alongside your assets? What is your approach to cross-specialty critique?' },

      { category: 'leadership', text: 'How do you approach art task estimation? Art is inherently subjective — how do you scope work when "done" is partly a judgement call?' },
      { category: 'leadership', text: 'Describe how you have contributed to building or refining an art style guide. What makes a style guide actually useful versus one that gets ignored?' },
      { category: 'leadership', text: 'When you notice quality inconsistency across the art team, how do you address it without demoralising individuals?' },
      { category: 'leadership', text: 'How do you balance pushing for the highest quality with accepting practical constraints? Where do you draw the line?' },
      { category: 'leadership', text: 'Describe your approach to building a portfolio review or art critique session. How do you structure it to be constructive rather than demoralising?' },

      { category: 'depth', text: 'We need a character customisation system with modular armour, clothing, and accessories that mix and match without visual clipping or style clashes. Describe your approach from art direction through to technical implementation.' },
      { category: 'depth', text: 'How would you create a weather system that visually transforms an entire map — from clear skies to storm — while maintaining art quality and performance? What are the layers involved?' },
      { category: 'depth', text: 'Describe your approach to creating destruction and damage states for environmental assets in a multiplayer game. How do you handle LOD, memory, and visual consistency?' },
      { category: 'depth', text: 'Walk us through how you would design the visual feedback system for a multiplayer game — hit indicators, health states, ability cooldowns, territory control. How does colour, shape, and motion communicate gameplay to the player?' },
      { category: 'depth', text: 'How would you approach creating a day/night cycle that serves both aesthetic and gameplay purposes? Describe the artistic choices you would make and how they support player behaviour.' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // NARRATIVE / WRITING — batch 2
  // ═══════════════════════════════════════════════════════════════
  'Narrative/Writing': {
    depth_type: 'narrative',
    questions: [
      { category: 'culture', text: 'How do you approach writing for a game where the tone needs to shift between serious narrative moments and lighter multiplayer banter? How do you maintain coherence?' },
      { category: 'culture', text: 'Describe your research process for writing about a setting, culture, or historical period you are not personally familiar with. How do you ensure authenticity?' },
      { category: 'culture', text: 'How do you handle working on a narrative that another writer started? What is your process for picking up someone else\'s voice and continuing it?' },
      { category: 'culture', text: 'Describe your approach to incorporating sensitivity considerations into game writing without making the narrative feel sanitised or preachy.' },
      { category: 'culture', text: 'How do you deal with scope changes that affect story — for example, a level being cut that contained a critical narrative beat? How do you restructure on the fly?' },

      { category: 'technical', text: 'Describe your experience writing for procedural or systemic narrative — where the story is partially generated by game systems rather than hand-authored.' },
      { category: 'technical', text: 'How do you approach writing UI text, menu strings, and system messages that need to be clear, concise, and consistent across hundreds of instances?' },
      { category: 'technical', text: 'Walk us through how you handle text overflow, character limits, and layout constraints when writing for in-game UI. What is your workflow with the UI team?' },
      { category: 'technical', text: 'Describe your experience with cinematics and in-engine cutscenes. How does your writing process differ for non-interactive sequences versus gameplay dialogue?' },
      { category: 'technical', text: 'How do you version control narrative documents, dialogue spreadsheets, and story bibles? What tools and practices keep multiple writers in sync?' },

      { category: 'collaboration', text: 'Describe how you have worked with a localisation team. What writing practices do you follow to make translation easier and more accurate?' },
      { category: 'collaboration', text: 'How do you collaborate with a QA team to test narrative content? What does a narrative QA pass look like and what do you ask testers to check for?' },
      { category: 'collaboration', text: 'When a designer changes a level layout that breaks your environmental storytelling, how do you work together to find a solution?' },
      { category: 'collaboration', text: 'Describe how you have worked with marketing to ensure promotional materials accurately represent the game\'s narrative without spoiling key moments.' },
      { category: 'collaboration', text: 'How do you handle creative disagreements with other writers on the team? Describe a time you had to compromise on a story element.' },

      { category: 'leadership', text: 'How do you ensure narrative continuity across a large project with multiple writers? What systems and processes do you put in place?' },
      { category: 'leadership', text: 'Describe how you would pitch a narrative feature to studio leadership. How do you demonstrate the value of story investment in a multiplayer game?' },
      { category: 'leadership', text: 'When the narrative team is understaffed and the workload exceeds capacity, how do you triage? What gets written and what gets simplified?' },
      { category: 'leadership', text: 'How do you evaluate narrative quality? What makes writing "good enough" for a game versus what makes it truly excellent?' },
      { category: 'leadership', text: 'Describe your approach to building a narrative department from scratch. What roles do you hire first and what processes do you establish?' },

      { category: 'depth', text: 'Design a faction system narrative for a multiplayer game where players choose allegiances that affect dialogue, quest access, and world state. How do you keep all paths feeling equally rich?' },
      { category: 'depth', text: 'How would you create a companion or NPC that players form genuine emotional connections with in a multiplayer context where everyone has the same companion? What techniques make it feel personal?' },
      { category: 'depth', text: 'Describe how you would write the in-game codex or lore database for a new IP. What structure, voice, and discovery mechanics would you use to make players actually engage with it?' },
      { category: 'depth', text: 'Walk us through how you would handle writing for a morality or reputation system. How do you avoid binary good/evil while still giving player choices meaningful narrative consequences?' },
      { category: 'depth', text: 'Our game needs seasonal narrative events that advance an overarching story while remaining accessible to players who missed previous seasons. Describe your approach to episodic multiplayer storytelling.' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // GAME DESIGN — batch 2
  // ═══════════════════════════════════════════════════════════════
  'Game Design': {
    depth_type: 'code',
    questions: [
      { category: 'culture', text: 'How do you approach designing for accessibility in a multiplayer game? What accommodations do you consider from the start versus add later?' },
      { category: 'culture', text: 'Describe your relationship with data. How much do you rely on analytics versus intuition, and where do you draw the line?' },
      { category: 'culture', text: 'How do you handle disagreement with a creative director about a design direction? Give a specific example of how you navigated it.' },
      { category: 'culture', text: 'Describe a design you are embarrassed about in retrospect. What did you learn and how has it changed your approach?' },
      { category: 'culture', text: 'How do you keep players\' interests central when business pressure pushes for more aggressive monetisation? Where is your line?' },

      { category: 'technical', text: 'Describe your experience with reward psychology in game design. How do you design reward schedules that feel satisfying without becoming manipulative?' },
      { category: 'technical', text: 'How do you approach difficulty tuning for a multiplayer game where player skill varies enormously? What systems allow challenge without frustration?' },
      { category: 'technical', text: 'Walk us through how you design and document a new gameplay system — from initial concept through specification to handoff to engineering.' },
      { category: 'technical', text: 'Describe your experience with map or level design for competitive multiplayer. What principles guide your layouts and how do you test for fairness?' },
      { category: 'technical', text: 'How do you design social systems — guilds, clans, parties, friends lists — that encourage positive interaction and discourage toxic behaviour?' },

      { category: 'collaboration', text: 'How do you translate player community feedback into actionable design changes? What is your filter for signal versus noise?' },
      { category: 'collaboration', text: 'Describe how you work with the analytics or data team. What questions do you ask, what data do you request, and how does it change your designs?' },
      { category: 'collaboration', text: 'When you need to cut a feature someone else on the team championed, how do you handle the conversation and the relationship?' },
      { category: 'collaboration', text: 'How do you involve QA in the design process? When do you bring them in and what role do they play beyond bug reporting?' },
      { category: 'collaboration', text: 'Describe how you have run a design workshop or ideation session with a cross-discipline team. What format works and what fails?' },

      { category: 'leadership', text: 'How do you document design decisions and rationale so that future team members understand not just what was decided but why?' },
      { category: 'leadership', text: 'Describe your approach to competitive analysis. How do you study other games without just copying their designs?' },
      { category: 'leadership', text: 'When playtest feedback is contradictory — some players love a feature, others hate it — how do you decide what to do?' },
      { category: 'leadership', text: 'How do you ensure design consistency across a game when multiple designers are working on different systems simultaneously?' },
      { category: 'leadership', text: 'Describe how you measure the success of a design after launch. What metrics matter and how do you separate design impact from marketing and timing?' },

      { category: 'depth', text: 'Design a player-driven economy for a multiplayer survival game. How do you create meaningful trade, prevent exploitation, and maintain long-term economic health?' },
      { category: 'depth', text: 'Walk us through how you would design a clan/guild system that gives groups meaningful collective goals beyond what individuals can achieve alone.' },
      { category: 'depth', text: 'Design a dynamic event system for a live multiplayer world that reacts to aggregate player behaviour. What triggers events, how do they scale, and how do you prevent them from feeling formulaic?' },
      { category: 'depth', text: 'How would you design a skill/ability system with 20+ abilities that maintains balance, allows meaningful build diversity, and avoids one dominant meta? Walk us through your framework.' },
      { category: 'depth', text: 'Describe how you would design the new player experience for a complex multiplayer game that has evolved over two years of live service. How do you make it welcoming without dumbing down what veterans enjoy?' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // QA — batch 2
  // ═══════════════════════════════════════════════════════════════
  QA: {
    depth_type: 'code',
    questions: [
      { category: 'culture', text: 'How do you advocate for QA being involved in feature design from the start rather than only at the end? Give an example of where early involvement prevented problems.' },
      { category: 'culture', text: 'Describe how you handle the frustration of finding the same types of bugs repeatedly because root causes are not being addressed.' },
      { category: 'culture', text: 'How do you approach testing your own assumptions? Describe a time you were confident a feature was fine and then found a critical issue.' },
      { category: 'culture', text: 'What distinguishes an exceptional QA tester from an adequate one? What skills or mindset do you look for in a colleague?' },
      { category: 'culture', text: 'How do you stay engaged and thorough during long testing cycles where much of the content is unchanged from previous builds?' },

      { category: 'technical', text: 'Describe your experience with automated regression testing for UI elements in a game. What tools have you used and what are the limitations?' },
      { category: 'technical', text: 'How do you approach testing cross-platform play between PC, console, and mobile? What unique issues arise and how do you structure your test coverage?' },
      { category: 'technical', text: 'Walk us through your approach to testing game economy balance — currency earn rates, item costs, progression speed. How do you identify problems before players do?' },
      { category: 'technical', text: 'Describe your experience with crash analysis and log reading. How do you extract useful information from crash dumps, stack traces, and server logs?' },
      { category: 'technical', text: 'How do you test server stability under sustained load over time? Describe your approach to soak testing for a multiplayer game that needs 99.9% uptime.' },

      { category: 'collaboration', text: 'Describe a time you found a bug that was difficult to communicate because the reproduction steps were complex or intermittent. How did you document it and work with the developer to fix it?' },
      { category: 'collaboration', text: 'How do you approach testing a feature when the design specification is incomplete or ambiguous? What do you do before you start testing?' },
      { category: 'collaboration', text: 'When you notice that certain developers consistently produce fewer bugs than others, how do you share those best practices without creating embarrassment?' },
      { category: 'collaboration', text: 'Describe how you work with community managers to triage player-reported bugs. How do you distinguish real issues from user error or edge-case configurations?' },
      { category: 'collaboration', text: 'How do you handle a situation where an engineer marks your bug as "won\'t fix" or "by design" and you disagree? What is your escalation process?' },

      { category: 'leadership', text: 'Describe how you would build a test automation strategy from zero for a multiplayer game. Where do you start, what do you automate first, and what stays manual?' },
      { category: 'leadership', text: 'How do you define and track test coverage metrics that are genuinely useful rather than vanity numbers? What do you measure and report to leadership?' },
      { category: 'leadership', text: 'When a critical bug is found hours before a planned release, how do you assess the risk and advise on whether to ship, delay, or hotfix?' },
      { category: 'leadership', text: 'Describe your approach to building a test environment that mirrors production closely enough to catch real issues. What are the practical challenges?' },
      { category: 'leadership', text: 'How do you maintain team morale when QA is consistently the bottleneck at the end of every milestone? What structural changes do you push for?' },

      { category: 'depth', text: 'Design a test plan for a new multiplayer map that includes layout testing, balance verification, performance benchmarking, and accessibility checks. What does comprehensive map testing look like?' },
      { category: 'depth', text: 'Describe how you would test a live service update that changes fundamental gameplay balance — for example, reworking the damage system. What is your pre-release and post-release testing strategy?' },
      { category: 'depth', text: 'Walk us through how you would set up a multiplayer test lab for simulating real-world conditions — varying latency, packet loss, NAT types, and platform combinations.' },
      { category: 'depth', text: 'How would you test a player reporting and moderation system end-to-end? What scenarios do you cover and how do you verify that reports are handled correctly?' },
      { category: 'depth', text: 'Describe your approach to testing localisation in a multiplayer game. Beyond text translation, what localisation issues are commonly missed and how do you catch them?' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // PRODUCTION — batch 2
  // ═══════════════════════════════════════════════════════════════
  Production: {
    depth_type: null,
    questions: [
      { category: 'culture', text: 'How do you handle a team member who consistently misses commitments? Describe your approach from first conversation to escalation if needed.' },
      { category: 'culture', text: 'Describe your philosophy on meetings. Which are essential, which are waste, and how do you protect maker time for the people who need focused blocks?' },
      { category: 'culture', text: 'How do you celebrate successes and milestones in a remote team? What has worked and what has felt forced?' },
      { category: 'culture', text: 'When you spot early signs of burnout in a team member, what do you do? Give a real example.' },
      { category: 'culture', text: 'How do you build a production culture where people feel comfortable saying "I do not know how long this will take" rather than committing to unrealistic estimates?' },

      { category: 'technical', text: 'Describe your experience with live operations and release management. How do you manage patch cadence, hotfix processes, and communication with players during outages?' },
      { category: 'technical', text: 'How do you track and manage external dependencies — middleware licences, platform certification, third-party services — that can block production if not managed proactively?' },
      { category: 'technical', text: 'Walk us through how you would set up a production dashboard. What information does the team need to see daily, weekly, and at milestone boundaries?' },
      { category: 'technical', text: 'Describe your experience with outsourcing management for game development. How do you scope work, manage quality, and integrate external deliverables into the main project?' },
      { category: 'technical', text: 'How do you approach budgeting for a game project? What cost categories matter most and how do you track spend versus forecast through production?' },

      { category: 'collaboration', text: 'When two leads disagree about priorities and both escalate to you, how do you mediate without taking sides or undermining either lead?' },
      { category: 'collaboration', text: 'How do you keep stakeholders informed without creating a reporting burden on the team? Describe your communication cadence and format.' },
      { category: 'collaboration', text: 'Describe how you facilitate cross-discipline alignment sessions. What format works for getting art, design, and engineering on the same page about a feature?' },
      { category: 'collaboration', text: 'When you inherit a project from another producer, what do you do in the first two weeks? How do you understand the real state versus the reported state?' },
      { category: 'collaboration', text: 'How do you work with HR or people ops on team issues that straddle production and personnel — for example, a performance issue that is affecting sprint velocity?' },

      { category: 'leadership', text: 'Describe a time you had to kill a feature or workstream mid-production. How did you make the call, communicate it, and manage the team through it?' },
      { category: 'leadership', text: 'How do you develop producers or project managers on your team? What skills do you focus on and how do you create growth opportunities?' },
      { category: 'leadership', text: 'Describe your approach to crisis management when something goes wrong in production — a critical bug in live, a team departure, or a missed milestone.' },
      { category: 'leadership', text: 'How do you build a production culture that values predictability without stifling creativity? Where is the balance?' },
      { category: 'leadership', text: 'When the studio is growing and you need to scale production processes, how do you add structure without creating bureaucracy?' },

      { category: 'depth', text: 'The live game has a critical community-facing issue and a scheduled content drop in 48 hours. Walk us through how you triage, communicate, and manage both tracks simultaneously.' },
      { category: 'depth', text: 'Design a resource allocation model for a studio running a live game while also in pre-production on a second project. How do you staff both without burning out the team?' },
      { category: 'depth', text: 'Walk us through how you would plan and execute a platform certification process for a multiplayer game shipping on PC, PlayStation, and Xbox simultaneously.' },
      { category: 'depth', text: 'Describe how you would set up a playtest programme — internal playtests, closed beta, open beta. What do you test at each stage, how do you recruit participants, and how do you process the feedback?' },
      { category: 'depth', text: 'You discover mid-project that the game is three months behind where it needs to be for the announced launch date. Walk us through your options and how you present them to studio leadership.' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // AUDIO — batch 2
  // ═══════════════════════════════════════════════════════════════
  Audio: {
    depth_type: 'art_style',
    questions: [
      { category: 'culture', text: 'How do you handle situations where audio work is deprioritised repeatedly in favour of visual or gameplay work? How do you advocate without being adversarial?' },
      { category: 'culture', text: 'Describe your approach to playtesting your own audio work. How do you evaluate whether sounds are serving the player experience rather than just sounding good in isolation?' },
      { category: 'culture', text: 'How do you approach audio asset organisation and naming conventions across a large project? What happens when standards are not followed?' },
      { category: 'culture', text: 'Working remotely means your listening environment is different from every other team member. How do you ensure your audio decisions translate well across different playback setups?' },
      { category: 'culture', text: 'Describe your philosophy on audio restraint. When is silence or subtlety more effective than sound, and how do you convince a team that not every moment needs audio?' },

      { category: 'technical', text: 'Describe your experience with real-time audio DSP effects in a game context. What have you implemented and what are the CPU cost considerations?' },
      { category: 'technical', text: 'How do you approach designing and implementing footstep audio that accounts for surface type, speed, encumbrance, and environment? Walk through the system architecture.' },
      { category: 'technical', text: 'Describe your experience with interactive music systems. How do you structure music stems, transition rules, and intensity layers for a multiplayer game?' },
      { category: 'technical', text: 'How do you handle audio occlusion and propagation in complex 3D environments? What approximations work well and where do you need more sophisticated systems?' },
      { category: 'technical', text: 'Walk us through your approach to audio profiling and optimisation. What tools do you use, what metrics matter, and where do you typically find the biggest wins?' },

      { category: 'collaboration', text: 'How do you work with the UI team to create audio feedback for menu interactions, notifications, and HUD elements that feel cohesive with the game audio?' },
      { category: 'collaboration', text: 'Describe a time you collaborated with the marketing team on a trailer or promotional video. How does your approach to trailer audio differ from in-game audio?' },
      { category: 'collaboration', text: 'When a voice actor\'s performance does not match what you envisioned, how do you direct them to a better result without being prescriptive?' },
      { category: 'collaboration', text: 'How do you work with level designers to identify audio opportunities in a space — ambient zones, interactive objects, environmental storytelling through sound?' },
      { category: 'collaboration', text: 'Describe how you handle feedback like "it needs to sound more impactful" or "this does not feel right" — vague subjective feedback that you need to translate into specific audio changes.' },

      { category: 'leadership', text: 'How do you build a sound design asset library that is reusable across projects without making everything sound generic?' },
      { category: 'leadership', text: 'Describe your approach to outsourcing audio work — music composition, VO recording, sound effects. How do you brief, review, and integrate external audio work?' },
      { category: 'leadership', text: 'How do you decide when to create original audio versus use licensed or library sounds? What factors go into that decision?' },
      { category: 'leadership', text: 'When you have more audio work than capacity, how do you decide what gets full treatment versus a placeholder that ships? What is your triage framework?' },
      { category: 'leadership', text: 'How do you keep up with audio technology developments — new codecs, spatial audio standards, middleware updates — and decide what to adopt?' },

      { category: 'depth', text: 'Design the complete ambient audio system for a multiplayer open-world game with distinct biomes. How do you layer, crossfade, and randomise to keep hours of exploration from feeling repetitive?' },
      { category: 'depth', text: 'How would you approach creating audio for a stealth mechanic in a multiplayer game where sound is gameplay information? What does the player hear, what do enemies hear, and how do you balance realism with playability?' },
      { category: 'depth', text: 'Describe how you would build an audio notification system for a multiplayer game where players need to hear critical information (incoming attacks, team callouts, objective changes) above the ambient soundscape.' },
      { category: 'depth', text: 'Walk us through designing the audio for a vehicle system — engine sounds, terrain interaction, collisions, horns, passenger experience. How do you make it feel responsive and weighty?' },
      { category: 'depth', text: 'How would you implement an in-game voice chat system from an audio perspective — noise suppression, spatial positioning of player voices, push-to-talk versus open mic, and integration with the game mix?' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // HR / PEOPLE — batch 2
  // ═══════════════════════════════════════════════════════════════
  'HR/People': {
    depth_type: null,
    questions: [
      { category: 'culture', text: 'How do you approach building team culture in a studio where most people have never met in person? What specific initiatives have you run?' },
      { category: 'culture', text: 'Describe your approach to diversity and inclusion in hiring for a games studio. What concrete actions have you taken beyond policy statements?' },
      { category: 'culture', text: 'How do you handle the tension between employees wanting salary transparency and leadership wanting to keep compensation confidential?' },
      { category: 'culture', text: 'When an employee comes to you with a complaint about their manager, how do you balance supporting the employee with giving the manager a fair hearing?' },
      { category: 'culture', text: 'How do you approach exit interviews? What do you ask, what patterns do you look for, and how do you turn departures into improvements?' },

      { category: 'technical', text: 'Describe your experience with building and managing contractor and freelancer relationships across borders. What contracts, tax, and compliance considerations matter most?' },
      { category: 'technical', text: 'How do you approach building an employee data and reporting system? What metrics does a 55-person studio need versus what is overkill?' },
      { category: 'technical', text: 'Walk us through how you would set up a payroll system for a company with employees in both the UK and Greece. What providers and processes would you use?' },
      { category: 'technical', text: 'Describe your experience with immigration and visa processes for hiring international talent. What have you handled directly versus outsourced?' },
      { category: 'technical', text: 'How do you design learning and development programmes for a games studio where people want to grow technically, not just managerially? What formats work in a remote setting?' },

      { category: 'collaboration', text: 'How do you partner with studio leadership to translate business strategy into a people plan? Describe a real example.' },
      { category: 'collaboration', text: 'When a team lead wants to promote someone and you disagree with the timing or readiness, how do you have that conversation?' },
      { category: 'collaboration', text: 'How do you work with external recruiters? What makes the relationship productive and what makes it wasteful?' },
      { category: 'collaboration', text: 'Describe how you support managers through their first difficult conversation — a performance review, a warning, or delivering bad news to a team member.' },
      { category: 'collaboration', text: 'How do you collaborate with finance on annual compensation review cycles? What data do you bring and how do you reconcile budget constraints with retention needs?' },

      { category: 'leadership', text: 'How do you measure the effectiveness of your hiring process? What metrics indicate it is working versus where it needs improvement?' },
      { category: 'leadership', text: 'Describe your approach to succession planning in a small studio where losing one key person can be devastating.' },
      { category: 'leadership', text: 'When you see an organisational design problem — for example, a team that has grown too large for one lead — how do you propose and implement a restructure?' },
      { category: 'leadership', text: 'How do you stay current with employment law changes across your operating jurisdictions? What is your process for translating legal changes into policy updates?' },
      { category: 'leadership', text: 'Describe a time you had to terminate someone\'s employment. Walk through your preparation, the conversation itself, and how you managed the team afterwards.' },

      { category: 'depth', text: 'Design an employer branding strategy for a 55-person remote games studio that needs to compete with larger studios for senior talent. What channels, messaging, and candidate experience would you build?' },
      { category: 'depth', text: 'Walk us through how you would investigate a bullying complaint from a junior employee about a senior lead who is critical to a shipping project. How do you handle the investigation, the interim period, and the resolution?' },
      { category: 'depth', text: 'Describe how you would build a total rewards philosophy for the studio — base salary, bonus, equity, benefits, perks. How do you decide the mix and how do you communicate it to employees?' },
      { category: 'depth', text: 'The studio wants to open a small satellite office in a new country. Walk us through the people operations workstream — entity setup, local compliance, first hires, integration with the remote team.' },
      { category: 'depth', text: 'Design an internal mobility programme for a studio where people want to move between disciplines — an artist wants to try design, an engineer wants to move into production. How do you make this work without disrupting teams?' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // LEADERSHIP — batch 2
  // ═══════════════════════════════════════════════════════════════
  Leadership: {
    depth_type: null,
    questions: [
      { category: 'culture', text: 'How do you handle a situation where your team\'s culture and the broader studio culture are misaligned? Do you conform, advocate for change, or create a subculture?' },
      { category: 'culture', text: 'Describe your approach to giving difficult feedback to a high performer. How do you maintain the relationship while addressing the issue?' },
      { category: 'culture', text: 'How do you build psychological safety in a team that has been burned by previous leadership? What concrete actions do you take?' },
      { category: 'culture', text: 'Describe how you handle uncertainty. When the studio direction is ambiguous and your team is anxious, what do you say and do?' },
      { category: 'culture', text: 'How do you approach hiring for your team? Describe the profile of the last person you fought hard to hire and why they mattered.' },

      { category: 'technical', text: 'How do you make technology or tooling decisions that balance the team\'s preferences with the studio\'s long-term strategy? Give an example where these conflicted.' },
      { category: 'technical', text: 'Describe your approach to managing technical debt as a leader. How do you create space for improvement work without it feeling like overhead?' },
      { category: 'technical', text: 'How do you assess the technical capability of your team? What do you do when you identify gaps that hiring alone cannot fill quickly?' },
      { category: 'technical', text: 'Walk us through how you have handled a production emergency — a critical system failure, a data breach, or a show-stopping bug in live. What did you do in the first hour?' },
      { category: 'technical', text: 'Describe your experience with platform relationships — Sony, Microsoft, Valve, Epic. How do you navigate certification, feature requirements, and business terms?' },

      { category: 'collaboration', text: 'How do you build productive conflict — where people challenge ideas constructively — without it becoming personal or political?' },
      { category: 'collaboration', text: 'Describe how you have managed a cross-studio collaboration — for example, co-development with another team. What are the leadership challenges specific to multi-studio work?' },
      { category: 'collaboration', text: 'When you need to influence a decision you do not control — for example, a studio-wide policy set by the CEO — how do you approach it?' },
      { category: 'collaboration', text: 'How do you handle a direct report who is brilliant individually but undermines other leaders\' authority or decisions? Describe a real situation.' },
      { category: 'collaboration', text: 'Describe how you communicate bad news — delays, cancellations, layoffs — to your team. What is your framework for transparency versus protection?' },

      { category: 'leadership', text: 'How do you stay effective as a leader during periods of personal stress or uncertainty? What does your self-management look like?' },
      { category: 'leadership', text: 'Describe the biggest leadership mistake you have made. What happened, what did you learn, and how has it changed your approach?' },
      { category: 'leadership', text: 'How do you define and communicate success for your team beyond shipping on time? What does excellence look like in your discipline?' },
      { category: 'leadership', text: 'Describe your approach to one-on-ones. What is the cadence, format, and purpose? How do you ensure they are valuable for the other person?' },
      { category: 'leadership', text: 'When you take over a team and realise the structure is wrong — wrong roles, wrong reporting lines, wrong team composition — how do you approach reorganising without destabilising the people?' },

      { category: 'depth', text: 'The studio has received acquisition interest from a larger publisher. As a senior leader, how do you advise on the decision, manage team anxiety during due diligence, and handle the transition if it goes through?' },
      { category: 'depth', text: 'Describe how you would build the studio\'s technical strategy for the next three years. What inputs do you consider, who do you involve, and how do you communicate a strategy that spans multiple projects and platforms?' },
      { category: 'depth', text: 'A key leader in another discipline gives notice and their team is critical to the current milestone. Walk us through how you manage the immediate crisis, the interim leadership, and the long-term replacement.' },
      { category: 'depth', text: 'The studio needs to decide whether to build proprietary technology or license existing solutions for a critical system. Walk us through how you frame the decision, what analysis you do, and how you present the recommendation.' },
      { category: 'depth', text: 'You are brought in to turn around a discipline that has lost the confidence of the rest of the studio — late deliverables, quality issues, team morale problems. Describe your 90-day plan.' },
    ]
  },
};

async function main() {
  let total = 0;
  for (const [discipline, data] of Object.entries(QUESTIONS)) {
    let inserted = 0;
    for (const q of data.questions) {
      await pool.query(
        `INSERT INTO interview_question_bank (client_id, discipline, category, question_text, depth_type, source, created_by)
         VALUES ($1, $2, $3, $4, $5, 'curated', $6)`,
        [CLIENT_ID, discipline, q.category, q.text, q.category === 'depth' ? data.depth_type : null, CREATED_BY]
      );
      inserted++;
    }
    console.log(`${discipline}: ${inserted} additional questions inserted`);
    total += inserted;
  }
  console.log(`\nDone — ${total} additional questions inserted (batch 2)`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
