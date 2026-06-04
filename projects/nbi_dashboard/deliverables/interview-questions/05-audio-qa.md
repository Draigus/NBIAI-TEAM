### Audio Lead

**Culture**
1. Think about the best and worst teams you have worked on in audio. What was the single biggest difference between them — and which side of that difference do you naturally fall on?
2. When an art director or designer dismisses audio as "we'll add sound effects later," how do you handle that?
3. What's the hardest creative feedback you've received on your audio work, and how did it change what you delivered?
4. What frustrates you about how most game studios treat audio?
5. How do you handle it when someone with no audio background has strong opinions about your mix?
6. You would be the most senior audio person here. Some people thrive with that autonomy; others find it isolating. Which are you, and what support do you need to do your best work?
7. Our studio is fully remote across UK and Greece. Audio review requires critical listening, but everyone's monitoring setup is different. How do you feel about giving and receiving audio feedback when you cannot control what people are hearing it on?
8. What would make you leave an Audio Lead role you otherwise enjoyed?
9. How do you react when a feature ships and nobody mentions the audio, versus when they specifically praise it? Which matters more to you and why?
10. Tell us about a creative disagreement with a non-audio colleague that made the final product better. What did you learn about yourself from it?

**Technical**
1. Walk us through how you'd structure a Wwise or FMOD project for a multiplayer action game from scratch -- event hierarchy, bus routing, soundbank strategy, naming conventions. What decisions do you make in week one that you'll either thank yourself for or regret at month twelve?
2. In a 50-player match, you might have hundreds of sound sources competing simultaneously -- abilities, footsteps, impacts, UI, ambient, music, voice comms. Describe your voice management and priority system. How do you decide what gets culled, what gets ducked, and what always plays?
3. Spatial audio in multiplayer has to do double duty -- it creates atmosphere AND conveys tactical information. Walk us through your attenuation curves, occlusion setup, and HRTF approach. How do you test that players can actually localise sounds accurately?
4. Describe your approach to designing audio for a character ability that has a wind-up, an impact, and a cooldown. How do you layer those elements so the player gets clear feedback about timing and state without the sound design becoming cluttered?
5. How do you approach dynamic range management in a multiplayer game where quiet ambient moments and loud team-fight chaos can happen within seconds? What compression and limiting strategies do you apply at the bus level versus the individual event level?
6. Walk us through how you handle audio memory budgets on console versus PC. When you have a hard cap on loaded soundbank size, how do you decide what stays resident, what streams, and what gets loaded per-level?
7. Describe your approach to footstep systems in a multiplayer game -- surface detection, material switching, speed-based variation, and the sheer number of simultaneous footstep events in a 50-player match.
8. How do you design UI audio for a game -- menu navigation, notifications, ability cooldown pips, error states? What makes the difference between UI sounds that feel polished and ones that feel like placeholder?
9. What is your methodology for creating audio variation so that repeated gameplay events do not become fatiguing after hundreds of hours of play? How many variants is enough, and when do you use randomisation versus round-robin?
10. Describe how you would set up real-time parameter control (RTPCs) to link audio behaviour to gameplay state -- health level affecting heartbeat intensity, distance affecting reverb sends, combat escalation driving music intensity.

**Collaboration**
1. Audio is often the last discipline brought into a feature. How do you embed yourself in pre-production so that game designers are specifying audio hooks and trigger points from the design doc stage?
2. A VFX artist has built a 3-second ability effect. The animation is 2.8 seconds. The gameplay damage event fires at 1.2 seconds. The sound needs to sync to all three. Walk us through how you coordinate that across disciplines.
3. You need to brief an external composer for adaptive music and an outsource house for 200+ combat sound effects. These are fundamentally different briefs. Walk us through what each one contains.
4. A level designer has built an environment with a strong atmospheric mood but the ambient soundscape competes with combat audio during fights. How do you work with the level designer to resolve this?
5. How do you work with the network engineer when audio events need to replicate across clients? Walk us through how you decide what is locally predicted versus server-confirmed.
6. The game director wants every character to have a unique audio identity -- distinct footsteps, ability sounds, hit reactions, voice lines. That is 12 characters times dozens of events. How do you negotiate scope?
7. Describe a time you had to push back on a visual effect because it created an impossible audio design problem. How did you propose an alternative?
8. How do you coordinate with the localisation team on voice-over pipeline -- casting, recording, integration, and lip sync?
9. When a producer asks you to estimate audio work for a milestone, how do you break it down? What is your framework for scoping audio work honestly?
10. How do you handle the relationship with QA when they file audio bugs? "The sound is wrong" is common. How do you help QA file audio bugs that you can actually action?

