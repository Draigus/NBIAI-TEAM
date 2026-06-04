# Interview Questions by Role — Couch Heroes

**Version 2 — Research-validated.** Each position gets ~15 questions across 5 categories (culture, technical, collaboration, leadership, depth). Questions were generated, then improved by 7 parallel research agents using web research + NBI AI team domain expertise. Target: 9/10 role-specificity.

Questions are written for a remote multiplayer games studio (~55 people, UK + Greece).

---

## Art Execution Roles

---

### Lead Animator

**Culture**
1. Animation iteration cycles can be long — you block out, get feedback, refine, get more feedback. How do you stay motivated through multiple revision rounds when the final version looks nothing like your first pass?
2. Our team works across UK and Greece time zones. When you need sign-off on an animation before you can move forward, how do you structure your day so the timezone gap doesn't kill your momentum?
3. How do you decide when an animation is "good enough" to ship versus when it needs another polish pass? Walk us through a specific example where you had to make that call under schedule pressure.

**Technical**
4. Walk us through how you would approach creating a character ability that needs to feel responsive in multiplayer — the animation needs to read clearly at distance, sync across clients, and still look good. What are the constraints and trade-offs you are solving for simultaneously?
5. How do you handle animation blending and state machine complexity as a character's moveset grows? At what point does the system become unmanageable, and what have you done in practice to prevent that tipping point?
6. Describe how you approach anticipation, contact, and follow-through differently when animating for a game where the player can cancel out of animations mid-play versus a game where animations always play to completion. How does that change your keyframing and timing?

**Collaboration**
7. When a game designer asks for a mechanic that requires an animation you think will look bad or feel wrong — it reads well on paper but the body mechanics do not support it — how do you push back while still serving the design intent?
8. How do you work with riggers and character modellers to ensure a character is built for the animations you need? What specific conversations happen before the rig is locked, and what goes wrong when that collaboration breaks down?
9. Describe a time you had to coordinate with VFX and audio to make a single moment land — a hit, an ability, a transition. How did you sync across disciplines, and who owned the timing?

**Leadership**
10. How do you establish and maintain animation quality standards across a team where multiple animators are contributing to the same character? What does your animation style guide actually contain beyond reference videos?
11. When a junior animator delivers work that technically functions but lacks weight and personality — the timing is flat, the arcs are mechanical — how do you give feedback that teaches the principles rather than just correcting the specific shot?
12. How do you estimate animation work? A "walk cycle" can take a day or a week depending on context. What factors drive your scoping, and how do you communicate uncertainty to production?

**Depth**
13. If we asked you to build the animation system for a multiplayer melee combat game where players need to read opponent intentions from animation tells, how would you approach the balance between readability and visual fidelity? What does the animation pipeline look like from input to on-screen result?
14. Describe how you would approach creating a modular animation system for character customisation — different body types, armour sets, weapons — where animations need to work across all combinations without clipping or breaking. What are the technical and artistic compromises you have to make?
15. When you are animating for a game that needs to communicate gameplay state to both the controlling player and opponents watching from distance, how do you handle the fact that subtle, naturalistic motion is exactly what does not read at 50 metres?

---

### Lead Concept Artist

**Culture**
1. Concept art is inherently disposable — you create work knowing most of it will be iterated on or discarded. How do you handle that emotionally, especially on pieces you are proud of? How do you distinguish between "the direction changed" and "I missed the brief"?
2. How do you approach giving and receiving visual feedback asynchronously? A Slack message saying "this doesn't feel right" carries almost no information. What do you do to extract actionable direction from vague remote feedback?
3. Our studio values speed of iteration over precious renders. How do you balance producing rapid explorations against maintaining a quality bar that downstream artists can actually build from?

**Technical**
4. What is your process for creating concept art that is actually useful for 3D artists? What information do you include in a character turnaround or environment callout that you have learned through painful experience gets missed if you leave it out?
5. How do you design for silhouette readability in a multiplayer game where characters need to be instantly recognisable at distance and across varying lighting conditions? Walk us through your process from initial thumbnail to validated silhouette.
6. Describe how you approach colour scripting for a multiplayer map where different zones need distinct visual identities but the palette still needs to feel cohesive. How do you balance environmental storytelling with competitive readability?

**Collaboration**
7. When an art director gives you a brief that is too vague — "make it feel epic" or "I want something fresh" — how do you extract actionable direction without coming across as difficult or stalling the work?
8. How do you handle the moment when a 3D artist tells you your design looks beautiful in 2D but has practical problems as a 3D model — intersecting geometry in the armour design, physically impossible proportions, material ambiguity? How has that feedback changed how you work?
9. Describe how you present concept art options to stakeholders. How many options at what level of finish, and how do you handle "I like the colour of option A, the silhouette of B, and the detail of C"?

**Leadership**
10. How do you establish a visual style guide that is specific enough to maintain consistency but flexible enough that other concept artists do not feel creatively constrained? What does that document actually contain?
11. When the art direction needs to pivot significantly after months of established work — a tone shift, a style pivot, a new creative lead — how do you manage the transition, both the practical rework and the team's investment in the previous direction?
12. How do you mentor junior concept artists whose rendering skills are strong but whose design instincts are still developing? How do you teach someone to design rather than just illustrate?

**Depth**
13. Walk us through how you would approach establishing the visual identity for a new multiplayer game from scratch — from research and mood boards through to production-ready style guides. What are the critical decision points where the wrong choice cascades into months of rework?
14. If we need character designs that work across multiple biomes and lighting conditions while remaining instantly identifiable in a team-based game, how do you design for that constraint from the concept stage? What gets locked early and what stays flexible?
15. Describe how you would create a concept art package for a hero character that gives the character modeller, texture artist, and animator everything they need without ambiguity. What does a complete handoff actually look like for you?

---

### Snr Environment Artist

**Culture**
1. Environment art often gets less spotlight than character work, but in a multiplayer game the maps are the product players engage with thousands of times. How do you think about the value of your discipline relative to the time players spend in your spaces?
2. How do you handle situations where level design requirements change after you have invested significant time in a polished environment? What is your threshold for when to rework versus adapt existing work?
3. Our studio iterates rapidly on level layouts. How do you approach environment art when the blockout might change significantly — what do you invest in early versus what do you hold back?

**Technical**
4. How do you approach building modular environment kits that give level designers flexibility without looking obviously tiled or repetitive? Walk us through how you handle trim sheets, atlas textures, and vertex blending to break up repetition while keeping draw calls manageable.
5. Walk us through your process for optimising an environment that is running below frame rate target in a multiplayer match. Where do you look first — overdraw, draw calls, texture memory, shadow complexity — and how do you profile before making cuts?
6. Describe your approach to creating hero props versus kit-bashed set dressing. How do you budget your time and polygon allocation between bespoke focal points and repeatable filler, and how do you prevent filler from looking generic?

**Collaboration**
7. How do you work with level designers to ensure your art serves gameplay — sightlines, cover placement, navigation clarity — without making the environment feel like a set of wallpapered boxes?
8. When a lighting artist wants to change the mood of your environment in ways that reveal material problems you did not anticipate — flat normals, wrong roughness values, baked-in lighting assumptions in textures — how do you resolve that?
9. How do you coordinate with tech art on material and shader standards for environments? Describe a time where a misalignment between your material setup and the shader pipeline caused problems in production.

**Leadership**
10. How do you establish visual consistency across a team of environment artists working on different parts of the same world? What artefacts do you produce — reference sheets, material palettes, hero lighting setups — and how do you enforce them?
11. When you are building environments for a game where performance budgets are tight, how do you communicate constraints to other artists without being the person who always says no? How do you make the budget feel like a creative constraint rather than a limitation?
12. Describe how you would onboard a new environment artist onto a project with an established modular kit, naming conventions, and style guide. What does their first week look like?

**Depth**
13. If we asked you to create a competitive multiplayer map that needs to be visually distinctive, support 50+ players, run at 60fps on mid-range hardware, and have destructible elements, how would you prioritise those competing demands? What do you sacrifice first?
14. Walk us through building an environment from blockout to final — the stages, the review gates, the optimisation passes. Where do things typically go wrong between the "looks great in isolation" stage and the "runs in a match" stage?
15. How do you approach creating environments that tell a story or establish atmosphere while still functioning as clear, readable gameplay spaces? Give an example of how you have handled a specific tension between narrative environment detail and competitive clarity.

---

### Snr Lighting Artist

**Culture**
1. Lighting is often the last major pass before a scene ships, which means you are working under the most time pressure and absorbing every upstream delay. How do you maintain quality when the schedule is tightest and the changes are still incoming?
2. How do you handle situations where your lighting work is undermined by late changes — a new asset placed in a scene with completely different material properties, a layout shift that breaks your bounce light setup, a last-minute fog request? What is your process for rapid re-evaluation?
3. Describe your approach to keeping up with lighting technology evolution. When a new system ships — Lumen, hardware ray tracing, virtual shadow maps — how do you evaluate whether the visual gains justify the performance cost and pipeline disruption for your specific project?

**Technical**
4. Walk us through how you would light a competitive multiplayer map where gameplay readability is the primary constraint. How do you use light to guide player attention, distinguish friend from foe, and make ability VFX readable, all while keeping the scene visually appealing?
5. How do you approach the decision between baked, stationary, and fully dynamic lighting in a multiplayer game? What is your decision framework for which elements get which treatment, and how do you handle the visual seams where different lighting methods meet?
6. Describe your profiling workflow for lighting performance. When a scene is GPU-bound on lighting, walk us through how you identify whether the bottleneck is shadow map resolution, the number of overlapping dynamic lights, volumetric fog cost, or global illumination overhead. What tools do you use and what is your triage order?

**Collaboration**
7. When an environment artist's materials look great in their test scene but break under your lighting conditions — metallic surfaces blowing out, roughness values reading wrong at your light intensity — whose problem is that? How do you resolve it without creating a dependency loop?
8. How do you work with VFX artists to ensure particle effects and emissive materials read correctly against your lighting? Describe a specific situation where an effect that looked fine in isolation disappeared or overwhelmed the scene under your lighting setup.
9. Describe how you communicate lighting intent to the rest of the art team before you begin a lighting pass. Do you use lighting lookdev scenes, reference sheets, in-engine mockups? How do you prevent the "I didn't know it would look like that" reaction from environment artists?

**Leadership**
10. How do you establish lighting standards and guidelines that other artists can follow when placing assets — light probe density, emissive intensity ranges, reflection capture placement — so scenes do not need complete relighting every time something changes?
11. When the art director wants a dramatic, moody lighting scheme that conflicts with gameplay visibility requirements from game design, how do you navigate that conversation? Walk us through a specific example of finding a solution that served both.
12. How do you approach training environment artists on lighting best practices — correct light probe placement, avoiding light leak, understanding lightmap UV density — so they can self-serve for common scenarios without waiting for you?

**Depth**
13. If we asked you to create a dynamic time-of-day system for a multiplayer game that maintains competitive readability at all times while still looking visually distinctive at each phase — dawn, noon, dusk, night — how would you approach that? Where do you draw the line between visual ambition and gameplay fairness?
14. Walk us through lighting a complex multiplayer scene from your first planning pass to final polish — your pass order, how you handle the inevitable late-stage asset additions that break your carefully set exposure values, and how you validate readability across different monitor calibrations.
15. How would you approach lighting for a game that needs to run across PC, current-gen console, and last-gen console with meaningfully different lighting capabilities? What is your scalability strategy, and what is your minimum quality bar for the lowest tier?

---

### Snr Technical Artist

**Culture**
1. Technical art sits between art and engineering — you are never fully in either camp. How do you navigate that identity, and how do you build credibility with artists who think you are too technical and engineers who think you are too artistic?
2. When an artist asks you to build a tool for a workflow that you think is fundamentally wrong — they are solving the wrong problem — do you build the tool or challenge the workflow? How do you decide, and how have you gotten that wrong?
3. How do you prioritise your own time between reactive support (an artist is stuck right now and blocked) and proactive tooling (something that will save the whole team time next month)? How do you stop reactive work from consuming all your bandwidth?

**Technical**
4. Walk us through a shader you have built that solved a real production problem. What was the problem, what were the constraints (performance budget, artist usability, hardware targets), and how did you validate that it worked across all required conditions before rolling it out?
5. Describe your experience with DCC-to-engine pipelines — Maya or Blender to Unreal or Unity. What breaks most often in that pipeline (FBX export settings, scale, material mapping, skeleton hierarchy), and what have you built to prevent or automatically detect those failures?
6. How do you approach performance profiling and optimisation from the tech art side? Walk us through a specific case where you used RenderDoc, GPU Visualizer, or equivalent tools to identify a rendering bottleneck, and what the artist-facing solution was.

**Collaboration**
7. When an engineer builds a rendering feature that artists cannot figure out how to use — the parameters are unintuitive, the documentation is absent, the range values are wrong — what is your role? How do you bridge that gap without becoming a permanent intermediary?
8. How do you gather requirements from artists for tools? Artists often describe symptoms ("this takes too long") rather than root causes. Walk us through your process for diagnosing whether the real problem is a missing tool, a broken pipeline step, a training gap, or an artist using the wrong workflow.
9. Describe a time you had to push back on an art direction decision because it was technically infeasible at the performance budget. How did you present the alternatives so the art director could make an informed creative decision rather than feeling told no?

**Leadership**
10. How do you decide which tech art problems to solve with tools versus documentation versus training versus just fixing the pipeline? What is your framework, and can you give an example of each?
11. When you build a tool that nobody uses, how do you diagnose why? Is it a discoverability problem, a UX problem, a trust problem, or did you solve the wrong problem? What have you learned about adoption in art teams?
12. How do you keep the art team informed about technical constraints — triangle budgets, texture memory limits, draw call targets — without overwhelming them with numbers they will ignore? What communication format has actually worked?

**Depth**
13. If we asked you to build a material system for a stylised multiplayer game that needs to be artist-friendly (node-based, with clear presets), performant across hardware tiers (mobile to high-end PC), and support hundreds of unique-looking assets from a small set of master materials, how would you approach the architecture?
14. Walk us through how you would set up an automated art validation pipeline that checks assets on import — triangle counts, texture sizes, naming conventions, material slot assignments, LOD presence. How do you handle false positives without artists learning to ignore all warnings?
15. Describe the most complex production problem you have solved as a tech artist. Not the coolest shader — the problem where the biggest gap existed between what the art team needed and what the pipeline could deliver. What would you do differently with hindsight?

---

### Sr Character Modeler

**Culture**
1. Character modelling involves long periods of focused solo work in ZBrush or equivalent, followed by intense review sessions where every proportional decision gets scrutinised. How do you structure your working day remotely to stay productive during the solo sculpting stretches without losing touch with the team?
2. How do you handle feedback that asks you to redo significant work — a topology rework because the rig team found deformation issues, a proportion change from the art director after you have finished the high-poly — late in the process? What is your emotional and practical approach?
3. Multiplayer characters live in a context of dozens of other characters on screen simultaneously. How does knowing your character will be one of fifty visible at any moment change how you approach the work compared to building a single-player hero?

**Technical**
4. Walk us through your topology decisions for a real-time game character face. Where do you spend edge loops and why — around the mouth for phonemes, around the eyes for expression, along the nasolabial fold? How do those decisions change when the character will only ever be seen from a third-person camera at medium distance?
5. How do you approach building characters that need to deform well across a wide range of animations — combat, traversal, emotes, prone positions? Which topology and construction decisions matter most for deformation quality, and how do you validate deformation before handing off to rigging?
6. Describe your LOD creation process for a multiplayer game character. At what polygon thresholds do you set each LOD level, do you rely on automated decimation or manual retopo or a hybrid, and how do you decide what silhouette-defining details to preserve versus what to collapse at each level?

**Collaboration**
7. How do you work with concept artists when their design is beautiful as a 2D painting but has practical problems as a 3D model — intersecting geometry in the armour design, physically impossible proportions, an unclear back or underside view? How do you propose solutions without undermining their design?
8. When an animator tells you a character does not deform well in a specific pose — the shoulder collapses, the knee pinches, the fingers intersect the grip — how do you diagnose whether it is a modelling issue (topology), a rigging issue (weight painting or joint placement), or an animation issue (impossible pose)?
9. How do you coordinate UV layout decisions with texture artists? What information do they need from you — texel density targets, UV island arrangement, padding requirements — and how have you adjusted your UV workflow based on feedback from texture artists who had to work with your layouts?

**Leadership**
10. How do you maintain quality consistency when multiple modellers are building characters for the same game? What standards do you enforce — polycount targets per body part, naming conventions, UV texel density, subdivision level at handoff — and how do you review against them?
11. When the character roster grows and you are balancing quality against schedule, how do you decide which characters get the full sculpt-retopo-bake treatment and which get a lighter pass? What criteria drive that triage?
12. How do you approach giving feedback on another modeller's work? Specifically, how do you distinguish between personal style preference ("I would have shaped the jaw differently") and genuine quality issues ("the edge flow here will cause deformation artefacts")?

**Depth**
13. If we asked you to create a character customisation system with modular armour, clothing, and accessories that mix and match without visual clipping or style clashes, describe your approach from planning through implementation. How do you handle the combinatorial explosion of outfit combinations?
14. Walk us through building a hero character from high-poly sculpt to in-engine final — your stages, your review gates, your bake setup, your optimisation decisions. Where do characters typically fail quality-wise in the transition from offline sculpt to real-time model, and how do you prevent that?
15. How would you approach building characters for a multiplayer game where team identification, silhouette readability, and visual personality all compete for the same visual bandwidth? How do you ensure two opposing team characters read as distinct at distance while both looking like they belong in the same game?

---

### Sr VFX Artist

**Culture**
1. VFX is often added late in development when schedules are already tight and the gameplay is mostly locked. How do you produce quality effects under compressed timelines while still pushing for the best result rather than settling for "it works"?
2. In a multiplayer game, VFX has to serve gameplay first and spectacle second. How do you handle the creative constraint where the "cool" version of an effect — massive particles, screen-filling distortion, dramatic camera shake — would obscure the gameplay information players need?
3. How do you approach VFX consistency across a game? Fifty different abilities that all feel like they belong in the same visual world, with a coherent language for element type, power level, and faction, is much harder than making one spectacular standalone effect. How do you build and enforce that visual language?

**Technical**
4. Describe your approach to budgeting and optimising multiplayer VFX where potentially dozens of abilities fire simultaneously on screen. How do you manage overdraw, fill rate, particle counts, and GPU sprite versus mesh particles? Walk us through how you profile an effect that is too expensive and decide what to cut.
5. Walk us through your workflow for building a gameplay ability effect from scratch — emitter setup, material creation, texture authoring, timing to animation. What is your authoring tool of choice (Niagara, Cascade, Shuriken, PopcornFX), and where do you hit engine limitations that force workarounds?
6. How do you approach creating VFX that scale across hardware tiers? What specifically do you cut for lower-end hardware — particle count, texture resolution, shader complexity, simulation quality — and how do you ensure the effect still communicates gameplay information even at the lowest quality setting?

**Collaboration**
7. How do you work with game designers to translate abstract mechanics ("this ability slows enemies in a 10-metre radius for 3 seconds") into visual effects that communicate timing, range, intensity, and falloff? Walk us through a specific example of how you interpreted a design spec into a visual.
8. When your effects conflict with the lighting artist's scene setup — your emissive particles blow out in a dark scene, your additive blending disappears in a bright one — how do you negotiate a solution that does not require either of you to redo everything?
9. Describe how you coordinate VFX timing with animation and audio. When the impact frame of an animation, the hit sound, and the VFX burst all need to land on the same frame, who owns the timing, and what happens when they drift?

**Leadership**
10. How do you create a VFX style guide or reference library that maintains consistency when multiple VFX artists contribute to the same game? What does that guide actually contain — colour palettes, texture libraries, particle parameter ranges, naming conventions?
11. When an effect "works" technically but does not feel right — it lacks punch, or the timing feels off, or it reads as flat — how do you diagnose the specific problem and communicate it to another VFX artist? What vocabulary do you use beyond "make it juicier"?
12. How do you prioritise VFX work when every designer thinks their ability needs the best effects? What criteria do you use to determine which abilities get hero-level VFX treatment and which get a simpler, faster pass?

**Depth**
13. If we asked you to build a visual language for a multiplayer game where players need to instantly distinguish friendly effects from enemy effects, ability types (damage, heal, buff, debuff, crowd control), and threat levels (minor versus ultimate), how would you design that system? What are the visual axes you use to encode information?
14. Walk us through creating the VFX for a major character ultimate ability from concept through final — the design discussion with game design, the visual research, the iterative builds, the performance budget negotiation, and the final polish pass. What changed between your first prototype and the shipped version?
15. How would you approach creating environmental VFX — weather systems, atmospheric haze, ambient particles, water surfaces, fire spread — for a multiplayer map that needs to enhance atmosphere without impacting frame rate or obscuring gameplay sightlines?

---

### Technical Animator

**Culture**
1. Technical animation is one of those roles where if you do it well, nobody notices — the rig works, the state machine flows, the blends are smooth. How do you find professional satisfaction in a role where success is invisible and failure is immediately obvious to everyone?
2. You sit between animators who want maximum creative freedom and engineers who want deterministic, optimised systems. When those priorities directly conflict — an animator wants a control that would cost performance, an engineer wants to simplify a system that would reduce animation quality — how do you mediate?
3. How do you approach staying current with animation technology — new engine features, procedural animation techniques, machine learning retargeting — when the capabilities evolve faster than any single production can adopt them?

**Technical**
4. Walk us through how you would set up a character animation state machine for a multiplayer action game. What are your top-level states, how do you structure locomotion blendspaces, where do you use montages versus state-driven playback, and at what complexity level do you start worrying about the graph becoming unmaintainable?
5. Describe your motion capture cleanup pipeline — from raw solve data through to game-ready clips. How do you handle retargeting mocap performed on a 180cm actor to a game character with different proportions, and where do you draw the line between cleanup and re-animation?
6. How do you approach rigging a character that needs to support combat, traversal, emotes, prone positions, weapon holding, and potentially rideable mounts — all on the same rig? Walk us through your control hierarchy, how you handle constraint switching, and where you draw the complexity line.

**Collaboration**
7. When an animator's performance does not translate through the rig the way they intended — the weight shift feels wrong, the spine arc is lost, the fingers look stiff — how do you diagnose whether it is a rig limitation (not enough controls), a skinning issue (bad weight painting), or an animation approach problem (wrong workflow for this rig)?
8. How do you work with character modellers to ensure new characters are built rig-friendly from the start? What specific requirements do you give them — joint placement guides, edge flow requirements, bind pose specifications — and what does the handoff look like?
9. Describe how you work with gameplay engineers on animation system architecture. Where does your responsibility end and theirs begin — who owns the animation blueprint logic, who owns the notify system, who debugs desync between animation state and gameplay state?

**Leadership**
10. How do you document rigging and animation pipeline standards so that other technical animators, or animators doing their own basic rigging, can follow them? What format works — wikis, template files, video walkthroughs — and how do you keep documentation current as the rig evolves?
11. When the animation team is blocked because the pipeline has a bottleneck you have identified — slow export times, broken retargeting, a rig that crashes on specific poses — how do you triage fixing it against your other queued work? How do you communicate the priority trade-off to production?
12. How do you evaluate and adopt new animation tools or middleware — Motion Matching, procedural IK systems, runtime retargeting solutions — without disrupting an active production? What is your evaluation process before committing the team to a new approach?

**Depth**
13. If we asked you to build a rigging and animation pipeline for a game with extensive character customisation — multiple body types sharing a base skeleton, attachable gear with secondary dynamics, dismemberment or modular limbs — what are the core technical challenges and how would you approach the skeleton and rig architecture?
14. Walk us through building a procedural IK system for a multiplayer character that needs to handle uneven terrain foot placement, wall leans, weapon holding with two-hand IK, and vehicle mounting — all blending cleanly with hand-authored animations and running at multiplayer frame rates. What compromises do you make and where?
15. Describe the most challenging rig you have built. Not the most complex — the one where the gap between what the animators needed and what was technically feasible was largest. What made it hard, what did you learn, and what would you do differently?

---

## Engineering Roles

---

### Lead Full Stack Developer

**Culture**
1. Our stack is Node.js/Express with PostgreSQL, serving both API and SPA from a monolithic server. That's unusual for a games studio. What's your honest reaction to that architecture, and how do you approach working within it versus pushing for change?
2. In a game studio, your backend services live alongside gameplay engineers, artists, and designers who all have different release cadences and priorities. How do you manage your team's roadmap when the game side wants live ops features yesterday and the internal tools side wants infrastructure work?
3. How do you balance shipping features against paying down technical debt when your backend is supporting live game services that players are actively using? Give a real example of when you got that balance wrong.

**Technical**
4. Describe how you'd approach breaking a 10,000-line monolithic server.js into a modular route structure without breaking the live application. What's your migration strategy, and how do you ensure the game client isn't affected during the transition?
5. Walk us through building a real-time data sync system for a multi-user internal dashboard used by a game studio. The team needs to see project status, task updates, and bug reports updating live across multiple sessions. What's your approach to polling versus WebSockets versus SSE, and how do you handle stale state and conflict resolution?
6. Our backend handles authentication via Azure MSAL, serves game studio management data, and needs to support both internal team dashboards and client-facing views with different permission levels. How do you architect role-based access control that's maintainable as the number of user types grows?

**Collaboration**
7. When a gameplay engineer asks you to build an API endpoint that returns data in a shape you know will be painful to maintain or extend, how do you push back while still unblocking their work? Give an example.
8. Your backend serves data to a large single-page application where the frontend developer is embedding everything inline. The SPA is 20,000+ lines. How do you work with them on API contracts when they can't easily refactor their side?
9. Describe how you've handled a production incident on a service that a game team depended on during crunch. How did you communicate, triage, and run the post-mortem when tensions were already high?

**Leadership**
10. How do you establish code review standards that catch real issues without becoming a bottleneck, especially when your team includes engineers who primarily think about game systems rather than web architecture?
11. When you inherit a codebase with no tests and a live game studio depending on it daily, how do you introduce testing without stopping feature delivery? What do you test first?
12. How do you make architectural decisions that your team actually follows? Documentation that gets ignored isn't a standard. What's worked for you in practice?