**Leadership**
1. You're establishing the audio pipeline from scratch -- file formats, source control for audio projects, middleware version management, asset naming, review processes. What does your pipeline document look like?
2. How do you objectively evaluate audio quality? What criteria, reference targets, or measurement approaches do you use to maintain a consistent quality bar?
3. As Audio Lead you'll need to make the case for audio resources -- headcount, middleware licences, hardware, outsourcing budget. How do you translate audio quality into language a producer responds to?
4. How do you onboard a new sound designer onto a project with an existing middleware implementation, established naming conventions, and hundreds of existing events?
5. When you review another audio professional's work and the technical implementation is fine but the creative choices are not landing, how do you give that feedback constructively?
6. How do you structure audio reviews in a remote team? What review format actually works for evaluating audio?
7. You discover that a gameplay feature shipped with placeholder audio that QA never flagged, players never noticed, and the game designer considers "good enough." You know it is placeholder. The producer says there is no time to replace it. At what point do you accept that "good enough" is the standard, and how do you prevent placeholder audio from becoming permanent across the rest of the project?
8. You need to build the case for purchasing a specific piece of audio middleware or a sound library subscription. How do you justify audio tooling expenditure?
9. How do you manage the relationship between in-house audio work and outsourced audio deliverables to maintain a consistent sonic identity?
10. Describe how you would build an audio style guide for a new game. What specific information does the document contain that allows another sound designer to create assets that match your creative vision?

**Depth**
1. Design a mix priority system for a multiplayer combat game. You have a voice budget of 64 simultaneous voices on console, players are in a 50-person battle. Walk us through your bus hierarchy, priority tiers, and virtual voice behaviour.
2. Walk us through implementing a dynamic music system in Wwise or FMOD that responds to gameplay state -- exploration, combat escalation, victory, defeat, and transitions between zones.
3. Your game ships on PC, current-gen console, and Switch. The same mix needs to sound correct on studio headphones, TV soundbars, laptop speakers, and handheld mode. How do you author and test for that range?
4. Walk us through designing the complete audio for a new character archetype -- a heavy melee tank with a ground-slam ultimate, a shield ability, and passive armour sounds during movement.
5. Describe how you would build an audio occlusion and propagation system that works in a multiplayer map with destructible environments.
6. You inherit a game project where all audio was implemented by a programmer with no audio background. You have four weeks before the next milestone. Walk us through your triage.
7. Walk us through designing the audio for a full multiplayer map -- ambient soundscapes for different zones, reverb zones, environmental storytelling through sound.
8. Describe how you would approach audio for a live-service game where new content ships every 6-8 weeks. How do you build your pipeline so that adding new content is systematic?
9. Competitive players complain that audio gives unfair positional advantages based on headphone quality. How do you approach the balance between rewarding good equipment and ensuring competitive fairness?
10. If you could redesign one aspect of how game audio middleware works, based on problems you have encountered in production, what would it be and why?

---

### Audio Mentor (3-Month Contract)

**Culture**
1. What kind of mentor are you -- do you lead by showing how you would do it, or by asking questions until the mentee finds their own answer?
2. How do you handle a mentee who is resistant to changing their approach -- not because they disagree, but because change feels like admitting they have been doing it wrong?
3. What is the most important quality in someone you are mentoring, and what is a quality that makes mentoring significantly harder?
4. You will be the most experienced audio person in the room, but you are temporary. Does that dynamic energise or frustrate you?
5. How do you handle the moment when you realise a mentee's ceiling is lower than you initially expected?
6. Describe a time you gave someone feedback on their audio work that genuinely upset them. How did you handle it?
7. You are going to hear work that is not up to your standard. How do you stay constructive rather than critical when everything you listen to needs improvement?
8. How patient are you, honestly? Mentoring means watching someone take three times longer to reach a solution you could see immediately.
9. What would make this engagement feel like a failure to you, even if the studio said they were satisfied?
10. How do you handle it when the person you are mentoring disagrees with your recommendation and wants to go a different direction?

**Technical**
1. Walk us through your first-week audit process. You're dropped into an active multiplayer game project with an existing Wwise/FMOD implementation. What do you listen for in-game?
2. You find that the team's middleware project has grown organically -- inconsistent event naming, no bus hierarchy strategy, soundbanks that load everything. You can't rebuild it in 3 months. What do you actually do?
3. Describe how you'd teach someone the difference between spatial audio that technically works versus spatial audio that serves gameplay.
4. The team's mix falls apart during large-scale combat. Rather than fixing the bus hierarchy yourself, how do you walk the Audio Lead through diagnosing and solving the problem?
5. How do you teach someone to hear the difference between "this sounds acceptable" and "this sounds professional"?
6. Walk us through how you would conduct a structured listening session with the audio team.
7. The team is using middleware features they do not fully understand. How do you teach the "why" behind middleware architecture?
8. Describe your approach to teaching someone how to profile and optimise audio performance.
9. How do you evaluate whether the team's sound design aesthetic is consistent and intentional versus accumulated and accidental?
10. The team has never done a proper mastering pass on their game audio. How do you teach them to hear these issues and build a mastering workflow?