**Depth**
13. If we asked you to build the backend for a studio management platform that tracks work items across a strict hierarchy (Client > Project > Feature > Story > Task), supports prerequisite blocking between items, handles optimistic concurrency for multi-user editing, and syncs incrementally to avoid full-page refreshes, walk us through the data model and the sync mechanism. Where are the hard problems?
14. Our database has 50+ migrations applied in production. A new feature requires a schema change that touches a table with hundreds of thousands of rows and active concurrent writes. Walk us through how you'd plan and execute that migration with zero downtime.
15. Describe how you'd build a metrics and observability layer for a game studio's internal backend. What do you instrument, what alerting do you set up, and how do you make the data useful to non-engineers who need to understand system health?

---

### Lead Gameplay Developer

**Culture**
1. Gameplay code is the most frequently iterated-on code in any game. A designer says "can we try it with three charges instead of one" and suddenly your cooldown system, UI bindings, and network replication all need to change. How do you write systems that survive this constant churn without becoming unmaintainable?
2. When a designer's vision conflicts with what's technically achievable within the frame budget, how do you have that conversation? Walk us through a real example where you had to say "we can't do that at 60fps with 50 players" and what you offered instead.
3. Gameplay feel is the hardest thing to quantify. A jump that's 0.2 seconds too floaty, a hit that doesn't connect visually with the damage frame. How do you validate that something "feels right" when you've been playtesting it for months and lost all objectivity?

**Technical**
4. Describe your approach to building an ability system for a multiplayer action game. How do you structure it so designers can author new abilities through data (cooldowns, targeting, effects, costs) without engineering involvement, while keeping the system debuggable and maintainable? What patterns have burned you?
5. Walk us through how you handle authority and prediction for a melee combat ability in a multiplayer game. The player presses attack, the animation starts, the hit needs to feel instant, but the server is 80ms away. What gets predicted client-side, what waits for server confirmation, and how do you handle the rollback when the server disagrees?
6. You're building a gameplay system where 50 players can simultaneously trigger area-of-effect abilities that interact with each other (slows stack, damage zones overlap, knockbacks chain). How do you structure the gameplay simulation to handle this without the server tick rate collapsing?

**Collaboration**
7. How do you build designer-facing tools that designers actually use? Every studio has examples of "we built a node graph editor and designers still ask us to hard-code things." What's worked and what hasn't in your experience?
8. A single ability requires animation events to trigger VFX spawns, VFX to trigger audio cues, audio timing to match hit reactions, and all of it to replicate across the network. How do you manage that cross-discipline integration so it doesn't become a coordination nightmare every time someone adjusts a timing?
9. Describe a time you worked with a network engineer upfront to ensure a gameplay feature was multiplayer-viable before you built it. What did that conversation look like, and what changed in your design because of it?

**Leadership**
10. How do you manage gameplay code quality when the team is prototyping three different combat ideas simultaneously and leadership will kill two of them next month? When does "quick and dirty" become unacceptable, and how do you draw that line with your team?
11. How do you prioritise gameplay bugs? A designer files "the dash doesn't feel responsive enough" alongside a crash in the ability queue and a desync in the projectile system. How do you weight feel bugs against functional bugs when both affect the player experience?
12. Describe how you'd onboard a new gameplay programmer onto a project with an established ability system, a custom gameplay framework, and 18 months of accumulated design decisions. What do they need to know in week one versus month one?

**Depth**
13. If we asked you to build the combat system for a multiplayer action game that supports 50+ simultaneous players with responsive melee and ranged combat, walk us through the architecture. How do you handle hit detection across latency, ability interactions (can a shield block a projectile mid-flight?), and the state machine complexity of characters that can attack, dodge, block, use abilities, and be interrupted?
14. Walk us through designing a data-driven progression system that designers can tune without code changes. What are the data structures, the authoring tools, the validation rules, and the safety rails that prevent a designer from accidentally making level 2 require more XP than level 50?
15. You need to build bot AI for a multiplayer action game that serves two purposes: filling empty player slots in matchmaking and providing PvE opponents in a co-op mode. The bots need to use the same ability system as players and navigate the same combat spaces. How do you approach this, and what changes between the two use cases?

---

### Snr Network Engineer

**Culture**
1. Networking code is invisible when it works and blamed for everything when it doesn't. A player in Athens on 4G plays against someone in London on fibre and says "your netcode is trash." How do you handle being the person responsible for lag, disconnects, and desync in a live game where the actual problem is outside your control?
2. Game networking is one of the most specialised engineering disciplines. The pool of people who truly understand rollback, server reconciliation, and snapshot interpolation at scale is small. How do you keep your skills current, and where do you learn from peers when GDC talks are the only public knowledge source for most of this?
3. You can build for the 95th percentile connection (200ms+ latency, 5% packet loss) or optimise for the median (30ms, clean connection). Building for the worst case costs frame budget and complexity. Where do you draw the line, and how do you decide what's an acceptable experience for players on bad connections?

**Technical**
4. Describe your netcode architecture for a multiplayer action game with 50+ concurrent players in a single zone. Walk us through your tick rate decision, your snapshot compression strategy, your delta encoding approach, and how you handle the bandwidth ceiling when 50 players are all in combat simultaneously.
5. Walk us through how you'd implement lag compensation for hit detection in a game where melee and ranged combat coexist. The attacker sees a hit, the victim was already behind cover on their screen, and the server has a third version of reality. How do you resolve this? What's your rewind window, and how do you prevent it from being exploitable?
6. At 50+ players, you're sending potentially thousands of entity updates per second. Walk us through your prioritisation system. How do you decide what gets replicated at full fidelity, what gets downsampled based on distance or relevance, what gets predicted locally, and what gets interpolated? How do you handle priority inversion when a distant player suddenly becomes relevant?

**Collaboration**
7. A gameplay programmer has built an ability that spawns 30 physics-driven projectiles that all need to be authority-checked. It works perfectly in single-player testing. How do you have the conversation about why this won't scale to 50 players, and what do you propose instead?
8. How do you work with QA to create meaningful network testing scenarios? Clamp tools and artificial latency are a start, but they don't capture real-world patterns like jitter spikes, route changes, and asymmetric packet loss. What's your approach to testing networking at scale before you have real players?
9. A designer wants an ability that "freezes time for everyone except the caster for 3 seconds." Explain how you'd communicate the networking implications of that design before they build an entire mechanic around it.

**Leadership**
10. Gameplay engineers write replication code for every new feature, and most of them don't think about bandwidth, ordering, or authority. How do you establish networking patterns and abstractions that make it hard for non-network engineers to write broken netcode? What has worked for you?
11. It's Friday evening, players are reporting rubber-banding on EU servers, your metrics show normal server tick time but elevated round-trip times. Walk us through your triage process. How do you distinguish between server-side load, client-side performance, ISP routing issues, and hosting provider problems?
12. You're the only person who understands the replication graph, the snapshot system, and the reconciliation logic. How do you document and teach your networking architecture so the team isn't completely dependent on you?

**Depth**
13. If we asked you to build the networking layer for a 100-player multiplayer game with real-time combat, walk us through your architecture from the wire protocol up. UDP with custom reliability? What's in your packet header? How do you structure your snapshot system? Where does interest management live? What are the hard scaling limits, and at what player count do you need to start spatially partitioning the simulation?
14. A player disconnects mid-match. They had active abilities, were carrying objectives, and other players were targeting them. Walk us through your reconnection system: how do you preserve their state, handle the gap period, resync them when they return, and deal with the edge case where they reconnect after the match has progressed significantly?
15. Describe how you'd architect a dedicated server fleet for a multiplayer game. Cover server allocation, region selection, match lifecycle management, graceful shutdown during deploys, and how you handle the situation where a physical host fails mid-match. What hosting model do you prefer and why?

---

### Tools Engineer

**Culture**
1. An animator says your Maya export plugin crashes "sometimes." A designer says the level editor is "slow." An engineer says your build scripts "don't work on my machine." None of them can give you a repro. How do you handle a user base that's opinionated, busy, and not technical enough to file a proper bug report?
2. Tools engineers rarely get credited in post-mortems, but a broken asset pipeline at the wrong moment can slip a milestone. What motivates you to build infrastructure that other people use to build the game?
3. You've built a content validation tool that works perfectly but artists hate using it because the error messages are cryptic and the UI is ugly. How do you decide when a functional tool needs a UX pass, and how do you justify that time to production?

**Technical**
4. Describe a custom editor extension or DCC plugin you've built for a game production. What specific artist or designer workflow did it improve, what was the architecture, and how did you handle versioning when both the tool and the engine it plugged into were evolving?
5. Walk us through building an asset pipeline that takes a character from Maya/Blender export through validation (polygon counts, naming conventions, texture sizes, bone hierarchies), processing (LOD generation, texture compression, format conversion), and packaging into the engine. Where do failures typically occur, and how do you design the pipeline so artists get actionable errors rather than a silent failure that shows up in-game three days later?
6. An environment artist discovers that the modular kit tool you built doesn't handle a specific edge case: pieces that need to snap at non-90-degree angles. Your tool assumed orthogonal snapping. How do you approach extending it without breaking the hundreds of assets already built with the original assumptions?

**Collaboration**
7. An animator wants the export tool to auto-generate animation events. A designer wants the same tool to validate naming conventions on export. An engineer wants it to strip debug data before committing. How do you gather requirements from three disciplines with conflicting priorities for the same tool, and how do you decide what ships first?
8. It's Wednesday. Your asset validation tool has a false-positive bug that's blocking the art team from committing work before the end-of-week milestone build. Do you disable the validation rule, deploy a quick patch, or investigate properly? Walk us through your decision process.
9. The gameplay engineering team has built a custom data format for ability definitions. They want your content authoring tool to support it, but the format changes every two weeks as the ability system evolves. How do you build tools against a moving target without constantly rewriting your parser?

**Leadership**
10. The studio is evaluating whether to build a custom level editor, extend the engine's built-in editor, or license a third-party solution. Each has trade-offs in cost, flexibility, maintenance burden, and team familiarity. What's your decision framework, and what questions do you ask before recommending?
11. A major engine upgrade is coming. You know it will break at least four of your custom tools and two pipeline scripts. How do you plan the migration, what do you fix first, and how do you keep the team productive during the transition?
12. How do you measure whether a tool is actually saving time? "It feels faster" isn't enough. An animator says your batch export tool is great, but you suspect they're still doing manual exports for half their work. What metrics have you used, and how do you get honest adoption data without surveillance?

**Depth**
13. Walk us through building the asset build pipeline for a multiplayer game from source control to packaged build. Source assets live in Perforce, the engine expects specific formats, builds need to run on CI for every commit, and the full asset cook takes 4 hours. How do you architect incremental builds, parallelise the cook, handle build failures gracefully, and get build times under 30 minutes for the common case?
14. Designers need a tool to author game content (items, abilities, quests, loot tables) with live validation (no circular dependencies, no missing references, balanced stat ranges), in-editor preview, and integration with version control so they can see diffs and revert. Walk us through the architecture, the data format decisions, and how you handle the inevitable request for "undo."
15. Describe the most impactful tool you've built for a game production. What was the specific workflow before, what did your tool change, what was the measurable impact, and what would you do differently if you built it again?

---

### IT Lead

**Culture**
1. A 55-person remote studio across UK and Greece means an animator in Thessaloniki on a consumer ISP is syncing the same 200GB Perforce depot as an engineer in London on fibre. How do you approach standardisation of hardware, software, and network requirements without being overly controlling or pricing yourself out of hiring in certain locations?
2. Game studios handle unreleased assets that are valuable leak targets, but your team includes artists who need admin access to install DCC plugins and engineers who need to run local servers. How do you handle the security versus productivity trade-off when locking machines down means people can't do their jobs?
3. It's 2pm on a Thursday, the Perforce server is down, the build farm is unreachable, and 40 people are sitting idle. Version control in a game studio isn't like Git for web developers; artists can't work offline with binary files. How do you communicate with a team that's panicking, and what's your playbook for getting them productive again?

**Technical**
4. Describe how you'd architect the infrastructure for a 55-person remote game studio from scratch. Cover the version control system (Perforce/Git/hybrid), build farm (cloud vs. on-prem vs. hybrid), CI/CD pipeline, large file storage and transfer, VPN/remote access, and communication stack. What do you set up first, and what can wait?
5. The studio's Perforce depot is 500GB and growing. Artists in Greece are syncing over consumer broadband. Engineers need to sync multiple workspaces. How do you manage this? Walk us through your approach to proxies, edge caching, workspace views, and the hard decision of what lives in version control versus what lives in a CDN or artifact store.
6. A build machine dies on a Friday evening during crunch. The weekend build won't go out. Walk us through your disaster recovery plan for build infrastructure specifically. How do you ensure build reproducibility, what's your redundancy model, and how quickly can you get a replacement online?

**Collaboration**
7. The engineering team wants to own their CI/CD pipeline and build scripts. You own the build machines and infrastructure. When a build fails because of a hardware issue versus a script issue, the blame ping-pong starts. How do you define the boundary between your responsibility and theirs, and how do you make that handoff clean?
8. A senior character artist starts on Monday. They need a workstation spec'd for Substance Painter and ZBrush, Perforce configured with the right workspace view, VPN access, their DCC licences activated, and a colour-calibrated display profile. Your generic onboarding script handles engineers. How do you build an onboarding process that handles the very different needs of artists, designers, and engineers without maintaining three completely separate systems?
9. The art director wants every artist to have a specific Wacom tablet model and a colour-calibrated 4K display. The tech lead wants engineers to have 128GB RAM machines with fast NVMe drives for compilation. Production wants everyone on the same laptop for standardisation. How do you navigate these competing hardware requests within a budget?

**Leadership**
10. On any given day you have: a VPN issue affecting one person in Greece, a request to evaluate a new DCC licence manager, a build machine that needs a RAM upgrade, and a security audit finding that needs remediation. How do you prioritise when none of these are emergencies but all of them are overdue?
11. The studio is growing from 55 to 80 people over the next year. What infrastructure investments do you make now to avoid pain later? What do you specifically watch for as a game studio scales (as opposed to a generic tech company)?
12. The publisher requires the studio to pass a security audit before milestone funding is released. Their checklist includes endpoint management, encrypted storage, access logging, and incident response procedures. How do you implement a security posture that satisfies the publisher without turning the studio into a corporate environment that drives creative people away?

**Depth**
13. The studio currently runs Perforce on a physical server in a London data centre, builds on two local machines, and has no formal disaster recovery. You've been asked to evaluate moving to cloud or hybrid infrastructure. Walk us through your assessment: what moves to the cloud, what stays on-prem, how you handle the migration without a production outage, and what the ongoing cost model looks like compared to the current setup.
14. Walk us through setting up endpoint security and access control for a remote game studio that handles unreleased game assets under NDA. Cover device management, network access, file-level permissions, monitoring for data exfiltration, and how you handle the inevitable situation where a contractor's personal machine needs access to the depot.
15. How would you approach building an automated provisioning system that gets a new hire from "laptop in a box" to "synced, building, and committing" in under a day? Cover the differences between artist, designer, and engineer setups, and how you handle the ongoing maintenance of that system as the studio's toolchain evolves.

---

## Design Roles

---

### Game Design Lead

**Culture**
1. You own the design vision, but your level designers, systems designers, and economy designers all have strong opinions about how the game should feel. When two of your designers fundamentally disagree on how a core system should work, how do you resolve it without just pulling rank?
2. In a multiplayer game, player behaviour often reveals that your intended design was wrong — players find exploits, ignore systems you thought were critical, or create emergent play patterns you never anticipated. How do you decide when to correct the players versus redesigning around their behaviour?
3. Design documentation at most studios ranges from "ignored completely" to "treated as law long after the game has moved on." How do you keep your design vision alive and evolving across a remote team without it either fossilising in a wiki or evaporating into Slack conversations?

**Technical**
4. Walk us through how you would design and balance an asymmetric multiplayer system where different player roles have fundamentally different abilities, win conditions, or power curves. What is your methodology for ensuring no role feels unfair to play against?
5. Describe your framework for designing a core gameplay loop for a multiplayer game that needs to sustain engagement across thousands of hours. What are the specific systems you layer (moment-to-moment, session, meta), and how do you validate that each layer is doing its job?
6. How do you approach designing systems that interact with each other in a multiplayer game — for example, a progression system that feeds into matchmaking that affects combat balance? How do you predict and test second-order effects before they reach players?

**Collaboration**
7. When your engineering lead tells you a core system you have designed is architecturally expensive, but the cheaper alternative fundamentally changes the player experience, how do you evaluate the trade-off? Give a specific example of how you have navigated this.
8. How do you align your level design lead, economy designer, and systems designers around a unified player experience when each discipline naturally optimises for different things? What artefacts or processes make that alignment concrete?
9. Describe how you work with production to scope a design-heavy milestone. Designers are notorious for underestimating complexity — how do you translate design ambition into honest effort estimates?

**Leadership**
10. How do you build a design team culture where designers critique each other's systems designs rigorously — not just "I like it" or "I don't like it," but structured analysis of how a system will behave at scale? What does a productive design review look like under your leadership?
11. When a major feature you championed fails in playtesting — not a small tweak needed, but fundamentally not fun — how do you handle the pivot with your team and with leadership? How do you distinguish between "needs iteration" and "needs killing"?
12. How do you evaluate the work of a systems designer versus a level designer versus an economy designer? They produce very different outputs — what does "excellent" look like in each, and how do you calibrate your feedback?

**Depth**
13. Design a meta-progression system for a multiplayer action game that keeps competitive players engaged for months without creating pay-to-win perception or insurmountable gaps between new and veteran players. What are your core design pillars and what mechanics do you explicitly avoid?
14. If you inherited a multiplayer game where the community has identified a "dominant strategy" that makes 80% of available options unviable, walk us through your diagnostic and correction process. How do you fix the balance without alienating the players who built their skill around the dominant approach?
15. How do you design for the tension between depth and accessibility in a multiplayer game? Competitive players want mechanical mastery; casual players want immediate satisfaction. Walk us through a specific system design that serves both without diluting either.

---

### Level Design Lead

**Culture**
1. Level design has the longest feedback loop of any design discipline — a map takes months to validate, and you often cannot tell whether spatial decisions work until dozens of playtests in. How do you manage your team's morale and momentum through that uncertainty?
2. Competitive multiplayer maps live or die on fairness, but your environment artists want landmark moments and your art director wants visual variety. How do you establish a studio-wide policy for when visual spectacle can override competitive symmetry?
3. Your maps will be played thousands of times by the same players. Designing for spectacle is easy; designing for repeated discovery is hard. What is your philosophy on creating spaces that still surprise on the hundredth play?

**Technical**
4. Walk us through how you establish a blockout-to-ship pipeline for a multiplayer game with multiple maps in simultaneous development. What are the stage gates, who has approval authority at each stage, and how do you prevent the pipeline from becoming a bottleneck?
5. Describe your approach to designing map geometry that scales across different player counts — the same map needs to feel populated at 16 players and not overcrowded at 50. What spatial techniques and dynamic systems do you use?
6. How do you approach sightline management in a multiplayer map? Long sightlines favour ranged play, short ones favour melee — and different areas of the same map might need different combat dynamics. Walk us through your methodology for designing sightline language across a map.

**Collaboration**
7. When your environment art lead has invested significant time making a space beautiful but your playtest data shows players consistently avoid that area, how do you handle the conversation? What is your framework for these trade-offs at scale, not just one-off negotiations?
8. How do you work with your game design lead to ensure level layouts actually support the game's core mechanics? Give an example of discovering that a mechanic and a map layout were working against each other and how you resolved it.
9. Describe how you coordinate with your audio and lighting leads to ensure spatial audio cues, lighting-based navigation hints, and level geometry all tell the same story about where players should go and what threats exist.

**Leadership**
10. How do you establish spatial design standards across a team of level designers so that all maps feel like they belong in the same game? What does a "level design style guide" contain, and how do you enforce it without killing individual creativity?
11. When a junior level designer's blockout is structurally sound but spatially uninteresting — correct but boring — how do you teach spatial instinct versus spatial correctness? What does that mentoring process look like?
12. How do you scope and schedule level design work when one map might take two months and another might take six, and you will not know which until the first playtest? What is your estimation approach?

**Depth**
13. Design a competitive multiplayer map for 40-60 players with at least three distinct engagement zones, meaningful elevation play, and strategic chokepoints that create predictable combat hotspots without feeling formulaic. Walk us through from initial concept to first playable blockout.
14. How do you design a map set for a game that supports multiple modes — the same geometry needs to work for team deathmatch, objective control, and an asymmetric attack/defend mode? What spatial design principles make multi-mode maps viable versus ones that only work for one mode?
15. Describe how you would audit an underperforming map in a live multiplayer game. Player data shows one side wins 60% of the time and one area of the map has almost zero traffic. Walk us through your diagnostic process and proposed fixes.

---

### Senior Level Designer

**Culture**
1. You have been iterating on the same map for three months — rebuild, playtest, feedback, rebuild. The fifth version is better than the first, but you are not sure it is good yet. How do you maintain the creative conviction to push through versus the humility to accept it might need a fundamentally different approach?
2. After months of daily playtesting your own maps, you know every sightline, every flank route, every spawn timing. How do you compensate for the fact that you can no longer experience your own level as a new player? What techniques do you use to maintain fresh perspective?
3. Grey-box playtesting is where most level design decisions are actually made. Walk us through how you organise and run a productive grey-box playtest session — who plays, what you observe, how you capture data, and how you turn observations into actionable changes.

**Technical**
4. Describe your scripting and implementation workflow within levels — triggers, spawn logic, objective sequencing, dynamic events. What is your comfort level with scripting tools, and how do you debug a trigger chain that is not firing correctly during a playtest?
5. Walk us through how you construct a combat encounter space in a multiplayer map. What are the spatial dimensions you control (cover density, engagement range, flank exposure, height advantage), and how do you tune them to create the combat feel the game design lead has specified?
6. How do you approach performance optimisation from a level design perspective? What spatial decisions directly affect rendering cost (draw distance, occlusion, density), and how do you work with artists and engineers to hit frame rate targets without sacrificing spatial quality?

**Collaboration**
7. When you give feedback on another level designer's map, "this area does not flow well" is not actionable. What does specific, useful level design critique look like? Walk us through how you would give feedback on a blockout that has structural problems.
8. You need a specific art treatment for a gameplay-critical area — a sniper perch that needs to be visually prominent, or a flanking route that needs to feel hidden. How do you brief an environment artist so they understand the gameplay intent, not just the visual request?
9. Describe a situation where you discovered during implementation that a game mechanic did not work in the space you had designed for it. How did you diagnose whether the problem was in the mechanic or the space, and what did the resolution look like?

**Leadership**
10. When you mentor a junior level designer, what are the hardest skills to teach? What separates a junior who can place geometry correctly from a senior who can make a space feel compelling?
11. You inherit a half-finished map from a designer who has left the project. The blockout is approved, but the implementation is incomplete. How do you pick up someone else's spatial vision without starting over?
12. You are working on three maps simultaneously at different stages — one in blockout, one in art pass, one in final polish. How do you manage your attention and energy across them, and how do you prevent the most urgent one from consuming all your time?

**Depth**
13. Walk us through designing a multiplayer map from the first blank canvas to a validated, playtest-approved blockout. What constraints do you start with, what are your first spatial decisions, how many iterations do you expect, and how do you know when the blockout is "done"?
14. Design a map that works for both casual and competitive play. Casual players need readable spaces and forgiving geometry; competitive players need skill-expression opportunities and strategic depth. What specific spatial design techniques let you serve both?
15. Pick the best-designed multiplayer map you have ever played. Explain what makes it great from a spatial design perspective — routing, pacing, sightlines, landmark hierarchy, and how the geometry creates memorable moments. What principles from that map would you carry into your own work?

---

### Mid General Designer

**Culture**
1. As a mid-level designer at a multiplayer studio, you will own individual features that plug into systems designed by more senior designers. How do you take creative ownership of your feature while respecting the constraints and vision someone else has set?
2. You have designed a feature and you are convinced it is the right approach, but your lead disagrees and wants you to try a different direction. When do you advocate harder, when do you execute their vision, and how do you tell the difference?
3. Multiplayer games demand rapid prototyping because you cannot evaluate a feature on paper — you have to play it with real players. How do you structure your work to get from concept to playable prototype as quickly as possible?

**Technical**
4. Walk us through how you would write a design specification for a new multiplayer game mode. What sections are essential, what level of detail does engineering need to implement without daily check-ins, and how do you handle edge cases you cannot predict?
5. Describe a specific game system you have balanced using spreadsheets or data modelling. What were the variables, what was your methodology, and how did the theoretical model compare to actual player behaviour once implemented?
6. How do you approach designing a feature that intersects with other designers' systems — for example, a reward system that touches economy, progression, and matchmaking? How do you identify and manage the dependencies before implementation?

**Collaboration**
7. You receive conflicting feedback on your feature design from the game design lead, the level design lead, and the engineering lead. Each has a valid perspective. How do you synthesise their input into a coherent direction, and when do you escalate versus resolve it yourself?
8. Describe how you work with a level designer to ensure a feature you have designed — say, a capture-point mechanic — actually works spatially in the maps they are building. What does that collaboration look like in practice?
9. Your feature is in playtesting and it is not working. Players are confused, engagement is low. How do you diagnose whether the problem is in your design, the implementation, the tutorialisation, or the players just needing more time to learn it?

**Leadership**
10. How do you take ownership of a feature through its full lifecycle — from initial concept through implementation, playtesting, iteration, and live tuning? What does "owning" a feature mean to you day-to-day?
11. You spot a significant design problem in a system outside your assigned feature — a progression cliff, an economy exploit, a broken interaction between two systems. How do you raise it constructively without overstepping into another designer's ownership?
12. How do you manage your own workload when you have a new feature design due, three bugs from your last feature, and iteration notes from a playtest all competing for your time? What is your prioritisation framework?