**Collaboration**
1. The Audio Lead has been doing things a certain way for two years. Some approaches are suboptimal but they work. How do you introduce better practices without invalidating existing work?
2. You need to transfer knowledge to people with different skill levels -- the Audio Lead, a junior sound designer, and a programmer. How do you structure your time?
3. At week 8, you realise the team's biggest gap is something you can't fully address in the remaining time. How do you handle that honestly with leadership?
4. The Audio Lead asks you privately whether they are the right person for the role long-term. How do you give honest feedback without overstepping?
5. A non-audio lead asks you directly for audio changes, bypassing the Audio Lead. How do you handle requests that come to you because of your seniority?
6. The programming team has limited bandwidth for audio implementation requests. How do you help the audio team work within that constraint?
7. You disagree with the Audio Lead's creative direction on a key aspect. How do you handle a creative disagreement where you have more experience but they have the permanent role?
8. A producer tells you in week 2 that the audio backlog is lower priority than a feature push and your mentoring sessions are being bumped for sprint work. You have 10 weeks left. How do you make the case that audio mentoring time is protected without becoming a political problem?
9. The team includes a junior member who has potential but is currently underperforming. The Audio Lead has not addressed it. Do you raise it, coach through it, or leave it alone?
10. Teaching someone to hear subtle mix problems remotely is fundamentally harder than in person — you cannot control their monitoring environment, room acoustics, or listening volume. How do you calibrate a shared listening standard across a remote team so your feedback actually lands?

**Leadership**
1. How do you assess skill gaps in the first week without making people feel tested or judged?
2. You're going to leave behind documentation, templates, reference mixes, and process guides. What specifically do you do to make your knowledge transfer self-sustaining?
3. Three months from now, how will you know if this engagement was successful?
4. How do you prioritise what to teach? What is your framework for deciding "they need this now" versus "this can wait"?
5. Describe how you would structure a weekly cadence for the engagement. How does that cadence evolve from week 1 to week 12?
6. How do you handle the politics of being a temporary external expert?
7. You will inevitably identify problems that are not audio problems. What do you raise and what do you leave alone?
8. How do you create accountability for learning without being a manager?
9. At the end of your 12-week engagement, you believe the team's audio quality has improved but their middleware setup is fundamentally wrong for the game's needs — a problem that will cost months to fix and that nobody wants to hear about. Do you include it in your final recommendations knowing it will be uncomfortable, or do you focus on the wins and leave the structural problem for someone else to discover?
10. What is the biggest risk of a 3-month mentoring engagement, and how do you mitigate it?

**Depth**
1. Scenario: The team's combat mix is muddy. Rather than fixing it yourself, walk us through how you diagnose this with the team and guide them to a solution they can maintain.
2. You have 12 weeks to leave the biggest possible lasting impact. Walk us through your prioritisation -- weeks 1-4, 5-8, 9-12. Be specific about deliverables.
3. Describe a mentoring engagement where you measurably improved a team's audio capability. What was the evidence of improvement?
4. The Audio Lead is technically competent but struggles with the "lead" part. How do you coach leadership skills alongside technical skills?
5. You discover the team's spatial audio implementation is technically incorrect but they think it sounds fine. How do you demonstrate the problem?
6. Walk us through building a "reference mix" document for the team -- benchmarks they can compare against after you leave.
7. The team needs to hire a permanent senior audio person after you leave. How do you help define the role and design interview questions?
8. At week 6 the Audio Lead wants to completely restructure the middleware project. The timing is wrong. How do you redirect their enthusiasm?
9. Describe how you would run a "mix clinic" -- a structured group session where the team listens together, identifies problems, and proposes solutions.
10. The studio asks if you would extend for another 3 months. How do you evaluate that decision?

---

### Mid QA Tester / Mid QA Tester (Contract)

**Culture**
1. Tell us about a time QA caught something important that the rest of the team did not want to hear. What happened, and would you do the same thing again knowing the outcome?
2. How do you handle it when a developer dismisses a bug you filed as "not important" or "working as intended" and you genuinely believe players will hate it?
3. What motivates you in QA -- finding bugs, improving the player experience, understanding how systems work, something else?
4. What would make you leave a QA role you otherwise enjoyed?
5. How do you feel about testing the same features repeatedly across builds? Some testers find regression work meditative; others find it soul-destroying.
6. QA often has lower status than other disciplines in games studios. How do you handle that dynamic?
7. When you find a critical bug late on a Friday before a milestone, how do you handle the tension between reporting it accurately and knowing the team doesn't want to hear it?
8. Describe the best working relationship you have had with a developer. What made it work?
9. Remote QA means you cannot just walk over and show someone the bug happening. Does that frustrate you, or do you prefer documenting everything clearly?
10. How do you stay engaged with a game you have been testing for months or years?