**Depth**
13. Design a multiplayer game mode from scratch for a team-based action game. Walk us through your starting point: what questions do you answer first, how do you define the win condition and pacing, how do you account for different team sizes, and how do you validate the concept before committing to full production?
14. Design a player progression system for a multiplayer game that motivates engagement without gating power. Players who have played 500 hours should not have a mechanical advantage over new players, but they should feel their investment is meaningfully rewarded. What are your design principles?
15. Describe a feature you have designed that went through significant iteration. What was the original design, what changed after playtesting, and what specifically did you learn about the gap between theory and player reality?

---

## Production Roles

---

### Shared Producer Questions (Art Producer, Assoc Producer, Tech Producer)

**Culture**
1. What kind of production culture do you believe in -- tight process or lightweight? Why?
2. When a developer tells you they think production is getting in the way of making the game, how do you react?
3. What is the biggest mistake you have made as a producer that affected team morale?
4. How do you handle it when you are the messenger for bad news -- scope cuts, delays, staffing changes?
5. What frustrates you about how studios typically run production?
6. Describe the best and worst producer you have worked with. What separated them?
7. How do you build trust with people who see your role as overhead?
8. When you disagree with a creative decision that is within the game director's authority, what do you do?
9. What makes you stay at a studio? What would make you leave?
10. How honest are you with your team about project health? Where is the line between transparency and creating panic?

**Collaboration**
11. When you inherit a project mid-development and discover the existing tracking is a mess -- tasks without owners, outdated statuses, no consistent naming -- how do you clean it up without halting everyone's work?
12. How do you handle external stakeholders who change requirements mid-milestone? What is your actual process for absorbing scope change without blowing up the committed plan?
13. A cross-discipline dependency is blocking progress: engineering is waiting on art, art is waiting on design sign-off, design says they already signed off. How do you untangle this in a remote team where you cannot put everyone in a room?
14. Describe how you run a cross-discipline planning session remotely. What is the format, how long does it last, and what artefacts come out of it that people actually use?
15. A lead comes to you with a vague concern -- "I think we might be in trouble on this feature" -- but cannot articulate why. How do you help them turn that instinct into something actionable?
16. You discover that two teams have been building towards different assumptions about a shared feature because the design spec was ambiguous. How do you resolve the misalignment and prevent it from happening again?
17. How do you handle the tension between giving a team autonomy and ensuring cross-team alignment? Where do you insert yourself, and where do you deliberately stay out?
18. An outsource partner delivers work that meets the brief but the internal team rejects it on subjective grounds -- "it does not feel right." How do you mediate between the external vendor and the internal team?
19. A discipline lead wants to escalate a staffing concern to studio leadership, but you think the concern is premature. How do you handle the disagreement without undermining the lead or gatekeeping access to leadership?
20. Describe a time when you had to coordinate a deliverable across more than three disciplines with competing priorities. What went well, what broke, and what would you change?

**Leadership**
21. How do you identify when someone on the team is struggling before they tell you? What signals do you watch for when your only contact is Slack messages and stand-up updates?
22. When a project needs to cut scope to hit a date, how do you decide what gets cut? Walk us through your framework and how you present it to the team without destroying morale.
23. A team member consistently delivers work late but insists their estimates were realistic. How do you diagnose whether it is an estimation problem, a capacity problem, a dependency problem, or a motivation problem?
24. How do you onboard a new team member mid-production? Not the HR paperwork -- the production onboarding. How do you get them contributing without drowning them in context or slowing down the rest of the team?
25. You notice that stand-ups have become status-reading rituals and nobody is actually solving problems in them. What do you do? Do you fix the stand-up, replace it, or kill it?
26. A senior developer wants to work in a way that does not fit your production process -- they refuse to estimate, they do not update tickets, they deliver great work on their own schedule. How do you handle someone who is high-performing but non-compliant?
27. How do you handle the moment when you realise you have been tracking the wrong thing -- the metrics look green but the build is clearly not where it should be? What do you do next?
28. When two leads are in conflict about priority and both escalate to you, how do you resolve it? What is your framework for making the call, and how do you communicate the decision?
29. Describe how you build a production process for a new team that has never worked together. What do you put in place on day one versus what do you let emerge organically?
30. How do you keep yourself accountable as a producer? Who gives you feedback on whether your processes are actually helping, and how do you seek that out?

---

### Art Producer (additional questions)

**Technical**
1. You join a project and discover that concept-to-engine turnaround for characters is averaging 14 weeks when the schedule assumes 8. Where do you start investigating? Walk us through how you would diagnose whether the bottleneck is in concepting, modelling, texturing, rigging, or review cycles.
2. How do you write an outsource art brief that gets consistent quality back? Walk us through what goes into the brief for a batch of environment props: reference material, technical specs, naming conventions, delivery format. What do you include that most people forget?
3. An art director wants to raise the visual quality bar mid-production, which means reworking assets that already passed review. How do you scope the impact across character, environment, and VFX pipelines, and what data do you bring to the conversation about whether it is feasible?
4. Walk us through how you track art asset progress across multiple disciplines -- concept, modelling, texturing, rigging, animation-ready, in-engine approved. What tool or system do you use, and how do you prevent the tracker from becoming stale within a week?
5. How do you estimate art production timelines when the visual style is still being established? Early in production, concept iterations can take twice as long as they will once the style is locked. How do you build that uncertainty into your schedule?
6. Describe how you manage the handoff between internal concept artists and external modelling vendors. What does the handoff package look like, what quality gates exist before the vendor starts work, and how do you handle revision rounds without blowing the budget?
7. A character modeller tells you that the concept art is unbuildable at the polygon budget -- the design has too many fine details that will not read at game resolution. How do you facilitate the conversation between the concept artist, the modeller, and the art director?
8. How do you track and manage texture memory budgets across an entire game? When the total exceeds the platform budget, how do you decide which assets get cut back, and how do you communicate those constraints to artists who have already finished their work?
9. You are managing a VFX pipeline where effects are authored in-engine and depend on animations, materials, and gameplay triggers that are all still in flux. How do you schedule VFX work when its dependencies are unstable?
10. Describe your approach to managing art outsourcing across multiple vendors simultaneously -- one for characters, one for environments, one for props. How do you maintain style consistency across vendors who never talk to each other?

**Depth**
11. You are managing art production for a multiplayer game with 12 playable characters, 8 maps, and a VFX budget of 200 unique effects. How do you build the master asset tracker, and what columns and views does each discipline lead actually need versus what just creates noise?
12. The internal art team can produce 60% of the assets needed for the next milestone. You need to outsource the other 40%. Walk us through your vendor selection, onboarding, and quality control process. How do you handle a vendor whose work is technically correct but stylistically off?
13. Describe how you coordinate a major art milestone review where environment, character, lighting, VFX, and UI art all need to be evaluated together in-engine. How do you structure the review so it is useful rather than a two-hour screenshot slideshow?
14. You discover that the art pipeline has an undocumented bottleneck: every asset must pass through a single technical artist for engine integration, and that person is at capacity. The team has been hiding this by informal queuing. How do you surface the problem, quantify the impact, and propose a solution without making the tech artist feel attacked?
15. The game is six months from beta and the environment team is 30% behind on the asset list. You cannot hire fast enough to close the gap with internal staff alone. Walk us through how you build a rapid outsourcing plan: scoping the work packages, selecting vendors under time pressure, managing quality when you do not have time for a proper onboarding cycle, and communicating the plan to the art director who is nervous about quality.
16. You are producing art for a live service game post-launch. The content cadence requires a new character skin every two weeks, a new map variant every month, and seasonal VFX updates. How do you build a sustainable art production pipeline for ongoing content when the team was structured for finite ship-and-done development?
17. The art team wants to adopt a new rendering technique (virtual texturing, nanite-style geometry, or similar) that would improve visual quality but requires reworking the asset creation pipeline. How do you evaluate the production impact -- retraining time, tool changes, asset rework -- and present the trade-off to leadership?
18. Describe how you manage the intersection of art production and platform-specific requirements. Console certification has specific rules about asset sizes, loading times, and visual parity. How do you build these constraints into your art pipeline rather than discovering them at cert submission?
19. You are producing a game where character skins are the primary revenue driver. Walk us through how you prioritise the skin production pipeline: which characters get skins first, how many tiers of skin quality exist, how you balance production cost against projected revenue, and how you coordinate with the monetisation team.
20. A milestone review reveals that the game's visual quality is inconsistent -- some areas look polished while others look like placeholder. The EP wants a visual quality pass across the entire game before the next publisher review. How do you scope that work, assign it across the art team, and track progress without derailing the feature work that is also due?

---

### Tech Producer (additional questions)

**Technical**
1. You are managing an engineering team that ships a new client build every Tuesday and a server deploy every Thursday. Walk us through your release checklist: what gets validated before each goes out, who signs off, and what is your rollback process when a Thursday deploy breaks matchmaking at 6pm?
2. Engineering leads are asking for two weeks to refactor the networking layer before building the next major feature. The milestone deadline has no slack. How do you evaluate whether the refactor is genuinely blocking or a preference? What evidence do you ask for, and how do you present the trade-off to stakeholders?
3. Your engineering team is split across gameplay, backend, and tools. Each sub-team estimates differently: gameplay uses story points, backend uses hours, tools does not estimate at all. How do you create a coherent capacity plan and milestone forecast across all three?
4. Walk us through how you manage engineering dependencies on external SDKs and middleware -- platform SDKs, networking middleware, analytics packages. How do you track version updates, evaluate upgrade risk, and schedule integration work without it always becoming a last-minute fire?
5. A gameplay feature is repeatedly missing its sprint commitments. The engineer says the work keeps expanding because the design is not locked. The designer says they are waiting for the prototype to inform the design. How do you break the deadlock?
6. How do you track and communicate technical debt to non-technical stakeholders? The engineering team says the codebase is getting fragile, but the milestone plan is full. What data or framing do you use to make the case for debt reduction?
7. Describe how you manage a platform certification submission from a production perspective. What is your timeline relative to the target submission date, what engineering work do you ring-fence for cert fixes, and how do you handle the situation when cert feedback requires changes that conflict with the content schedule?
8. You are managing engineering work for a game that runs dedicated servers. Walk us through how you coordinate server infrastructure work (scaling, monitoring, deployment automation) alongside gameplay feature development. How do you prevent infrastructure work from being perpetually deprioritised?
9. How do you run an engineering retrospective that actually produces change? Most retros generate a list of complaints that gets ignored. What format do you use, and how do you ensure action items from a retro are tracked and completed?
10. A critical engineer gives notice during a key milestone. They own a system that nobody else fully understands. Walk us through the next 48 hours: what do you prioritise, how do you manage the knowledge transfer during the notice period, and how do you adjust the milestone plan?

**Depth**
11. Describe how you would manage the engineering work for a major multiplayer feature that touches client, server, and infrastructure: a new ranked matchmaking system. What are the technical risks you would track, what cross-team dependencies would you surface early, and how do you stage the rollout?
12. A critical production incident takes the game offline during a weekend event. Walk us through your role as tech producer during and after: triage communication, who you pull in, how you keep leadership informed without distracting the engineers fixing it, and what your post-mortem process looks like.
13. The build pipeline is slow -- a full build takes 90 minutes and breaks twice a week on average. Engineers are losing half a day each time. How do you build the case for investing engineering time in build infrastructure when the feature backlog is already behind?
14. You are managing a live service game and need to coordinate a major engine upgrade while the game is live. Walk us through your production plan: how you phase the upgrade, how you manage the risk of regressions in live, how you keep content updates shipping during the transition, and what your rollback plan looks like.
15. The engineering team is split across three time zones. A feature requires tight collaboration between gameplay engineers in one zone and backend engineers in another, with only two hours of overlap per day. How do you structure the work and communication to keep velocity up?
16. Describe how you manage engineering capacity during the transition from development to live ops. The team that built the game needs to maintain it while also prototyping the next project. How do you split capacity, and how do you prevent live ops from consuming all engineering bandwidth?
17. You discover that the automated test suite is providing false confidence -- tests are passing but the game has obvious bugs that the tests do not catch. How do you work with the engineering lead to improve test coverage without stopping feature development?
18. A publisher requires a specific feature for a contractual milestone demo that the engineering team believes is technically risky. They can build it, but it might be unstable. How do you manage the tension between the contractual obligation and the engineering reality?
19. Walk us through how you would manage a major multiplayer stress test -- 1,000 concurrent players across multiple regions. What is your production checklist before the test, who needs to be on call during, how do you capture and act on the results, and how do you communicate findings to non-technical stakeholders?
20. The game has shipped and the first major content update is three weeks away. Engineering has 15 bugs from launch, 8 features for the update, and 3 infrastructure improvements that the backend lead says are critical before the player base grows. How do you build the sprint plan, and what does not make the cut?

---

### Assoc Producer (additional questions)

**Technical**
1. You are asked to set up the JIRA board for a new feature team of eight people (3 engineers, 2 artists, 1 designer, 1 QA, 1 animator). What issue types, workflow statuses, and board views do you create? What do you deliberately keep simple at the start?
2. A lead asks you to compile a status report for a milestone review tomorrow. You have 40 tasks across three boards, some are clearly outdated, and two people have not updated their tickets in a week. Walk us through how you get an accurate picture in four hours.
3. You are taking notes in a cross-discipline planning meeting where engineering, art, and design are all talking past each other about priorities. How do you capture decisions and action items in real time when the conversation is moving fast and half the decisions are implicit?
4. Walk us through how you set up a daily stand-up for a cross-discipline team of 12 people across two time zones. What format do you use, how long does it last, and what do you do when people start treating it as a status report instead of a problem-solving session?
5. How do you manage meeting notes and action items so they actually get followed up on? Most meeting notes disappear into Confluence and nobody reads them. What is your system?
6. You are asked to create a risk register for your feature team. What risks do you track, how do you score them, and how do you keep the register alive rather than letting it become a document that gets filled in once and never updated?
7. A lead asks you to pull together metrics on the team's velocity over the past three sprints. The data is inconsistent -- some sprints had holidays, one had a team member on sick leave, another had an unexpected priority change mid-sprint. How do you present the data honestly without it looking misleadingly bad?
8. Describe how you manage the backlog for a feature team. How do you keep it groomed, how do you handle the inevitable pile of low-priority items that grows forever, and how do you prevent the backlog from becoming a graveyard of forgotten work?
9. You are producing a feature that depends on assets from the art team and a system from the engineering team, both of which are running behind. How do you track cross-team dependencies when you do not own the other teams' backlogs?
10. Walk us through how you prepare for a sprint planning session. What do you do before the meeting to ensure it runs efficiently, and how do you handle the situation when the team realises mid-planning that the work is bigger than the sprint can hold?

**Depth**
11. Describe a situation where you realised a process you were running -- a stand-up, a report, a tracking method -- was not actually helping the team. How did you figure that out, and what did you do about it?
12. As an associate producer, you are often the person closest to the day-to-day work. A senior team member consistently bypasses the agreed workflow: does not update tickets, ships without QA sign-off, ignores the sprint commitment. How do you handle it when you are junior to them?
13. Where do you see yourself developing as a producer? What type of production do you want to specialise in -- art, tech, live ops, external development -- and what specifically about that area interests you?
14. You have been producing a feature for three months and it is finally shipping. The lead thanks the engineers and designers publicly but does not mention your contribution. How do you feel about that, and how do you think about the visibility of production work in a studio?
15. Describe a time when you were given a task with no clear process -- nobody had done it before at the studio, there was no template, no precedent. How did you figure out the approach, and what did the result look like?
16. You are supporting two feature teams simultaneously and their sprints are out of phase -- one plans on Monday, the other on Wednesday. How do you manage your own workload and context-switching without dropping things?
17. A producer more senior than you gives you feedback that you disagree with -- they want you to add more process to something you think is already working. How do you handle the disagreement?
18. You notice that the team's burndown chart looks healthy but the build does not reflect the progress. Tasks are being marked done but the feature is clearly not where it should be. What do you do?
19. Describe how you would hand off a project to another associate producer if you were moving to a different team. What do you document, what do you walk through in person, and what do you know will get lost despite your best efforts?
20. What is the most useful thing you have learned from a mistake you made as a producer? Not a generic lesson -- a specific situation where something went wrong and it changed how you work.

---

### Executive Producer

**Culture**
1. What kind of production culture do you want to build at this studio, and how does that differ from what you have seen at studios you have worked at before?
2. Describe the best studio culture you have experienced. What made it work, and how much of it was deliberate versus organic?
3. When the team is demoralised -- a bad review, a missed milestone, a key departure -- what do you actually do? Not the town hall speech. The real thing.
4. How do you handle it when you inherit a production culture that is dysfunctional but the team does not see it that way? They think it is fine. You know it is not.
5. What is your relationship with crunch? Not your policy statement -- your honest view on why it happens, when it is acceptable, and what you do when you see it emerging.
6. You are the most senior production person in the room. How do you create an environment where producers junior to you will tell you when they think you are wrong?
7. What frustrates you about how the games industry approaches production? What would you change if you could?
8. How do you build a relationship with a game director who has shipped multiple titles and sees producers as administrators rather than creative partners?
9. A studio merger or acquisition brings in a team with a completely different production culture. How do you integrate the two without either side feeling colonised?
10. What makes you stay at a studio long-term? What has made you leave in the past?

**Technical**
11. How do you evaluate whether a game is on track when you are not in the weeds every day? What leading indicators do you watch, and how do you get that information without creating a reporting tax on the production team?
12. Describe your approach to greenlight and stage-gate decisions. What evidence do you need to approve continued investment at each gate, and what does a "no" look like -- have you ever killed or paused a project?
13. You are overseeing two projects sharing engineering resources. One is in pre-production and needs rapid prototyping; the other is in beta and needs stability. How do you allocate shared talent, and what happens when both leads escalate to you on the same day?
14. How do you evaluate a game's readiness for a publisher milestone demo? The build is rough, the team wants more time, the publisher expects to see something. What is your framework for deciding what to show versus what to hide?
15. Walk us through how you build a master production schedule for a game with 18-month development. What are the major phases, what are the key dependency chains, and where do schedules typically break down between plan and reality?
16. How do you manage the transition from pre-production to production? That boundary is famously blurry in games. What criteria tell you the team is ready, and what happens when leadership wants to move to production but the team is not?
17. Describe your approach to risk management at the project level. Not the risk register template -- how do you actually identify, track, and mitigate risks in a way that changes team behaviour rather than being a document nobody reads?
18. You are overseeing a project that uses a third-party game engine. A major engine update drops mid-production. How do you evaluate the upgrade decision from a production perspective, and who is in the room for that call?
19. How do you track and report on project health to a publisher or board? What metrics do you include, how often do you report, and how do you handle the situation when the metrics look fine but your gut says the project is in trouble?
20. Walk us through how you manage the final three months before a game ships. What does your production cadence look like -- bug triage, feature lockdown, certification prep, marketing deliverables -- and how do you keep the team focused when everything feels urgent?

**Collaboration**
21. How do you work with a game director whose creative ambition consistently outpaces the team's capacity? You respect the vision, but the current trajectory means shipping 18 months late. What does that conversation look like?
22. Describe how you manage the relationship between internal teams and external partners -- publishers demanding milestone demos, platform holders requiring cert compliance, outsource studios needing clear briefs. How do you shield the team without becoming a bottleneck?
23. Information flow between leadership and the development floor is your responsibility. What gets shared transparently, what gets filtered, and how do you handle the situation where the team finds out about a major decision through rumour rather than you?
24. How do you work with a publisher that has a different definition of quality than your studio? They want to ship; you think the game is not ready. How do you navigate that tension when they hold the funding?
25. Describe how you manage the relationship between your production team and the discipline leads. Producers and leads can easily end up in territorial conflict about who owns the schedule versus who owns the work. How do you set that boundary?
26. A board member or investor asks you a direct question about the project that you know the honest answer to, but the CEO has been presenting a more optimistic picture. What do you do?
27. How do you coordinate across multiple outsource studios working on different parts of the game? Each has their own production methodology, their own communication style, and their own definition of "done." How do you create coherence?
28. The marketing team needs gameplay footage for a trailer, but the game is not in a state where any footage looks good. How do you work with marketing and development to create something authentic without derailing production?
29. A discipline lead comes to you and says they want to fire one of their team members. You think the person is salvageable with better management. How do you navigate that disagreement?
30. How do you handle the relationship between your studio and first-party platform partners (Sony, Microsoft, Nintendo)? What do those relationships require from you as EP, and how do you ensure the studio meets platform expectations without over-committing?

**Leadership**
31. How do you build a production department from scratch? What roles do you hire first -- internal producers, outsource managers, project coordinators? How do you define what production culture looks like before those people arrive?
32. You need to restructure a team mid-project: moving a senior engineer off a struggling feature, shifting an artist between projects, potentially letting a contractor go. Walk us through how you approach these decisions and the communication around them.
33. Post-mortems at most studios produce documents that nobody reads and nothing changes. How do you run a post-mortem that actually drives improvement in the next milestone or project?
34. How do you develop producers on your team? What does mentoring look like at the EP level -- what skills are you trying to build in your production staff, and how do you create opportunities for them to grow?
35. When you need to deliver bad news to the entire studio -- layoffs, project cancellation, a major pivot -- how do you prepare for that, how do you deliver it, and what do you do in the days after?
36. How do you handle the tension between being a studio leader and being a project leader? Your project needs you full-time, but the studio also needs you to think about hiring, culture, process, and strategy. How do you balance those responsibilities?
37. Describe a time you had to make an unpopular decision that you knew was right for the project. How did you communicate it, and how did you manage the fallout?
38. How do you ensure that the production team is not just servicing the development team but is genuinely adding strategic value? What does a production team that punches above its weight look like?
39. A promising project in your portfolio is showing signs of creative fatigue -- the team is executing but nobody is excited about what they are building anymore. What do you do?
40. How do you evaluate your own performance as EP? What signals tell you that you are doing the job well versus just keeping the lights on?

**Depth**
41. You inherit a project that is six months behind schedule with low team morale and a publisher losing patience. What is your 30-day plan? Be specific about what you assess, what you change, and what you deliberately leave alone.
42. Walk us through building a multi-year development plan for a new multiplayer game from concept through live service. How do you phase development, where are the critical decision gates, and how do you plan for the live ops team you will need post-launch?
43. You have shipped and now you are running a live service. Content cadence is slipping, the team is fatigued, and player retention is declining. How do you restructure production for sustainable live ops without burning out the team that just crunched to ship?
44. Describe how you would stand up production for a brand new studio -- no existing team, no existing process, first project about to start. What do you build in the first 90 days, and what do you deliberately leave until later?
45. You are overseeing a portfolio of three projects at different stages: one in concept, one in full production, one approaching ship. How do you allocate your time and attention across them, and what signals tell you when one needs more of your focus?
46. A project you are overseeing has been in pre-production for 12 months and the team still cannot articulate the core fun. The publisher is getting impatient. Walk us through your diagnostic process: how do you determine whether the team needs more time, a clearer brief, different leadership, or whether the project should be cancelled.
47. Describe how you manage the budget for a game development project across its full lifecycle. Where do overruns typically happen, how do you build contingency, and how do you handle the conversation with the publisher when the contingency is spent and the game is not done?
48. You are running a studio that ships a live service game while simultaneously developing a second title. The live game generates the revenue that funds the new project. How do you manage resource allocation when the live game demands more investment to maintain revenue but the new project needs talent to hit its milestones?
49. Walk us through how you handle a situation where your game ships to poor reviews but strong player retention. The press says the game is mediocre; the players keep playing. How does this affect your production priorities for the post-launch roadmap?
50. The studio has grown from 30 to 55 people over the past year. Processes that worked at 30 are breaking at 55 -- communication is slower, decisions take longer, people feel less connected. What do you change about how the studio operates, and what do you preserve?

---

## Audio Roles

---

### Audio Lead

**Culture**
1. You'd be building an audio department, not just doing audio work. What does a well-functioning audio department look like inside a multiplayer games studio, and how is that different from audio teams you've seen in film, TV, or music production?
2. We're fully remote across UK and Greece. Audio review requires critical listening, but everyone's monitoring setup is different — treated rooms, headphones, laptop speakers. How do you establish and enforce a quality baseline when you can't control listening environments?
3. Game audio lives downstream of almost every other discipline — a late design change, an animation retiming, a new VFX layer can all invalidate your work. How do you build resilience into your process so audio isn't perpetually reactive?

**Technical**
4. Walk us through how you'd structure a Wwise or FMOD project for a multiplayer action game from scratch — event hierarchy, bus routing, soundbank strategy, naming conventions. What decisions do you make in week one that you'll either thank yourself for or regret at month twelve?
5. In a 50-player match, you might have hundreds of sound sources competing simultaneously — abilities, footsteps, impacts, UI, ambient, music, voice comms. Describe your voice management and priority system. How do you decide what gets culled, what gets ducked, and what always plays? How do you handle the transition when a low-priority sound suddenly becomes gameplay-critical?
6. Spatial audio in multiplayer has to do double duty — it creates atmosphere AND conveys tactical information (enemy footsteps, ability direction, proximity). Walk us through your attenuation curves, occlusion setup, and HRTF approach. How do you test that players can actually localise sounds accurately, not just hear them?

**Collaboration**
7. Audio is often the last discipline brought into a feature. How do you embed yourself in pre-production so that game designers are specifying audio hooks and trigger points from the design doc stage, not bolting them on after gameplay is locked?
8. A VFX artist has built a 3-second ability effect. The animation is 2.8 seconds. The gameplay damage event fires at 1.2 seconds. The sound needs to sync to all three. Walk us through how you coordinate that across disciplines, and what happens when one of them changes without telling you.
9. You need to brief an external composer for adaptive music and an outsource house for 200+ combat sound effects. These are fundamentally different briefs. Walk us through what each one contains, what reference material you provide, and how you quality-gate the deliverables.

**Leadership**
10. You're establishing the audio pipeline from scratch — file formats, source control for audio projects, middleware version management, asset naming, review processes. What does your pipeline document look like, and how do you enforce it as the team scales?
11. How do you objectively evaluate audio quality? A mix can "sound good" to someone who made it but fail in-game. What criteria, reference targets, or measurement approaches do you use to maintain a consistent quality bar across all audio in the game?
12. As Audio Lead you'll need to make the case for audio resources — headcount, middleware licences, hardware, outsourcing budget. How do you translate audio quality into language that a producer or studio head actually responds to?