**Technical**
1. You receive a new multiplayer build where a team-based ability is supposed to apply a buff to all nearby allies. Walk us through how you would test this specifically in a multiplayer context.
2. Describe your experience with build verification testing. What is your smoke test checklist, and how does it differ between PC and console builds?
3. A playtester reports that "combat feels sluggish" but nothing is technically broken. How do you investigate and document a subjective "game feel" issue?
4. Walk us through your approach to testing a matchmaking system beyond "does it find a match."
5. Describe how you test for memory leaks or performance degradation over extended play sessions.
6. How do you test localisation quality beyond "the strings display correctly"?
7. Describe your approach to testing a game's economy or progression system without actually playing hundreds of hours.
8. Walk us through how you test audio in a multiplayer game -- spatial accuracy, priority behaviour during busy scenes, volume balancing.
9. How do you approach testing a game's social features -- friend lists, party formation, voice chat, reporting/blocking, and cross-platform play?
10. You are testing a game that supports keyboard/mouse, gamepad, and potentially touch input. How do you structure your testing across all input methods?

**Collaboration**
1. You find a bug that only reproduces intermittently. Walk us through how you work with engineering to pin this down.
2. You have found 40 bugs and the team can fix 12 before submission. How do you approach severity classification?
3. A designer tells you a feature is "working as intended" but you believe players will find it confusing. How do you raise a design concern from QA?
4. How do you work with other QA testers to divide testing coverage without overlap or gaps?
5. Describe how you communicate with a developer who is difficult to work with -- closes your bugs without investigating, gives terse responses.
6. A producer asks for a testing status update and you are behind. How do you communicate that honestly?
7. The engineering lead wants you to regression-test the networking code before tomorrow's deploy. The art director wants you to verify character animations across all 12 heroes before a milestone demo on Thursday. Your QA lead says focus on the blocker bugs. It is Tuesday afternoon. Walk me through how you spend the next two days and who you disappoint.
8. The game has shipped and a hotfix deploy breaks matchmaking at 9pm on a Friday. The live ops engineer is patching, the community manager is fielding angry Discord messages, and the producer asks you to verify the fix on staging before it goes to production. You find a second bug during your verification that is unrelated to the hotfix but will definitely be noticed by players this weekend. Do you flag it now and delay the hotfix, or let the hotfix ship and file the second bug for Monday?
9. You discover a bug clearly caused by a specific developer's recent commit. How do you file it without it feeling like a personal callout?
10. How do you contribute to post-mortem discussions? What insights does QA uniquely have?

**Leadership**
1. You notice the same category of bug keeps appearing across different features. How do you package this as a systemic issue?
2. A new build drops and you have a regression suite plus two new features to test. Walk us through how you structure your day.
3. You are working alongside a junior tester who files bugs with vague reproduction steps. How do you help them improve?
4. How do you advocate for more QA time or resources when the schedule is tight?
5. Describe how you would create or improve a test plan for a major new feature.
6. When you identify a gap in testing tools or infrastructure, how do you raise it and build the case for investment?
7. What is a testing technique or tool you taught yourself in the last year that changed how you approach a specific type of problem? Walk us through a concrete example where it mattered.
8. Describe how you handle being asked to sign off on a build you are not confident about.
9. You finish a testing pass and realise you spent 80% of your time on 20% of the feature surface because that area kept throwing bugs. The rest is undertested and the build ships tomorrow. What do you do, and how do you communicate the risk?
10. If you were asked to present the state of quality for the current build to the whole team, how would you structure that?

**Depth**
1. We are preparing for platform certification on PlayStation and Xbox. What are the key areas you would focus testing on to reduce cert failure risk?
2. Describe the most complex multiplayer bug you have encountered. Walk us through the investigative process.
3. How would you structure regression testing for a live service game with regular content updates?
4. Two players report completely different experiences of the same match -- one says an ability hit, the other says it missed. Walk us through investigating a desync issue.
5. A new patch introduces 30 bug fixes and 2 new features. You have one day of testing before cert. Walk us through your triage.
6. Describe how you would test a loot box or gacha system for fairness and correctness.
7. Walk us through testing cross-play between PC, PlayStation, and Xbox beyond basic connectivity.
8. You are handed a build that crashes intermittently every 45 minutes. Walk us through your investigation process.
9. Describe how you would approach testing accessibility features systematically rather than just checking toggles exist.
10. The community has discovered a currency duplication exploit involving disconnect/reconnect during a transaction. Walk us through reproducing, documenting, and verifying the fix.