**Depth**
13. Design a mix priority system for a multiplayer combat game. You have a voice budget of 64 simultaneous voices on console, players are in a 50-person battle with abilities, ambient, music, and voice chat all competing. Walk us through your bus hierarchy, priority tiers, virtual voice behaviour, and how you handle the moment when 40 abilities fire simultaneously in a team fight.
14. Walk us through implementing a dynamic music system in Wwise or FMOD that responds to gameplay state — exploration, combat escalation, victory, defeat, and transitions between zones. What's the technical architecture? How do you handle state changes that happen faster than the music can transition? What does the handoff between interactive segments look like?
15. Your game ships on PC, current-gen console, and Switch. The same mix needs to sound correct on studio headphones, TV soundbars, laptop speakers, and handheld mode. How do you author and test for that range? What platform-specific mix adjustments do you make, and where do you draw the line on per-platform tuning versus a single master mix?

---

### Audio Mentor (3-Month Contract)

**Culture**
1. You have 12 weeks. The team needs to be measurably better at audio when you leave than when you arrived. That's a fundamentally different job from being an audio lead or a contractor doing audio work. What's your mental model for a short-term mentoring engagement versus a permanent role?
2. You'll be the most experienced audio person in the room, but you're temporary and the Audio Lead is permanent. How do you navigate the authority dynamic — sharing expertise without creating dependency on yourself or undermining the lead's ownership?
3. Mentoring audio professionals is different from mentoring, say, programmers. Audio skills involve subjective judgement, trained ears, and aesthetic sensibility that take years to develop. How do you accelerate development of listening skills and audio instinct in a compressed timeframe?

**Technical**
4. Walk us through your first-week audit process. You're dropped into an active multiplayer game project with an existing Wwise/FMOD implementation. What do you listen for in-game, what do you look at in the middleware project, and what do you check in the pipeline? How do you distinguish "this is a taste difference" from "this is objectively wrong"?
5. You find that the team's middleware project has grown organically — inconsistent event naming, no bus hierarchy strategy, soundbanks that load everything, RTPCs that overlap. You can't rebuild it in 3 months without disrupting production. What do you actually do? What gets fixed, what gets documented for later, and what gets left alone?
6. Describe how you'd teach someone the difference between implementing spatial audio that technically works (sounds come from the right direction) versus spatial audio that serves gameplay (players can make tactical decisions from audio cues alone). How do you structure that learning so it sticks after you leave?

**Collaboration**
7. The Audio Lead has been doing things a certain way for two years. Some of their approaches are suboptimal, but they work and the team is used to them. How do you introduce better practices without invalidating the lead's existing work or making the team feel like they've been doing everything wrong?
8. You need to transfer knowledge to people with different skill levels — the Audio Lead who needs advanced technique, a junior sound designer who needs fundamentals, and a programmer who implements audio systems but doesn't understand mix theory. How do you structure your time across those very different mentoring needs?
9. At week 8, you realise that the team's biggest gap is something you can't fully address in the remaining time — say, they need someone who can compose adaptive music and nobody on the team has that skill. How do you handle that honestly with studio leadership, and what do you leave behind to help them close the gap after you're gone?

**Leadership**
10. How do you assess skill gaps in the first week without making people feel tested or judged? Audio professionals can be defensive about their work — what's your approach to honest assessment that builds trust rather than eroding it?
11. You're going to leave behind documentation, templates, reference mixes, and process guides. But documentation rots the moment no one enforces it. What specifically do you do to make your knowledge transfer self-sustaining — what format, what accountability structures, what habits do you try to instil?
12. Three months from now, how will you know if this engagement was successful? What measurable or observable evidence would tell you the team retained what you taught, versus reverting to old habits within a month of your departure?

**Depth**
13. Scenario: The team's combat mix is muddy. Abilities blend together, players can't distinguish friendly from enemy audio, and everything gets louder as more players enter the fight until it's just noise. Rather than fixing it yourself, walk us through how you diagnose this with the team, teach them why it's happening, and guide them to a solution they understand well enough to maintain and extend.
14. You have 12 weeks to leave the biggest possible lasting impact on this studio's audio quality. You can't do everything. Walk us through your prioritisation — what do you tackle in weeks 1-4 that creates the foundation, what do you focus on in weeks 5-8 that builds capability, and what do you do in weeks 9-12 to ensure durability? Be specific about deliverables, not just themes.
15. Describe a mentoring engagement where you measurably improved a team's or individual's audio capability. What was the starting state, what did you do, what was the evidence of improvement, and what would you do differently now? If you haven't done formal mentoring, describe how you've informally levelled up colleagues and what you learned about effective knowledge transfer.

---

## QA Roles

---

### Mid QA Tester / Mid QA Tester (Contract)

**Culture**
1. Game QA means you are often the bearer of bad news close to deadlines — filing critical bugs when the team is desperate to ship. How do you deliver bad findings constructively without either softening them into uselessness or becoming the person everyone dreads hearing from?
2. Remote QA means you cannot just grab a dev and show them a bug on your screen. Walk us through how you write a bug report for a hard-to-describe issue — say, character movement that "feels floaty" after a specific network event — so that a developer in another timezone can reproduce it and understand the severity without a call.
3. After six months on the same game build, you know every system inside out and you stop noticing things a new player would catch immediately. What specific techniques do you use to counteract familiarity blindness — not in theory, but things you have actually done on a project?

**Technical**
4. You receive a new multiplayer build where a team-based ability is supposed to apply a buff to all nearby allies. Walk us through how you would test this feature specifically in a multiplayer context — what scenarios, network conditions, player counts, and edge cases would you check that you would not need to worry about in a single-player game?
5. Describe your experience with build verification testing. A fresh build lands on your machine — what is your smoke test checklist before you start any feature testing, and how does that checklist differ between a PC build and a console build?
6. A playtester reports that "combat feels sluggish" but nothing is technically broken — animations play, hits register, damage applies. How do you investigate and document a subjective "game feel" issue so that it is actionable for the development team rather than just an opinion?

**Collaboration**
7. You find a bug that only reproduces intermittently — maybe one in every ten attempts, and only in specific network conditions. Walk us through how you work with engineering to pin this down. What information do you gather, what tools do you use to simulate the conditions, and at what point do you file it even if you cannot reproduce it reliably?
8. You have found 40 bugs in a milestone build and the team can realistically fix 12 before submission. How do you approach severity classification and help the producer make the cut? What factors beyond "how bad is it" do you consider — platform certification risk, player-facing visibility, regression likelihood?
9. A designer tells you a feature is "working as intended" but your testing experience tells you players will find the behaviour confusing or frustrating. Give an example of how you have raised a design concern from a QA perspective without overstepping into game design territory.

**Leadership**
10. You notice the same category of bug keeps appearing across different features — say, UI elements not scaling correctly across resolution changes, or audio triggers firing twice during state transitions. How do you package this as a systemic issue rather than just filing individual bugs, and who do you take it to?
11. A new build drops and you have a regression suite plus two new features to test. Walk us through how you structure your day — what gets tested first, how do you decide what subset of regression cases to run, and how do you communicate coverage gaps if you cannot test everything before the next build arrives?
12. You are working alongside a junior tester who files bugs with vague reproduction steps and inconsistent severity ratings. Without being their manager, how do you help them improve their bug reporting quality through your own work practices and interactions?

**Depth**
13. We are preparing a multiplayer game for platform certification on PlayStation and Xbox. From a QA perspective, what are the key areas you would focus your testing on to reduce the risk of a failed submission? Walk us through the types of issues that typically cause cert failures and how you test for them.
14. Describe the most complex multiplayer bug you have encountered in your career. How did you discover it, what made it difficult to isolate, and what was ultimately causing it? We are looking for the investigative process, not just the outcome.
15. We are about to launch a live service multiplayer game with regular content updates. How would you approach structuring your regression testing so that each update gets adequate coverage without re-testing the entire game every time? What gets tested every build, what rotates, and how do you decide?

---

## Specialist Roles

---

### CTO

**Culture**
1. You are joining a 55-person remote studio split between the UK and Greece. Engineering is roughly 15-20 people. How do you build a shared engineering culture — coding standards, review norms, architectural principles — across two countries and multiple time zones, without being physically present?
2. Game studios often treat tech debt as something to fix "after we ship," except there is always another milestone. Walk us through a real situation where you had to make a hard call between shipping on time and addressing technical risk that could bite you in live operations. What did you decide and what happened?
3. At a studio this size, the CTO is still close enough to the codebase to have strong opinions about implementation. How do you decide when to be in the code versus when to step back? How has that boundary shifted as teams you have led have grown?

**Technical**
4. Our game is a multiplayer title targeting PC and console. Walk us through the key architectural decisions you would make in the first 90 days: engine choice, networking topology, backend services, build infrastructure. How do you make these decisions stick when the team will live with them for three to five years?
5. Platform certification (Sony TRC, Microsoft XR, Nintendo Lotcheck) is a gating function that can delay a launch by weeks. How do you build cert compliance into the development process from day one rather than treating it as a pre-launch checklist? What are the most common cert failures you have seen, and how do you prevent them?
6. A multiplayer game as a service needs backend infrastructure that handles matchmaking, player progression, live events, analytics, and server orchestration. For a studio of our size, where do you draw the build-versus-buy line on each of these? What is your framework for evaluating third-party services like PlayFab, AccelByte, or Pragma versus building in-house?

**Collaboration**
7. The Game Director wants a feature that requires server-authoritative physics simulation for 50+ players. Your lead network engineer says it is technically possible but will require six months of R&D with uncertain outcomes. How do you facilitate that conversation between creative ambition and technical reality without becoming the "no" person?
8. External partners — platform holders, middleware vendors, outsource studios — each have their own SDK timelines and technical requirements. Describe how you manage these relationships so that external dependencies do not become internal blockers. Give a specific example.
9. The CEO asks: "Why is this taking so long? It is just a matchmaking system." How do you explain technical complexity to non-technical leadership in a way that builds trust rather than creating an adversarial dynamic?

**Leadership**
10. You are scaling engineering from 15 to 30 people over 18 months for production ramp. What roles do you hire first? How do you maintain code quality and architectural coherence as the team doubles? What breaks first when you scale too fast?
11. A senior engine programmer and your lead gameplay programmer have fundamentally different views on the entity component system architecture. Both are strong technically, both have good arguments. How do you resolve this without damaging either relationship or ending up with a compromised architecture?
12. Senior individual contributors in games often hit a ceiling because there is no formal staff or principal engineer track. How have you structured engineering career paths at a studio level to retain your best ICs without forcing them into management?

**Depth**
13. Describe the most costly technical decision you have seen in a game project — one that seemed reasonable at the time but created significant problems later. What was the root cause, and how would you have caught it earlier with the processes you use now?
14. If you were defining the technical vision for a live-service multiplayer game at a 55-person studio, what are the three architectural bets you would make in the first six months? What would you explicitly defer, and why?
15. An engine update from Unreal (or Unity, or your engine of choice) introduces breaking changes that affect your custom networking layer and your art pipeline simultaneously. You are eight months from launch. Walk us through how you evaluate whether to upgrade, fork, or stay on the old version. Who is in the room for that decision?

---

### Head of Finance

**Culture**
1. Game development is almost entirely people cost — salaries, contractors, outsource studios. There is very little COGS flexibility. When the studio needs to cut spend, you are effectively talking about cutting people. How do you approach that conversation with leadership, and how do you present financial alternatives before it reaches that point?
2. Our studio operates in both the UK and Greece, with employees on different employment contracts, tax regimes, and social security systems. Walk us through your experience managing multi-jurisdiction payroll and what specifically goes wrong when it is not set up properly from the start.
3. Creative teams often see finance as the department that says no. How do you build a relationship with leads and producers where they come to you early with spending plans rather than presenting you with a fait accompli?

**Technical**
4. Walk us through how you would structure the chart of accounts for a game studio that needs to track costs per project, per department, and per discipline, while also supporting VGEC (Video Games Expenditure Credit) claims. What cost centres do you create, and how do you ensure time and expense data flows into them accurately?
5. A publisher deal offers a GBP 2M recoupable advance against a 70/30 net revenue split post-recoup, with milestone payments tied to alpha, beta, and launch deliverables. How do you model the cash flow, recognise revenue under FRS 102, and stress-test the deal for scenarios where milestones slip or the game underperforms?
6. Development cost capitalisation is a contentious area in games — when does pre-production become production for accounting purposes? How do you determine the point at which development costs should be capitalised versus expensed under IAS 38 or FRS 102, and what evidence do you need to support that decision?

**Collaboration**
7. A producer tells you their project needs five additional contractors for three months to hit the milestone. The monthly burn would increase by GBP 60K. Walk us through how you evaluate that request — what financial data do you need, what questions do you ask the producer, and under what conditions do you approve it?
8. The CEO wants to see a monthly financial pack that takes five minutes to read but tells them everything they need to know about studio health. What goes in it? What do you leave out? How does it change as the studio moves from development into live ops?
9. Investor reporting for a pre-revenue game studio is different from reporting for a live product. Describe how you structure quarterly investor updates that show progress, manage expectations, and build confidence without overselling.

**Leadership**
10. You are the first dedicated finance hire at a studio that has been running on a part-time accountant and spreadsheets. What do you implement in the first 90 days? What financial controls are non-negotiable from day one, and what can wait?
11. The studio is six months from running out of cash if no new funding arrives. The CEO is optimistic about a deal closing. Walk us through how you manage the runway, what contingency plans you build, and at what point you escalate concerns about the studio's viability.
12. How do you approach the VGEC versus R&D tax credit decision for a game studio? Under what circumstances would you claim one versus the other, and what are the common mistakes studios make that result in HMRC challenges?

**Depth**
13. Build us a rough financial model for a multiplayer live-service game: GBP 5M development budget over 24 months, F2P with battle pass and cosmetic IAP, targeting 500K MAU at launch. What are your revenue assumptions, what are the key cost drivers post-launch, and where does the model break?
14. A studio has staff in the UK on PAYE, contractors in Greece, and an outsource partner in Eastern Europe billing in EUR. Describe how you manage FX exposure, transfer pricing considerations, and the practical mechanics of paying everyone correctly and on time each month.
15. The studio's game launches and underperforms — revenue is 40% below forecast in the first quarter. The publisher is asking for a revised business plan. Walk us through how you reforecast, what costs you can flex, what commitments are fixed, and how you present the path forward.

---

### HR Operations

**Culture**
1. The games industry has a turnover rate above 20% — significantly higher than tech generally. At a 55-person studio, that means losing 10+ people a year. What is your approach to retention that goes beyond pizza parties and wellness webinars? What have you actually seen move the needle?
2. Our team includes UK employees on standard employment contracts and Greek employees whose contracts must comply with Greek labour law — mandatory 14-month pay, different notice periods, different severance rules, different public holidays. How do you operationally manage two employment frameworks in one studio without creating a two-tier culture?
3. Crunch is the games industry's original sin. Some developers see it as a necessary part of shipping, others as a failure of planning. Where do you stand, and how do you operationalise that position as the person writing the policies and tracking the hours?

**Technical**
4. Walk us through selecting and implementing an HRIS for a 55-person remote studio with employees in two countries. What are your non-negotiables in the system, and how do you handle the fact that most HRIS platforms handle UK payroll well but Greek payroll poorly or not at all?
5. Compensation benchmarking in games is notoriously opaque — UKIE and TIGA publish some data, Glassdoor is unreliable, and studios guard their salary bands. How do you build a defensible compensation framework when the market data is incomplete? What sources do you actually trust?
6. A remote game studio needs policies on working hours, overtime, equipment provision, data security on personal devices, and IP assignment. But overloading a 55-person company with a 100-page handbook kills adoption. How do you decide what goes in writing, what goes in onboarding, and what is handled through culture and norms?

**Collaboration**
7. A lead tells you one of their senior artists is consistently underperforming, but the artist is well-liked and losing them would hurt team morale. The lead wants you to "handle it." What is your role, what is the lead's role, and how do you navigate the performance conversation when the employee is in a different country with different employment protections?
8. Game industry candidates care about things that candidates in other industries do not: what engine you use, what games the team has shipped, whether there is crunch, and whether they get credited. How do you work with hiring managers to write job adverts that speak to what game developers actually care about?
9. An employee in Greece tells you they are experiencing burnout and requests a reduced schedule. Under Greek labour law, what are your obligations? How do you balance the employee's needs with the team's production schedule, and how does this differ from handling the same situation with a UK employee?

**Leadership**
10. You are building the HR function from scratch in a studio that has been managed by founders doing HR ad hoc. What are the three highest-risk compliance gaps you would expect to find, and how do you close them without creating the impression that you are there to impose bureaucracy?
11. The studio needs to hire 15 people in six months for a production ramp. Half the roles are specialist game dev positions (technical animator, senior network engineer, VFX artist). How do you source candidates for roles where the total addressable talent pool in the UK is measured in hundreds, not thousands?
12. Performance reviews in games are complicated because "good work" is partly subjective — an animation can be technically correct but lack personality. How do you build a review framework that respects creative judgement while still being fair, consistent, and legally defensible across two jurisdictions?

**Depth**
13. Describe your 90-day plan to stand up HR operations for a 55-person remote studio with employees in the UK and Greece, no formal HRIS, inconsistent contracts, and no documented policies. What do you do first, second, and third? What is the first thing you audit?
14. Two senior team members — one in the UK, one in Greece — are in a workplace conflict that is affecting their teams. The UK employee wants to raise a formal grievance. The Greek employee says the issue is cultural and does not warrant formal process. Walk us through how you manage this across two legal systems and two sets of cultural expectations.
15. A competitor studio has just announced layoffs, and three of your best people have received LinkedIn messages from recruiters within a week. You cannot match the salaries being offered. What retention levers do you pull, and how do you make the case to leadership for any that require investment?

---

### Jira Admin Contractor

**Culture**
1. Game developers often have a visceral dislike of Jira — they have been burned by over-configured instances that slow them down. You are walking into a studio that currently tracks work in spreadsheets and Teams channels. How do you introduce Jira without it feeling like you are imposing bureaucracy on a creative team?
2. This is a short-term contract — you need to set up Jira and leave behind a system the studio can maintain without you. How does knowing you will not be there long-term change the complexity of what you build? What do you deliberately keep simple so a non-admin can maintain it?
3. Art teams and engineering teams track work fundamentally differently in game development. Engineers think in sprints and story points; artists think in asset lists and pipeline stages (concept, blockout, first pass, polish, final). How do you configure one Jira instance to serve both without either team feeling like they are using the wrong tool?

**Technical**
4. Walk us through the issue type hierarchy you would set up for a game studio with art, engineering, design, and QA departments. What issue types do you create, what is the parent-child structure, and how do you handle the reality that a single gameplay feature might generate art tasks, engineering tasks, audio tasks, and QA test cases simultaneously?
5. QA in a game studio files bugs against specific builds, specific platforms (PC, PS5, Xbox), and specific areas of the game. How do you configure Jira's fields, labels, and filters so that QA can file bugs efficiently and producers can pull meaningful reports by platform, severity, area, and build number?
6. Describe your approach to workflow design for a game studio. An art asset workflow (concept approved > modelling > texturing > rigging > in-engine review > approved) is fundamentally different from an engineering workflow (to do > in progress > code review > QA > done). How do you handle multiple workflows in the same project without creating a maintenance nightmare?

**Collaboration**
7. You need to gather requirements from five different departments in your first week. The art director wants visual boards, the lead programmer wants velocity tracking, the producer wants milestone burndown, the QA lead wants regression suite management, and the game director just wants to see "what is everyone working on." How do you reconcile these into a single configuration?
8. A producer asks you to add a required "time logged" field to every ticket transition. You know from experience that this will tank adoption — people will enter garbage data to get past the field. How do you push back, and what alternative do you propose to give the producer the data they actually want?
9. Half the studio has never used Jira. You have two weeks to get them productive. What does your training approach look like? How do you handle the difference between engineers who will figure it out and artists who need a completely different onboarding experience?

**Leadership**
10. You are inheriting whatever ad hoc tracking the studio has been using. Before you build anything in Jira, what do you audit? What data do you need from the existing system, and how do you decide what migrates and what starts fresh?
11. Six months after you leave, the studio's Jira instance has accumulated 200 custom fields, five deprecated workflows, and three board configurations nobody uses. How do you prevent this from happening? What governance do you put in place before you hand over?
12. How do you measure whether your Jira setup is actually working? Not whether people are using Jira (that is easy to measure), but whether the configuration is making teams more effective at shipping the game. What signals do you look for?

**Depth**
13. The studio is migrating from a Teams/Excel tracking system to Jira Cloud. There are roughly 1,500 existing tasks across three spreadsheets, inconsistently formatted, with no standard taxonomy. Walk us through the migration plan: what you clean up before import, how you map the data, how you validate, and how you run the cutover without losing production continuity.
14. Walk us through integrating Jira with a game studio's other tools: Perforce for version control, Slack for communication, Jenkins or TeamCity for CI, and Confluence for documentation. Which integrations are high-value, which are traps, and how do you keep the notification volume from burying people?
15. A producer asks you to set up milestone tracking in Jira for a game with four milestones (vertical slice, alpha, beta, launch) and 12 feature areas, each owned by a different lead. How do you structure this so the EP can see a single milestone health view while each lead can manage their own backlog independently?

---

### UI/UX Lead (New Role)

**Culture**
1. This studio has shipped games without a dedicated UX person. Developers have been building UI based on their own instincts and whatever the art team mocks up. You are establishing a new function. How do you demonstrate the value of UX to a team that does not yet know they need it, without being perceived as criticising their past work?
2. Game UI exists in a unique space — it must be functional under time pressure, readable at a glance during combat, aesthetically integrated with the game world, and operable across keyboard/mouse, controller, and potentially touch. How do you prioritise those competing demands when they conflict?
3. In a studio of 55 people, you are likely the only UX practitioner. You will not have a UX research team, a dedicated prototyper, or a UI art team that reports to you. How do you do meaningful UX work within those constraints? What do you do yourself and what do you delegate or simplify?

**Technical**
4. Walk us through designing a HUD for a 50-player multiplayer action game. You need to communicate player health, ability cooldowns, team information, minimap, objective state, and incoming threat direction. How do you decide what is always visible, what appears contextually, and what gets cut? How do you validate that players can parse this information in a 200ms glance during combat?
5. Our game targets PC and console. Console UI must respect safe zones, work at couch distance, and support controller navigation with no mouse cursor. PC players expect mouse-driven menus with hover states and keyboard shortcuts. How do you design a UI system that serves both without building two separate interfaces?
6. You need to design the social UI for a multiplayer game: party formation, friend list, in-game communication (text and voice), match history, and player profiles. These screens get the most use but the least design attention in most studios. Walk us through your approach — what are the common UX failures in social UI and how do you avoid them?

**Collaboration**
7. The game designer wants to add a new resource to the HUD — a "stamina" bar that was not in the original design. The art director says the HUD is already too cluttered. The gameplay programmer says they can add it in a day. You think the information should be communicated through animation rather than a bar. How do you facilitate that discussion?
8. An engineer has built a functional settings menu with 40+ options in a single scrolling list. It works. It is also terrible UX. How do you retrofit good UX onto an existing implementation without asking the engineer to rebuild from scratch? What is your approach to incremental UX improvement on shipped code?
9. You want to run usability testing but the studio has never done it. You have no lab, no recruitment budget, and no dedicated research staff. How do you set up lightweight playtesting that gives you actionable UX data? Who do you test with, what do you observe, and how do you present findings so the team acts on them?

**Leadership**
10. You are the first UX hire. The art director has strong opinions about UI aesthetics. The game director has strong opinions about information hierarchy. Producers want you to support every feature team. How do you establish your domain authority without creating territorial conflicts in your first three months?
11. When you have to choose between doing deep UX work on one critical flow (onboarding, core gameplay loop) versus doing shallow UX reviews on ten features, how do you make that call? What criteria determine where your time creates the most value?
12. The game's visual identity is still being established — the art team is exploring style directions. How do you create UI patterns and a style guide that are flexible enough to survive visual pivots but specific enough to give engineers something to build from?

**Depth**
13. If we asked you to design the complete UI system for a multiplayer game from scratch — menus, HUD, social features, settings, matchmaking, onboarding tutorial, in-game store — how do you scope and sequence that work across a 24-month development cycle? What do you build first, and what can wait until beta?
14. Localisation breaks game UI in ways it rarely breaks web UI — German and Russian strings are 30-40% longer, right-to-left languages reverse layouts, and CJK characters need different font sizes. How do you design UI systems that handle localisation gracefully without every screen requiring custom work per language?
15. Accessibility in games has moved from "nice to have" to platform certification requirement. Walk us through the accessibility features you would implement in a multiplayer game's UI: colourblind modes, text scaling, input remapping, screen reader support, subtitle customisation. How do you scope this work, and what do you ship at launch versus patch in?

---

## Question Count Summary

| Role | Questions |
|------|-----------|
| Lead Animator | 15 |
| Lead Concept Artist | 15 |
| Snr Environment Artist | 15 |
| Snr Lighting Artist | 15 |
| Snr Technical Artist | 15 |
| Sr Character Modeler | 15 |
| Sr VFX Artist | 15 |
| Technical Animator | 15 |
| Lead Full Stack Developer | 15 |
| Lead Gameplay Developer | 15 |
| Snr Network Engineer | 15 |
| Tools Engineer | 15 |
| IT Lead | 15 |
| Game Design Lead | 15 |
| Level Design Lead | 15 |
| Senior Level Designer | 15 |
| Mid General Designer | 15 |
| Art Producer | 30 shared + 20 own |
| Assoc Producer | 30 shared + 20 own |
| Tech Producer | 30 shared + 20 own |
| Executive Producer | 50 |
| Audio Lead | 15 |
| Audio Mentor (3-Month Contract) | 15 |
| Mid QA Tester / Mid QA Tester (Contract) | 15 |
| CTO | 15 |
| Head of Finance | 15 |
| HR Operations | 15 |
| Jira Admin Contractor | 15 |
| UI/UX Lead (New Role) | 15 |
| **Total unique questions** | **~539** |
