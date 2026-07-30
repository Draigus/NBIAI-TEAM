# Couch Heroes Design Pillars

## Review and iteration

**Draft for the alignment session: Robin, Glen, Vardis, Simon**
**27 July 2026**

This is a response to Simon's unified draft and Robin's pillars document. Part 1 is the review: what holds, what I have merged, what I have moved, what I think is wrong, and what neither draft answers yet. Part 2 is the iterated draft, written in Simon's own six-part pillar structure so it can be diffed against his and argued with line by line.

Simon asked for the pillars to be torn apart in session until all four of us would sign them. This is that, in writing, so the session can start from the disagreements rather than spend its first hour finding them.

---

# Part 1: The review

## Where the drafts are already strong

Both documents are better than most pillar sets survive being. Naming what is working, because the edits below should not be read as a rewrite.

**Simon's opening is the best thing in either document.** The list of what MMOs promise and what they turned into is the clearest statement of the game's reason to exist that exists anywhere in the project. Escape into being someone else, but you get filed like an employee. The satisfaction of getting stronger, but keeping up became the entry fee. Mastery, but shrunk to memorising rotations as homework for your raid group. Belonging, but with attendance sheets. That passage should open the document, open the pitch, and open the first day of anyone who joins the team.

**The "No magic required" line is the single best structural idea in the draft.** A pillar that an engineer or an artist reads as impossible gets quietly ignored, and then the pillar is decorative. Attaching the buildability argument to each pillar is what stops that. I have kept it on every pillar including the merged one.

**The examples are what make the pillars usable.** Restore the Alchemist Guild and alchemy returns, for everyone, forever. A bloodcap mushroom sprouting where something died. The battle-mage who cooks, keeps bees, and haggles like a fishwife. The ferry ride that becomes a card game. The rope, the wind and the burning field were three things until you made them one plan. An arcane storm that makes spells cheap and chaotic and might briefly turn someone into a chicken. Those are the lines a designer can hold a feature against. Abstractions are not. Where I have added anything, I have tried to add in that register, and where I have cut, I have tried to cut the abstraction and keep the image.

**Robin's document is doing a different job well.** It is shorter, hotter and more directorial. Enemies discussing their tactics as they size you up. The music swelling when you barely survive. The crowd cheering your win or laughing as you fall over in the bar. The world is not a passive spreadsheet. Several of those made it into Simon's draft, but they landed in the wrong pillar, which is the subject of one of the merges below. Robin's "What the game is not" list is also sharper than several of Simon's equivalent sections, and his instinct that the game should track encounters per player is the mechanism underneath Simon's variety pillar.

## What I merged, and why

### Nine pillars become eight: variety and many answers are one pillar

Simon's pillar 3 (Every Adventure Feels Different) and pillar 4 (Many Answers to Every Challenge) are two halves of one promise. Pillar 3 is the world changing the question. Pillar 4 is the player choosing the answer. They run on the same machine, they are defended by the same buildability argument, and they forbid the same things.

Look at how close they already are. Pillar 3's "We won't" opens with "script an encounter to play out the same way every time, for everyone". Pillar 4's opens with "funnel players toward a single right answer". Pillar 3's buildability argument is "variety here is multiplication, not volume: one orc that can appear in a million states". Pillar 4's is "multiple answers mostly fall out of consistent systemic verbs existing at all". Those are the same argument about the same system, written twice.

The practical problem with keeping them apart is that a feature review struggles to tell them apart. A proposal about an encounter, a region, an event or a system can cite both, and a pillar that is always cited alongside another one is not deciding anything on its own.

Merged, it becomes the pillar with the most force in the set: **Never the Same Twice, Never One Answer**. The cycles, the seasons, the event manager, the hidden rules and the player mythologies all survive, sitting next to improvisation, preparation as play and other players as a legitimate answer.

There is a real argument against this, and it is strong enough that it goes on the decisions list rather than into a footnote. The two halves are orthogonal tests, and something can pass one while failing the other. A flooded ruin that can always be fought through, swum or drained offers three answers and is still the same flooded ruin on every visit. A storm-lashed encounter full of unfamiliar enemies is different every time and is still a damage check if damage is the only thing that resolves it. Separate pillars catch those two failures separately. One pillar risks becoming a place where a feature satisfies whichever half it can and cites the pillar.

That is a defect in how a merged pillar is usually written rather than in the merge itself, so the pillar is written to prevent it: two named halves, two pass marks, two kinds of evidence, and no credit for clearing one. If the room does not believe that holds in practice, splitting them back into two is one edit and I will not defend the merge past that point.

### The celebration material moves from "The World Remembers" to "Players Author the Best Moments"

This is a filing error in the current draft and it is why pillar 6 currently reads as thin.

Robin's "Celebrate Great Moments" is about the game as a director and conductor responding in real time: the music swelling, time slowing on the triumphant blow, the crowd cheering, enemies sizing you up out loud. In Simon's draft that material was absorbed into pillar 2, The World Remembers, where it opens the "This is about" section and reappears in "We Will" as "react in real time".

But that is not memory. Memory is the world still treating you differently next week. Amplification is the game noticing right now. They are different systems, on different timescales, built by different disciplines, and they fail in different ways.

Meanwhile pillar 6 is the pillar that says the game should be a good witness to player-made moments. It is not short of good material: quests designed for desertion, session chronicles, mementos of the day the plan worked, the clip of the tunnel chase. But every one of those is about capturing a moment *afterwards*. The half about responding *while it is happening* is missing from it, because that half was filed one pillar earlier.

Moving it gives each pillar one timescale. Pillar 2 owns afterwards: attribution, reputation, remembered deeds, and the durable record. Pillar 5 owns during: the music, the camera, the crowd, the barked line. The restraint half of pillar 5 is unchanged, and it now has the response half to sit next to.

Robin's "moments of greatness even upgrade the Lore" stays with pillar 2 rather than moving with the rest, because permanent lore is memory, not presentation.

### What I deliberately did not merge

**The World Remembers and Tend the World Together look like one pillar and are not.** They share a mechanism, permanence tiers, and Simon already cross-references them in both directions. The temptation is to fold them into one world-state pillar. That is the wrong call.

They are two different promises. "The world registers what I did" is memory and attribution. "We healed this together" is a verb: Corruption pushed back, a guild restored, a bridge that a dozen strangers hauled stone for. Merged, the collective work becomes a subsection of a pillar about memory, and Corruption, the game's central renewable conflict and its most distinctive verb, becomes a bullet inside it. That is a demotion of the thing the design is least likely to be copied on.

So they stay apart. But "they are different promises" is too loose a boundary to survive a feature review, and the first draft of this document failed its own test: pillar 2 was still claiming the rebuilt bridge. The boundary has to be mechanical, and it is a three-way split, not a two-way one:

- **Pillar 2 owns afterwards.** Attribution, reputation, remembered deeds, and the durable record, including lore. The world remembering *who* rebuilt the bridge.
- **Pillar 7 owns the verb.** Restoring, defending and improving shared state, and the permanence tiers, because a tier is a statement about what a piece of work is worth over time. *Rebuilding* the bridge.
- **Pillar 5 owns during.** Music, camera, crowd and barks, in the moment. Nothing permanent belongs here.

Pillar 2 spends the tiers that pillar 7 defines. All three pillars now state their edge of this split in their own text.

## What I moved

**Trust the Player goes to the front.** It is currently the last section of the document, described as the principle that sits above everything and that every pillar assumes. A principle printed after the thing it governs does not govern it. It now sits at the front with Build Systemically, before pillar 1, as the two answers to "how does a team our size make something this ambitious".

That also removes a duplication nobody had noticed: the Systemic Design Checklist at the back repeats four of the Trust the Player commitments word for word. Default to yes. Treat unexpected play as a discovery first and an exploit second. Keep help discrete until real need is identified. Keep rules readable. Those now live in one place, and the checklist points at them.

**The permanence tiers move to Tend the World Together**, as above.

**The "objectives that survive a changed world" commitment is now owned by the merged pillar 3 and cited by pillar 2.** It currently appears in both, with the same egg-in-the-cave example, which is a sign of how important it is rather than of carelessness. It is also, by Simon's own admission in the pillar 2 buildability note, the biggest open design area in the document. It has been promoted to the decisions list at the end rather than left as a bullet in two places.

## What I think is wrong

### "A Hobby, Not a Job" is the wrong name for the right pillar

The content of this pillar is among the best in the draft. The name undersells the game twice over.

"Hobby" files Couch Heroes next to model railways and sourdough. The pillar is not asking for the game to be a modest pastime; it is asking for the game to be something people organise part of their life around gladly, for years, without ever being made to. That is a bigger ambition than the word carries.

"Respect the player's time", Robin's version, has the opposite problem. It congratulates us for not doing something bad. Not wasting someone's time is a floor rather than a promise, and it is hard to imagine it being the reason anyone picks the game up.

The pillar is about possibility and the absence of obligation. Simon's own alternate headings in that same line are better than either: **Possibility, Never Obligation** and **Built Around Your Life, Not in Place of It**. I have used the first.

I have also cut one passage: the angler with a garage full of tackle who is still not employed by the lake. It is one of the best-written lines in the draft, and cutting it is a real loss, so it needs a real reason. The reason is that it exists to defend the word "hobby", and with the word gone it is arguing a case nobody is making. What it was protecting, that depth is welcome and only obligation is not, is kept and stated directly: someone who has organised their week around a raid because they want to is not the failure case, and someone who logs in resentfully to protect a streak is. Simon's other line in that pillar, "chosen, returned to gladly, picked up and put down at will, no boss and no rota", does the same job without depending on the noun, and I had dropped it. It is restored, and it carries the texture the angler was carrying.

Simon should contest this in the room if he wants the word back, which is why the argument is written out here rather than the line quietly deleted.

### Where Robin is being overruled rather than merged

Two of Robin's positions do not survive this draft. Silently losing an argument is worse than losing it out loud, so both are named here and both are on the decisions list.

**"Branches in quests change what you see forever."** Robin's world remembers by diverging: your choices change the world you personally see, permanently. Pillar 2 forbids exactly that, in Simon's words, no rubble for one player and a saved barn for another. One shared physical world is a decision with consequences all the way down through art, engineering and level design, and I think it is the right one, but it is a rejection of Robin's mechanism rather than a synthesis of it. What can be offered back is personal permanence expressed through access, NPC relationships, reputation and authored interiors, which delivers a good part of the feeling without divergent world state. Whether that is enough is the room's call, not mine.

**Min-maxing.** Robin lists "a celebration of min-maxing" among the things the game is not. Simon promises theorycrafting, builds to pull apart, and a weekend deep in the stat sheets. Those are not the same position, and this draft follows Simon. The reconciliation I would argue for is that optimisation is welcome as a way to play and is refused as an entry requirement, which is the same line the balance section above draws. Robin should say whether that is what he meant, because if he meant the stronger version then the identity pillar needs rewriting rather than reconciling.

### The group yield multiplier contradicts its own pillar

Better Off Beside Each Other commits to tilting the underlying economics toward cooperation, and gives as its example that two people harvesting a dangerous plant yield more than twice one. Four bullets later the same pillar commits to never making social interaction mandatory and to watching griefing incentives constantly.

A raw yield multiplier is the mechanic that breaks that promise. If two players gathering produce more than twice one player gathering, gathering alone is the inefficient choice, and a community will work that out and say so. Solo gathering becomes the thing you do when you cannot find anyone. That is mandatory grouping arriving through the spreadsheet rather than through a gate. A multiplier on a repeatable action is also a well-known target for bots and multiboxing, because the profitable behaviour is simple and repeated.

The obvious repair makes it worse. Saying that two players can take a dangerous harvest one cannot does not remove the pressure, it converts it into a hard gate: an activity solo players are locked out of, inside a pillar promising solo play is always valid. Making the maths implicit does not make it optional.

The fix is a boundary the pillar currently does not draw at all. Three categories, and every activity is deliberately placed in one:

- **Solo-valid activities.** Company may make them safer or more pleasant. It may never make them more productive per player, and faster completion is productivity in another unit, so it does not get that either. Gathering, crafting, exploring, most of the world.
- **Cooperative content.** Openly designed to need more than one person, signposted as such before a player commits time to it. Server projects, some puzzles, the hardest sites.
- **Universally solo-viable progression.** The routes through identity, mastery, economy and world contribution that a solo player can always walk end to end.

The failure the current draft invites is category drift: a solo-valid activity that quietly acquires a group advantage until it is cooperative content that nobody labelled. Naming the category at design time is what prevents it.

With that boundary in place, the intent survives intact. Company pays through **what it makes possible, not what it multiplies**: the smith can make you something no market stall can, someone else's skill is an answer you can borrow, a stranger's fire is there when you are caught out after dark. None of that is farmable, and none of it makes the solo version of an activity the wrong choice.

### "No other game can hope to match" does not belong in a pillar

A World of Worlds currently promises "a diverse array of experiences no other game can hope to match" and "a blend nobody else has". Both are true ambitions and both are marketing lines. A pillar has to be able to decide something, and no feature review has ever been settled by asking whether a competitor could match it.

The pillar's real job is register, norms and consent: which places are cosy, which can go genuinely dark, what the local rules are, how a player knows before they step in, and what holds everywhere regardless. That is a decision-making pillar, and it is also where the game's safety spine lives. I have kept the creative ambition as a stated intent and moved the competitive claim out of the commitments.

### Difficulty tuning, and why I am no longer flagging it as a blocker

My first read had this as the biggest hole in the set: no class at creation, no gear check at the door, difficulty explicitly not scaled to a gear or level number, and freeform builds explicitly never tournament tuned. Which leaves the question of what an encounter is tuned against.

Glen's position, and this is his call rather than anything derived from either draft, is that the skills system occupies the space a class would have, because that is where players make the choices a class would otherwise have made for them. There is no missing anchor. There is a different one, and a better one, because it moves with what the player actually chose instead of a label picked at creation.

It matters how that gets written down, because there is a wrong version of it. If encounters *read your current loadout and scale to it*, the game rubber-bands, and the promise Simon makes in the opening, "the boss that used to beat you, beaten", stops being possible. Coming back stronger has to mean something.

So the commitment is the other way round. **The challenge sets a fixed bar. Skills are the vocabulary you bring to clear it.** A flying enemy is hard because it flies, not because the game measured you on the way in, and what your skills change is how many credible ways you have to answer it. Growth is felt as a widening set of answers and as bars you could not clear before and now can.

What remains is ordinary design work rather than an open question: combat needs to agree how coarse the bars are and how they are communicated. That belongs in the combat design brief, not in a pillar argument.

### There is no position on balance between "perfect" and "only when it breaks the economy"

This one is in both source drafts and I initially carried it through unchanged, which was wrong.

The draft commits to no classes, abilities combining freely from any source, distinctive builds never flattened, no best-in-slot to grind toward, and a build that trivialises an encounter being "a story, not a bug", with the only stated exception being genuine harm to the economy or to other players' fun.

Put those together in an MMO and dominant builds are not a risk, they are a certainty. Players will find them, publish them and expect them. A build can become socially mandatory without the game ever printing an item score, and at that point the identity pillar has lost the thing it promised, because everyone converges anyway.

"Freeform builds will never be tournament-tuned" is a dodge. Nobody is asking for tournament tuning. The requirement is **ecosystem viability**: enough comparative balance that no single combination erases meaningful choice or becomes the price of entry to group content.

That gives the useful distinction the drafts are missing. A build that trivialises *one* encounter is a story, and we leave it alone. A build that is the answer to *most* content is a defect, and we correct it, in the open, without pretending it is anything else. Both source drafts currently promise only the first half.

## What neither draft answers

These are gaps, not errors. I have not invented answers for them.

**What the first hour is.** Neither document describes the shape of a new player's first session. For a game whose identity system has no class to pick, whose progression has no level to chase and whose main quest is deliberately held loosely, the opening hour is a hard design problem and the pillars currently give it no guidance at all.

**What a session looks like at month six.** The same gap at the other end. The pillars are strong on what play feels like and quiet on what a committed player is doing after half a year. Production will need an answer before content planning can be sized.

**What is sold.** Identity may not be sold outright. FOMO, dailies, login streaks and engineered retention are all forbidden. Nothing anywhere says what the business model is. For an MMO that is a pillar-level constraint, and its absence is conspicuous in a document that is otherwise willing to name what it will not do.

**PvP.** Better Off Beside Each Other defers it with "PvP lives in consenting zones with their own rules, see pillar 9", and pillar 9 mentions arena isles once, in passing. Somebody needs to own its scope before that cross-reference is load-bearing.

## Decisions for the session

Everything this review leaves open, including Simon's two existing ratification flags and the two places Robin is being overruled, is collected in one list at the end of the document. It is the last page for a reason: it is what the four of us are in the room to close.

---

# Part 2: The iterated draft

Eight pillars, in Simon's six-part structure. Trust the Player and Build Systemically now sit above them.

## The game we want to make

So we are all picturing the same game before we argue about anything else. Wording indicative; name and lore specifics to be confirmed.

> You arrive in a beautiful, broken fantasy world: a land shattered by its past, slowly coming back to life. You are not the chosen one. You are one of many, free to become whoever you want to be. You go on adventures, explore its secrets, craft things that are yours, and make a home here with your friends. Together, players push back the Corruption, restore what was lost, and write the world's next chapter.

### And what kind of game is that? An MMORPG

People do not play MMOs by accident. They play them because MMOs satisfy real human desires better than almost any other kind of game. Somewhere along the way, the genre wrapped each of those desires in something that made it feel like a job.

| The desire | What the genre did to it |
|---|---|
| The escape into being someone else, in a world that feels real because it is full of real people | You end up filed like an employee: a class, a level, an item score. A job title where a person should be |
| The satisfaction of getting stronger, beating the boss that used to beat you | Keeping up became the entry fee, and this season's gear is next season's junk |
| The reward of mastery, learning a hard fight until you win it | Mastery shrank to memorising rotations, done as homework for your raid group |
| Getting in the zone: hands busy, mind quiet, three hours gone like nothing | The game started assigning the grind, attaching it to everything you actually wanted, and calling it content |
| A world with something happening every day | The somethings became chores, and missing a day became a punishment |
| Belonging: guildmates, regulars, your people | Belonging came with attendance sheets, and the guild became a second shift |
| Time that builds into something: months of play adding up to something that lasts | The world resets behind you, and next year nothing you did is still there |

We embrace every one of those desires. We reject the properties that made them feel like a job.

- **Be someone here, not something.** No class at creation, no rank that sums you up. You are what you have done, made and worn, and the world learns your name, not your number.
- **Get stronger, in full.** Gear, stats, builds to theorycraft, and the boss that used to beat you, beaten. What is gone is the gear check at the door, and no season turns your gear into junk.
- **Master everything.** The same learn-it-then-beat-it skill of a hard fight applies to taming a wary beast, working a market, and pulling off a commission everyone said was impossible. None of it is homework.
- **Get in the zone, on your terms.** An evening lost to fishing, a night at the forge, a weekend deep in the stat sheets. It is only a grind when it is the game's idea, and it never will be.
- **Something happens every day.** Crops ripen, markets shift, events roll through, corruption stirs. None of it is a chore you owe, and missing a day costs you nothing.
- **Belong on your own terms.** Guilds, regulars, a home your friends come back to. No attendance sheets, no second shift, and playing alone is always fine.
- **Time that builds, for real.** Your actions leave marks on a shared world that does not reset, and your best work can outlive you: handed down to a friend, or one day to your kid.

And two things the genre has almost never done, which we add: players meaningfully change the shared world, and problems have many answers, improvised, personal, and yours.

### What we are promising players

Imagine sitting a friend down and saying "you should play Couch Heroes because...".

- You can become whoever you want to be, and the world will know you for it.
- What you do matters: the world remembers it.
- There is always new fun to be had. No two days, and no two players' journeys, are the same.
- The world is full of secrets, and nobody will spoil them for you. Finding things is up to you.
- You can make things that are truly yours. No two swords are alike, your best work can become famous, and one day you can hand it down.
- You can pick your own goals, choosing challenges that matter to you and overcoming them in your own way.
- Your best moments will not be scripted. They will be yours: stories you will want to tell.
- Other players make everything more fun, and everyone can play a part.
- You and your friends can make a home here: a place to hang out, build together, come back to and make memories in.
- Together, players can push back the dark and restore the world.
- From cosy villages to scary forests, there are many kinds of adventure, and you choose which ones to step into.
- The game fits around your life, and never asks for a place in it that it has not earned.

---

## How we make something like this

If we agree that is the game, the next question is how a team our size builds it. The answer runs through everything below, and it is two things: **we trust the player, and we build systemically.** Both of these sit above the pillars. Every pillar assumes them.

### The player is trusted

*Free to try, free to fail. We trust you to progress.*

One principle sits above everything. Players are free to try anything, and free to fail. The game defaults to yes. We have failed the moment we have to tell people what to do all the time.

**This is:**

- Trust in the player's curiosity, intelligence and self-direction to motivate them.
- Inspiring them to set their own goals, find their own way, go at their own pace, and feel all right about learning by failing.
- A game that says yes when a player tries something clever the systems permit, even if nobody designed for it.
- Guidance that responds instead of presuming: help stays discrete until the system identifies real need.
- A first NPC who points you at the world, not at a checklist.

**This is not:**

- **Abandonment.** Trust is not the absence of design. Making the world readable, its rules learnable and its feedback clear is our job. "Players will figure it out" is never an excuse for incoherence.
- **No rules.** Trust operates inside firm authored boundaries: the world's shape, zone rules, the global social rules. The boundaries exist so that everything inside them works.
- **A licence to harm.** Trusting you is not licensing you to ruin someone else's day. The prosocial rules hold everywhere.
- **Engineering chaos.** Default to yes means systemic interactions are permitted to combine, not that every combination is hand-supported or QA-certified.

**We will:**

- **Default to yes.** If the systems permit it, it works, even when it surprises us.
- **Treat unexpected play as a discovery first and an exploit second.** Investigate before patching.
- **Keep help discrete** until real need is identified, then offer it well.
- **Make failure a lesson, not a punishment.** Losing teaches and redirects rather than gating.
- **Keep rules readable.** Players can only be clever with rules they can predict, and the best surprises are unpredictable in advance yet obvious in retrospect.

**We won't:**

- Force tutorials, breadcrumb every step, or babysit players who did not ask.
- Funnel players toward a single right answer.
- Patch out player cleverness by default because it is not how we imagined it being done.
- Use "trust the player" to excuse unreadable design, missing feedback, or genuine harm. Economy-breaking and griefing still get fixed.

### We build systemically

Creating a game like this means designing a story-generating space, one built for emergence rather than braced against it.

- Features designed as systems that interact with each other, instead of one-off scripted content.
- Rules that attach to properties, not to individual things: fire burns anything flammable, not a hand-picked list.
- Verbs that work the same everywhere, so players can make plans and be clever.
- The output of one system feeding the next, which is where surprises and stories come from.
- Most content built as situations dropped into the systems, not sequences scripted around them.
- The world and the players generating experiences together, endlessly, from parts that combine.

**What it does not mean:**

- **Not a simulation running free.** Cause-and-effect connections are designed, managed and curated.
- **Not abandonment.** Readable worlds, learnable rules and clear feedback are our job.
- **Not anarchy.** Trust operates inside authored boundaries, and it is never a licence to harm other players.
- **Not an excuse.** Genuine harm, economy-breaking and griefing, still gets fixed.

**Why it is the right bet:**

- **Players love it.** Some of the most loved games of the last decade are systemic: Breath of the Wild, Animal Crossing, Minecraft, Sea of Thieves. "I wonder if I could" is the most powerful feeling in games.
- **It feels like trust.** Free to try anything, free to fail, and a game that says yes. Trust is what systemic design feels like from the player's side, and it is what produces a sense of presence and belonging rather than a sense of being processed.
- **It survives the internet.** Scripted games are consumed by being watched: once you have seen the set pieces, you have seen the game. Systemic games only get more interesting, because every playthrough differs and the wiki describes someone else's. The moments players clip and share become our marketing.
- **It is how small teams build big worlds.** One orc fight can play out in a million ways without needing a million different orcs. A world event is a data change, not a content build. We are not building systemically despite being a small team. It is our path to a game this ambitious.

---

# Pillar 1: Identity Is Earned, Not Picked

*Known by your deeds, not by labels / Your habits are your hero*

### Intent

Identity is earned in play, not picked from a menu. The game continually asks who you are, and your actions are the answer. Players should be known by their deeds, not their labels.

### Feels like

Pride in who you have become, and the warmth of being recognised for it.

### This is about

- **Individuality.** A character that is the sum of everything significant you have done, made, worn, and who you know.
- **Freedom of build.** There are no classes. You assemble your own from skills and abilities gathered anywhere, and the combination is yours.
- **Skills in place of a class.** The skills you choose to learn and carry are where the decision a class would have made for you actually lives. What you can do is the sum of what you chose, it moves when you move, and other players can read it.
- **Self-expression.** Players can role-play as they see fit, and look how they want to look.
- **Recognisability.** "That's Robin: he's the one who always wears green, fights with boomerangs, and hangs out by the fishers' wharf playing a harp."
- **Belonging.** Identity extends beyond the character: your home, your loyalties, your place in a community.

### This is not about

- "He's a level 55 Warrior."
- A power number with a wardrobe.
- **Perfectly balanced builds.** Freeform combinations will never be tournament-tuned, and they do not need to be.

### We will

- **Let players build their own class.** Skills and abilities combine freely, from any source, into something with your name on it (a battle-mage who cooks, keeps bees, and haggles like a fishwife).
- **Let identities be lived, not just worn.** Roles can genuinely be practised in the world (customise your home to feel like a smithy, and post your services on the job board).
- **Make appearance pure expression.** How you look is never dictated by what is statistically best (the strongest gear never forces a silhouette on you).
- **Make the world respond to who you are.** NPCs, factions, prices and access react to your reputation and past choices (the militia waves through the adventurer who cleared their road last month).
- **Have the world speak to you by what you have earned.** How it names, greets and refers to you reflects your deeds (the merchant who greets you as "Master Smith"; titles are one way, not the only way).
- **Make reinvention easy and unpunished.** Growth and a change of direction are almost always open (hang up the sword and take up the harp without a respec tax). Almost, because a handful of choices are meant to be weighty, and those are named at design time rather than discovered by a player who cannot undo one.

### We won't

- Lock players into classes or archetypes at creation.
- Collapse progress into a single power number that is really about combat affinity.
- Sell identity outright: what you are known by must be earned.
- Flatten distinctive builds toward a balanced average. The fuller commitment on cleverness lives in Pillar 3.
- Give players anything to be known by except what they have done.

### No magic required

Most of this is data we already keep: skills, titles, reputation values, cosmetics. The work is surfacing it where people can see it and where other systems can read it.

---

# Pillar 2: The World Remembers

*The world keeps the receipts / A world where you matter*

### Intent

Your deeds outlive the adventure. What happens leaves a mark: often small, sometimes big, and lasting anything from an afternoon to a year to the rest of the game. The world is not a passive spreadsheet.

This is the afterwards. What the world and its people do later about what you did, at every scale from a barked greeting to a line of lore. Doing the work in the first place is Pillar 7, which sets how long any of it lasts. The response in the moment is Pillar 5.

### Feels like

Mattering. The world noticed.

### This is about

- **Consequences that echo.** NPCs comment on your achievements, reputation opens and closes doors, the cult hunts the player who hurt them and not the friend beside him.
- **Small marks, most of all.** A rare bloodcap mushroom sprouting where something died. A valley that stays peaceful for a while because someone slew the elite that stalked it. Most of the memorable marks will be small ones.
- **Marks left on people, not just places.** The stranger who remembers you got them through the hard pass. The smith whose work half the town carries. The world is everything in it, and other players are the part that remembers best.
- **A shared world, honestly shared.** Your mark is sometimes someone else's disruption. The elite you slew is the elite they came to fight. Within limits, that is the point, not a problem. It is what makes the world real.
- **One world, many memories.** Your deeds live in how the world treats you, in what other players remember of you, and together in the world everyone shares.
- **Greatness entering the lore.** The rarest achievements do not only get remembered, they change what the world says about itself, and newcomers hear about them from a world that was there.

### This is not about

- Consequence that lives only in menus and stat screens.
- The same world state treating every player identically.
- **Only grand monuments.** A world that remembers does not mean a world covered in plaques.
- A world padded so that nobody's actions can ever affect anyone else's day.
- **Infinite persistent state tracking.** Permanence tiers bound what is stored, and drift back to defaults cleans up after itself.

### We will

- **Fill the world with small consequences, lasting according to their tier.** Bloodcaps grow where things died. A slain elite stays gone a while. Some marks fade as the forest moves on, and some stand forever.
- **Design objectives that survive a changed world.** "Bring back an egg from its cave", not "kill the elite": achievable whether the beast is prowling or was slain an hour ago. This is Pillar 3's commitment, and this pillar depends on it holding.
- **Make players memorable to each other.** Help someone through a hard area and it is them who remembers, not a stat. Our job is the moment, and making people recognisable, findable and thankable afterwards.
- **Remember you through the relationship layer.** How the world names, treats, prices and hunts you (the cult sends hunters after you by name, and ignores your friend).
- **Open and close paths through access, never through separate realities.** The guard lets you in because of your reputation, and the world everyone sees stays one and the same.
- **Attribute collective work, and let it stand for everyone.** The bridge the community rebuilt is simply there, for all, every day after, and the world knows whose work it was. Pillar 7 owns the rebuilding; this pillar owns the credit and the permanence of the record.
- **Promote the rarest achievements into world-facing lore.** What a handful of players did once can become something the world tells newcomers about.
- **Use limited instancing only where it is temporary, narratively excused, and resolves back into the shared world.** Onboarding, quest interiors.

### We won't

- Instantly respawn the world behind you, as if you were never there.
- Send players to kill something that might already be gone. No objective the world's state can strand.
- Silently reset zones to a default state.
- Make a player's impact invisible or instantly undone.
- Diverge the world per player. No rubble for one and a saved barn for another. Consequence lives in how the world treats you, never in which world you see. **[RATIFY, and retire the conflicting barn example in the art checklist]**

### No magic required

The world is a spatially organised set of state tags, and a player's history is telemetry that many systems read: dialogue, spawning, prices, access. Small marks are the cheapest of all, a spawn-table nudge and a timer. The richest memory in the game is free, because other players remember, and our job there is recognisable people and occasions worth remembering.

*Open: writing objectives that stay achievable in a changing world is the biggest unsolved design problem in this document, and the biggest opportunity. See the decisions list.*

---

# Pillar 3: Never the Same Twice, Never One Answer

*Variety is the rule, not the reward / We define the goal, you define the route*

### Intent

Variety is the rule, not the reward, and there is rarely one road through. The world is never boring and never quite the same: who knows what you will find today. When you find it, how you answer is up to you, improvisation is always welcome, and a challenge here is rarely just a fight. Difficulty meets your skills and your preparation, not your gear score.

### Feels like

Surprise and smarts. Not knowing what today holds, and the click when the idea works.

### This is about

**The world changes the question**

- **Natural cycles.** Day and night, seasons, weather, growth and recovery, so that today is not yesterday.
- **Journeys full of surprising distractions.** Something worth noticing on the way to wherever you were going: a rumour, a bloom, a stranger on the road.
- **Context that matters.** The same fight plays out differently at night, in the rain, with a beast lairing nearby, with different gear, with different company. And not just fights: resources that only appear at certain hours, places that change with the season.
- **An event manager, not a dice roller.** The game reads the moment, who is here, what state the world is in, what these players have already seen, and chooses what happens next.
- **Surprises that make sense.** Unpredictable in advance, obvious in retrospect. "Why did that happen? Oh, of course."
- **Hidden rules and player mythologies.** Not everything is explained, so theories bloom in the pub, the Discord and the forums. "I swear, if you craft it at midnight, it rolls higher." Some of it is true, some of it is not, and we will never say which. The game should be worth talking about when you are not playing it.
- **Two kinds of rule, and only one of them is secret.** The grammar is learnable, testable and reliable: how fire behaves, how weather and weight and materials work, what a verb does. Cleverness is impossible without rules a player can predict. What stays undocumented is the other kind: recipes, thresholds, conditions, what spawns where at which hour. We keep secrets. We do not keep the grammar secret.
- **Players finishing the picture.** People build a richer world in their heads than we actually made, from the differences they notice and the stories they infer. We feed that and let imagination do the rest.
- **Other players as part of the variety.** A shared, changing world means the day's texture depends on who was here before you and who is beside you now.

**You choose the answer**

- **Playing your way and still winning.** Not every player can overcome everything, but there is never just one door.
- **Improvisation as a first-class way to play.** The unplanned solution, the off-label use of a tool you already had, the plan invented on the spot when the first one fell apart.
- **Many kinds of test.** Enemies to outwit, puzzles to crack, mysteries to unravel, lost things to track down, a past to piece together.
- **Other players as a legitimate answer.** Persuading, hiring or befriending someone to handle what you cannot, or will not, is playing your way, not cheating.
- **Cleverness that counts.** Getting genuinely smarter, more skilful and better prepared, not just making a number bigger.
- **Preparation as play.** Reading the situation, choosing your kit, picking your moment. Half the victory happens before the fight.
- **A fixed bar, and many ways over it.** The challenge is as hard as it is. It does not measure you on the way in and adjust, because coming back stronger has to mean something and the boss that used to beat you has to stay beaten. What your skills change is how many credible routes over the bar you have, and preparation changes which one is available today.
- **A low floor and an optional ceiling.** Easy to step into, deep if you want it. Nobody needs homework to join their friends.

### Both halves are tested separately

One pillar, two pass marks. A feature satisfies this pillar only by clearing both, and "it supports the pillar" is not an answer to either.

- **Does it vary?** Come back to it three times, a week apart, having done different things in between. If the encounter, the region or the event presents the same problem every time, it fails this half, however many ways there are through it. *A flooded ruin that can always be fought through, swum or drained is still the same flooded ruin on every visit.*
- **Does it admit more than one answer?** Take the situation as presented on one given day. If skill, preparation, profession and company change nothing about what actually works, it fails this half, however different today's conditions were. *A storm-lashed pack of new enemies is still a damage check if damage is the only thing that resolves it.*

The evidence is different for each. Variance is measured across repeat visits and against player history. Answers are measured by which routes players actually use, and whether the spread collapses over time.

### This is not about

- **Endless content.** It is the same world, played differently.
- **Random for its own sake.** Surprise is curated, not chaotic.
- **Per-player terrain.** Freshness comes from what happens, never from which world you see.
- **Every day being dramatic.** Small differences carry most of the feeling: a new bloom, a quieter valley, a stranger on the road.
- **One correct solution with decoration around it.**
- **Challenge meaning combat.**
- **Us setting your goals.** The world offers and tempts, you choose. This pillar is about how you answer, not why you took it on.
- **Everything being beatable by everyone.** Some challenges genuinely demand skill, preparation or help. The promise is choice in how, never a guarantee of when.
- **Balance as a goal in itself.** Freeform builds will never be tournament-tuned, and this is not that kind of game.

### We will

- **Make conditions shape outcomes.** The pack fights differently in the dark. The herb only opens at dawn. The plan that worked in the dry season fails in the floods.
- **Track what players have seen, and steer new things their way.** The forest that ambushed your friend last week finds a different way to surprise you both today.
- **Let world state generate content, and content change world state.** Rising corruption in a region fills the local board with cleansing work; clearing it calms the region.
- **Make world effects a twist, never a pure penalty.** An arcane storm makes spells cheap and chaotic for a day, and your firebolt might briefly turn someone into a chicken.
- **Let live values drift back toward defaults**, so the world scars and heals without manual cleanup (the overfished lake recovers on its own over weeks). Drift is slow, visible and explained by the fiction, which is the whole of the difference between recovery and a silent reset.
- **Hold the line at ecosystem viability.** Not perfect balance, and not only fixing what breaks the economy. A build that trivialises one encounter is a story and we leave it alone. A build that becomes the answer to most content, or the price of admission to a group, has erased the choice this pillar exists to protect, and we correct it openly.
- **Vary the small things as deliberately as the big ones.** Seasonal blooms opening paths that were closed. Rumours that were true today and gone tomorrow.
- **Leave room for legend.** Some workings stay undocumented, so discovery and folklore have somewhere to live. No patch note ever explains the midnight roll.
- **Set outcomes, not routes.** The flooded ruin can be fought through, swum, or drained by restoring the old mechanism upstream.
- **Reward improvisation.** The rope, the wind and the burning field were three things until you made them one plan.
- **Let players be each other's answer.** The crafter who talks a fighter into clearing the cave, in exchange for the blade of their life.
- **Set difficulty from the challenge, and let skills decide the route**, never from a gear or level number and never by measuring the player on approach (a flying enemy is hard because it flies, and it is met by adapting what you bring rather than by out-levelling it).
- **Reward reading the world.** Learning that the pack hunts at night, and choosing to travel at dawn.
- **Spread challenge across every playstyle.** A mystery solved from objects left behind. The last artefact in a set run down after weeks. A client's impossible commission finally cracked at the forge.
- **Make failure interesting.** Losing changes what happens next rather than gating you: a failed defence seeds the next weeks of rebuild work, not a locked door.
- **Keep depth opt-in.** Nobody needs to memorise a rotation to raid with their friends.
- **Write objectives a changing world cannot strand.** Adventures set outcomes, never routes. This pillar owns that commitment; Pillar 2 depends on it.

### We won't

- Script an encounter to play out the same way every time, for everyone.
- Serve the same player the same event over and over.
- Confirm or deny player theories about hidden rules. This binds our communications as much as our design.
- Build the rote, predictable trudge to the next identikit activity.
- Let surprise break fairness. The world may astonish you, but never cheat you.
- Break the shared world to deliver variety.
- Funnel players toward a single right answer.
- Let gear decide the fight, or build a best-in-slot to grind toward.
- **Patch out cleverness in the name of balance.** A build or plan that trivialises an encounter is a story, not a bug. What does get corrected is the pattern above: dominance broad enough to collapse the choice, alongside genuine breakers of the economy or of other players' fun.
- **Hide the grammar.** Secrets are fair game; the rules players reason with are not.
- Require complex rotations, execution gates or homework to participate.
- Confuse difficulty with grind. Challenge yes, treadmill no.

### No magic required

Both halves are the same economy. Variety is multiplication, not volume: one orc that can appear in a million states, because conditions, time, weather, company and world state recombine what already exists. Multiple answers mostly fall out of consistent systemic verbs existing at all, so we are not hand-authoring three parallel paths per encounter. The conditions do half the work, and other players do more of it, because every skill someone else has is an answer you can borrow. An invasion, a storm or an overfished lake is a data change, not a content build. The event manager is selection, not generation. And the mythologies cost nothing at all: they only require us to explain less, and stay quiet.

---

# Pillar 4: Better Off Beside Each Other

*Cooperation builds community / From strangers to friends*

### Intent

A place to be alone, to find a new friend, to play with your mates, or to be part of something server-sized. Every scale of company is a valid way to play, and the game is built to make the social ones happen naturally. Players achieve more together than apart, and are never punished for playing alone.

### Feels like

Belonging. You came for the game; you stayed for the people.

### This is about

- **Every scale of company.** Solo evenings, a chance meeting on the road, a regular group of friends, a guild, a server pulling together. All first-class, and moving between them is easy.
- **Strangers becoming friends, step by step.** A ladder of activities from safe, low-stakes contact, trading, a shared campfire, a passing hand, up to deep mutual reliance: a group project, a guild, a friendship that outlasts the game.
- **Being someone's answer.** Professions and strengths diverse enough that everyone has something another player genuinely needs. In a world of many valid ways to play, being useful is never locked to one role.
- **The economics of together, under the surface.** Company pays through what it makes *possible*, never through a multiplier on what one player could already do alone. A weapon made by a friend fits your hand like it was made for you, because it was. Someone else's profession is an answer you can borrow. A stranger's fire is there when you are caught out after dark.
- **Three kinds of activity, named on purpose.** *Solo-valid*: company can make it safer and better company, and never more productive per head, which includes not making it quicker per head. *Cooperative*: openly built to need more than one person, and signposted as such before anyone commits an evening to it. *Solo-viable progression*: the routes through identity, mastery, economy and world contribution that one person can always walk end to end. Every activity is placed in one of the three when it is designed, because the failure mode is drift, a solo activity quietly acquiring a group advantage until it is cooperative content nobody labelled.
- **Problems that want more than one head.** Some locks have two keyholes: puzzles and projects beaten by working together rather than by bringing a bigger number. These are cooperative content, and they say so.
- **A shared threat that makes a community.** Corruption is not only something to push back. It is the thing everyone in a region has in common, the reason strangers end up on the same side of a problem, and the reason a guild watches each other's progress rather than only its own.
- **Group identity worth having.** Guilds with their own culture, colours, rituals and shared homes, about far more than fighting.
- **A third place.** Somewhere you and your friends can simply be. Hang out, potter, build, and come back to, even on the nights nobody feels like adventuring.
- **Legacy.** Items, homes, knowledge and reputation passed down, to friends or the next generation.

### This is not about

- A friends list and a group-finder bolted onto a solo game.
- **Forced togetherness.** Solo play is always completely valid, and social is a pull, never a push.
- **Winning by dominating other players.** Consensual PvP lives in zones with their own rules, see Pillar 8.
- **Big guilds as the only way in.** The ladder starts with two strangers and a campfire, not an application form.

### We will

- **Build activities that naturally throw people together, without forcing it.** A stranger shares their fire when you are caught out after dark, and you travel on together.
- **Tilt the economics toward cooperation through complementary capability, never through per-head output.** Abilities that create openings other players can exploit. A profession that makes something no market stall carries. Travel that is more pleasant in company.
- **Place every activity in one of the three categories at design time, and say which.** A solo-valid activity that has acquired a group advantage is a design defect, not a balance question.
- **Watch the incentives for griefing, constantly.** Some will happen, but the maths should never reward it. Nothing pays out for blocking, kill-stealing or wrecking another player's work.
- **Give people real reasons to rely on each other.** The group's smith, forager and scout each carrying something the others cannot.
- **Make helping pay, for both sides.** Teaching someone a recipe rewards you both. A friend's craftsmanship attunes to you faster than anything off a market stall.
- **Give groups identity tools worth having.** Your guild turning up in matching colours to the festival you organised.
- **Connect player homes so they create shared moments.** Friends portalling into the workshop you just finished, or the guild hall that becomes the default place to end the evening.
- **Support inheritance across accounts and generations.** Your first real blade handed to a newer player, or one day to your kid's account. *Flagged: this needs an economy answer for real-money-trading exposure and a legal answer on minors' accounts before it is ever promised publicly.*

### We won't

- Make social interaction mandatory, or punish playing alone.
- Force grouping where the activity does not call for it.
- **Ship a raw group yield multiplier on an activity a solo player could already do.** If two gatherers produce more than twice one gatherer, gathering alone becomes the wrong choice and grouping has become mandatory through the spreadsheet. It is also the easiest thing in an MMO for bots and multiboxers to farm.
- Accidentally pay for bad behaviour. If a system rewards griefing, the system is the bug, and gets fixed as one.
- Let helping be exploitable into a chore. Generosity is invited, never farmed: no systems that guilt or queue players into being unpaid support.

### No magic required

Most of this is activity design and tuning rather than new systems: openings, attunements, travel speeds and risk profiles we already control, arranged so that company quietly pays without paying per unit of output. Pillar 2 remembers the helpers and Pillar 3 makes them worth hiring; this pillar makes meeting them natural and worth it. The genuinely hard part is inheritance, and it is flagged.

---

# Pillar 5: Players Author the Best Moments

*Author lightly, amplify loudly / Made by players, not written by us*

### Intent

The stories players tell afterwards should be ones no designer wrote. Two jobs follow from that. We author lightly: build the stage, hold the goals gently, point loosely. And we amplify loudly: when a player makes a moment, the game notices it, celebrates it while it is happening, and helps them keep it and retell it. The world is not a passive spreadsheet, and it is not a silent one either.

### Feels like

"You will not believe what just happened."

### This is about

- **Authoring lightly, on purpose.** The emergence machinery lives in how we build everything. This pillar is our stance as storytellers on top of it.
- **The main quest as a thread, not the game.** It pulls you into new regions, hands you new toys, then steps aside. The game is everything on the way, and everything that pulls you off the path.
- **Goals held lightly.** The more precisely we tell players what to chase, the more they optimise for it and stop writing their own stories.
- **The game as director and conductor.** The music swells when you barely survive. The crowd cheers your win, or laughs as you fall over in the bar. Enemies discuss their tactics as they size you up.
- **Emphasis that does not touch the simulation.** Camera, score, animation weight and sound can make a blow land like the end of a film. Time itself only bends where the world is not shared, which is Robin's original qualification and the right one.
- **The game as a good witness.** Noticing tellable moments and helping players keep them, frame them and pass them on.
- **Everyone's best moment being different.** The one that resonated with you is the one you will clip, share and retell. Player stories are our best marketing and the flywheel of the game's growth.

### This is not about

- Scripted set pieces pretending to be your story.
- A checklist to rush through.
- A single dominant carrot that turns the world into a route.
- **No authored story at all.** There is a main quest, and it is good. It just knows its place.
- **Constant fanfare.** If everything is amplified, nothing is. The rarer the moment, the louder the response.

### We will

- **Write quests that expect desertion.** Designed to be wandered away from and picked back up without penalty. Abandoning the quest because something stranger appeared on the horizon is the game working, and the quest waits.
- **Keep rewards broad and many**, with curiosity and self-direction as the engine. Wandering off the path is usually worth it, and no single carrot outshines the rest.
- **Read the moment and respond in real time.** The score knows you barely survived that ambush. The bar knows you fell over in it.
- **Acknowledge, curate and frame.** Notice tellable moments and help players capture and retell them: celebrations in the moment, session chronicles, mementos of the day the plan actually worked.
- **Make sharing easy.** The clip, the screenshot and the story of the tunnel chase travel to the Discord and beyond with the least possible friction.

### We won't

- Over-script set-piece moments, or fill every gap ourselves.
- Over-incentivise one right way to play, or steer players toward an obvious optimal.
- Punish leaving the path. No quest fails because something better happened.
- Sand off every rough edge. Perfect polish on every combination is not the bar; resonance is.
- **Celebrate a moment the player did not feel.** Amplification that fires on the wrong beat is noise, and it teaches players to ignore the real ones.

### No magic required

This pillar is mostly restraint plus a witness, and both start cheap. Authoring less and pointing less costs nothing to try. Real-time amplification begins as a music stinger, a barked line and a small camera nudge, long before it is anything more expensive.

One thing here is not cheap, and the draft should say so rather than wave at it. Slowing time in a shared world is not a presentation change: it touches animation, input windows, hit confirmation and everyone else standing next to you, and if it is faked visually while the simulation runs on, it reads as broken rather than cinematic. Robin's original wording, that *instances* slow time, is the version that is buildable. Outside an instance, the tools are camera, score, animation weight and sound, which can carry the same beat without touching shared simulation. Anything more than that is a technical decision, not a flourish.

Capture is a screenshot key and a quest log that reads like a diary before it is an in-game camera, and an in-game camera before it is a chronicle system. And every shared story is marketing nobody had to buy, which is what makes the rest of it worth funding.

---

# Pillar 6: Possibility, Never Obligation

*Built around your life, not in place of it / Whatever time you bring*

### Intent

The game fits into your life wherever life has room. Whatever time you bring, five minutes or a long Sunday, it produces something worth keeping. It earns a place in your routine rather than demanding one, and the best sign it is working is that it stays in your head between sessions: the plan for tomorrow, the theory in the Discord, the story from last night.

### Feels like

Guilt-free. Glad you came, whenever you came.

### This is about

- **Every session adding something.** A weapon, an upgrade, a friend, a memory.
- **Part of your life, not a demand on it.** The morning-coffee check-in, the lunch-break errand, the long Sunday session. We make the game embeddable; players do the embedding. It earns its place in a routine, and never installs itself into one.
- **Alive in your head after logout.** Planning tomorrow's build, theorycrafting in the Discord, retelling last night's disaster. Minds, not calendars.
- **Meaning over grind.** Wherever a task threatens to become rote, we replace repetition with mastery, discovery, creativity or surprise.
- **Any session length, always.** Worthwhile things to do in twenty minutes or five hours.
- **Depth without duty.** Depth is not the problem, obligation is. The player who has organised their week around a raid because they want to is not the failure case. The player who logs in resentfully to protect a streak is.
- **The freedoms of something chosen.** Chosen, returned to gladly, picked up and put down at will, no boss and no rota, and still capable of holding you for years.
- **What absence actually costs.** Nothing that compounds. No progress, power, standing or possession is taken from you for being away, and nothing you own decays because you were not there. Prices move and other people get on with things, because that is what a living economy does, but nothing is removed from you while you are gone. What you can miss is an occasion: the storm that passed through on Thursday, the rumour that was true that morning. A living world means occasions happen without you. It does not mean they were the only ones, or that any of them was the thing you needed.
- **Welcome back, whenever.** Away for a month? The world moved on, and piecing together what changed is part of the fun.

### This is not about

- Dailies, login streaks, FOMO, engineered retention.
- A game that punishes you for logging off or falling behind.
- Busywork dressed up as content.
- **Low ambition for people's time.** We absolutely want to be part of players' lives. We intend to deserve it.
- **A shallow or casual-only game.** The ceiling is as high as anyone wants to climb. What is missing is the requirement to.

### We will

- **Make sure time spent always yields something keepable.** Twenty spare minutes becomes a finished commission and a new acquaintance.
- **Build rhythms, not spikes.** Things worth returning to at your own cadence: the crop that ripens in a few days and keeps happily waiting, the market that shifts weekly. Never a reward that evaporates because you missed a day.
- **Gamify rote tasks in unexpected ways wherever repetition threatens.** The ferry ride that becomes a card game.
- **Let chosen grinds be chosen.** A whole evening just fishing, because you wanted to, not because a bar demanded it.
- **Welcome returning players back and help them piece together what changed.** Catching up on what the server did while you were away, and slotting straight back in.
- **Build activities granular, interruptible and scale-elastic wherever they can be.** A server project is contributed to in five-minute acts. A masterwork pauses mid-craft without loss. The grove encounter fits whoever shows up.
- **Offer honest variety across durations.** Quick things, evening things, and things worth a season.

### We won't

- Build any system whose loop only works because players feel they have to.
- Optimise for spikes over rhythms. An audience retained only by big beats needs constant injections of stimulation, and disappears between them.
- Gate content behind attendance.
- Waste the player's time and call it content.

### No magic required

Most of what this pillar asks for is something we decline to build, which is the cheapest kind of commitment to keep. The session-length promise stays affordable because it is properties rather than content: granular, interruptible, scale-elastic activities fill the short/long and solo/group matrix without a bespoke build per cell. And it is measured in the right thing. Not login streaks, but whether the game stays alive in players' minds between sessions: the talk, the theories, the fan culture. Regularity is a behavioural state; retention is only a measure of it. Build the first and the second follows.

---

# Pillar 7: Tend the World Together

*Heal the world together / Open in feeling, deliberate in shape*

### Intent

Tending the world is a way to play, not a side effect of playing. A broken world is healed, defended and improved through deliberate collective effort at framed sites: authored opportunities, collective execution. Players change the world's state, never its shape. Not a sandbox, and not a museum either.

How long any of it lasts is settled here, because a permanence tier is a statement about what a piece of work is worth over time, and that is a question about the work rather than about the memory of it.

### Feels like

Quiet pride. It is still standing because of us.

### This is about

- **Pushing back the dark.** Corruption is the renewable threat that keeps stewardship alive, and gives the healing its meaning.
- **Restoration that unlocks.** Restore the Alchemist Guild, and alchemy returns, for everyone, forever.
- **A ladder of ambition.** Your own quiet corner, a group's shared project, server-wide efforts that move the whole world. Every rung is a valid place to live.
- **Calm by default.** The world settles toward a gentle equilibrium, and players are the energy in the system. Like the protagonists of a story, nothing dramatic happens without them.
- **Your corner, for its own sake.** Order and beauty as their own reward, whether anyone else ever sees it.
- **Being part of something finished.** The bridge stands, the valley is green, and you were one of the people who did that.

### The permanence tiers

Every world change is placed in a tier when it is designed, and the tier is a promise we keep.

- **Forever.** Unlocks and the historical record. The Alchemist Guild reopened, and who reopened it. Never revoked, whatever an event does.
- **Long, and breakable.** Restored structures and settled regions. A repaired outpost stands until an incursion breaks it, and then players rebuild it.
- **Drifting.** Scars, blooms, populations, local conditions. They fade on their own as the world moves on, with no manual cleanup.

*The exact tier list, and who has authority to place a feature in a tier, is on the decisions list.*

### This is not about

- **A sandbox.** The authored world keeps its designed form.
- **Creator tools.** Players shape the world by playing it, not through editors. Most players do not want to be level designers; they want to leave a mark.
- **A museum.** The world is never static furniture.
- **Decay as punishment.** Nothing rots because you personally logged off.
- **Only grand projects.** Tending your own garden is stewardship too, and for many players it is the whole game.

### We will

- **Frame restoration, defence and improvement projects at designed sites**, and let players decide whether, when and who. A dozen strangers hauling stone for the bridge that has been out for weeks.
- **Give freeform building a bounded home.** Your house and your guild hall are yours to shape as you please.
- **Tier permanence, and honour it.** Unlocks are forever. A repaired outpost can break in an incursion. A scar on the land drifts away.
- **Let failure seed content.** A lost incursion changes what the world generates next, and never locks it.
- **Make contributions visible at every scale.** The plaque is optional; the greener valley is not.

### We won't

- Let players reshape open-world terrain or drop structures outside bounded spaces.
- Revoke permanent restorations, whatever an event does.
- Turn world upkeep into an obligation treadmill. Maintainable things invite defence, never demand it: a fallen outpost is next month's project, not a punishment for absence.
- Make stewardship a leaderboard. This is a shared effort, not a contribution contest.

### No magic required

A framed site is a finite set of authored states: the bridge is broken, or it is rebuilt. Art and engineering build the states, and players determine which one is live. The calm-by-default world is a damping rule, not a simulation: values drift home unless something pushes them.

---

# Pillar 8: A World of Worlds

*Playful worlds, serious systems / Tonal range, entered by choice*

### Intent

Cosy villages, scary forests, horror crypts, an island of 80s arcades, and zones from tiny partner islands to large open campaign maps. Dark places can go genuinely dark, because entering them is your choice. What varies between regions is register and local norms. What does not vary is the craft voice underneath and the lines that hold everywhere.

*This pillar owns tone, place and consent. Variety of play belongs to Pillar 3.*

### Feels like

Stepping through a door you chose.

### This is about

- **Every scale.** Tiny themed islands to sprawling campaign maps, each with its own character.
- **Places dense enough to believe in.** Rich in detail, built to look lived in and to work when they are full of players and NPCs rather than only when they are empty. A region's register is carried by how convincing the place is before it is carried by anything else.
- **Tonal spaces, entered by choice.** The choice is what makes the dark places possible: a crypt can be genuinely frightening because nobody arrived there by accident.
- **Norms by place, not one rulebook.** As in the real world, what is fine in the boxing ring is not fine in the library. An arena isle where hunting other players is the sport. A more adult-oriented quarter. A gentle starter vale. Each space wears its expectations openly.
- **One world holding registers that other games keep apart.** Genres, music and aesthetics that normally live in separate titles, sharing a world and a craft voice.
- **One game underneath.** Whatever the register, the craft voice and the deepest values stay recognisably ours.

### This is not about

- Tonal variety that fractures the game into unrelated pieces.
- **Anything goes.** Some things hold everywhere, whatever a zone's norms: no coercion, no punishing absence, the same care in the craft.
- **Surprise horror.** Nobody stumbles into the dark unwarned.

### We will

- **Make legibility load-bearing.** Zones telegraph their register and norms before entry. The forest gets quieter and darker, and you were warned in every way except words.
- **Keep default and onboarding paths in the gentle register.** A new player has to seek the scary out; it never finds them.
- **Let zones carry their own norms, by consent.** On the arena isles, hunting other players is the sport, and stepping ashore is signing up.
- **Hold the global lines in every zone.** No zone uses FOMO or punishment loops, whatever its theme.
- **Keep one connective craft voice across every register.** The cosy village and the horror crypt are unmistakably the same game.

### We won't

- Spring a register or norm change on players without the world having warned them.
- Let a zone's theme excuse coercion or dark patterns.
- Sand every zone down to one safe middle tone.

### No magic required

A tonal zone is direction, dressing and a small set of local rules, not a new art style or a separate game. Register and norms vary within one visual language and one craft voice.

**[RATIFY]** One coherent space with readable gradients, or explicit transitions between tonal zones? This affects world layout, not just art, and it blocks level design.

---

# The overriding design philosophy

Three questions, always:

- How can this make the player feel something memorable?
- Will this give players a story they will want to tell?
- What can I get here that I cannot get anywhere else?

**Motto: Be bold.**

## Designer checklist

Every feature, held against the pillars:

- Is this fun in its own right, if all rewards were removed?
- Could this create a memorable moment?
- Can players approach this in more than one way?
- Does this strengthen player identity, and do previous choices matter?
- Does the world respond?
- Does this system earn its place, or does it exist because MMOs have it?
- How does this also work with a friend, or a group?
- Does this ask for the player's time, or earn it?

## Art checklist

- Art assets are built with one eye on gameplay functionality. Flat roofs make parkour spaces.
- Villages, towns and cities are living spaces: art them to work when populated with players and NPCs.
- Tonal zones telegraph their register: visual language, naming and approach make transitions legible before entry.
- The world is one shared physical reality. Individual consequence is expressed through how the world treats you, never through divergent world states.

## Systemic design checklist

The player-facing commitments live in **The player is trusted**, at the front. This is the build-side version.

- Build behaviours as properties and rules, and hold verbs consistent across the whole world.
- Never hand-script what a system could generate, or build one-off logic where a rule would serve.
- Design for combination: the output of one system should be legible input to the next.
- State what tier a world change belongs to at design time, not at implementation time.
- Accept imperfection. Not every combination is hand-polished or QA-certified. Resonance is the bar.

---

# Decisions for the session

1. **Objectives that a changing world cannot strand.** The biggest open design area in the document, by Simon's own assessment, and the biggest opportunity. We need the pattern and the exception list before content design scales.
2. **Do pillars 3 and 4 stay merged?** This draft merges them. The strongest counter-argument, which deserves a hearing, is that they are orthogonal tests: one asks whether the game presents a different situation on a repeat visit, the other asks whether a given situation admits more than one answer. A flooded ruin with three routes through it can be identical every time. A storm-lashed encounter full of new enemies can still be a damage check. Merged, a feature can satisfy one half and cite the pillar. The dual test written into the pillar is intended to close that gap; if the room does not believe it does, splitting them back out is one edit.
3. **Robin's quest branches versus one shared world.** Robin promises that quest branches change what you see forever. This draft forbids divergent world states and offers access, reputation, NPC relationships and authored interiors instead. That is a rejection rather than a synthesis, and Robin should get to argue it.
4. **World layout: readable gradients, or explicit transitions between tonal zones.** Blocks level design.
5. **The permanence tier list.** Confirm the three tiers, agree what "forever" costs us, and agree who has authority to place a feature in one.
6. **Optimisation.** Robin rules out celebrating min-maxing; Simon promises theorycrafting and a weekend in the stat sheets. This draft follows Simon, bounded by the viability rule. Robin should say whether that is what he meant.
7. **Inheritance across accounts.** Keep the ambition, get the economy answer on real-money-trading exposure and the legal answer on minors' accounts before it is said publicly.
8. **The business model.** What is sold, given that identity may not be and FOMO may not be used.
9. **The first hour, and month six.** Neither draft describes either.
10. **PvP scope and ownership.**
11. **Pillar 6's name.** Possibility, Never Obligation, proposed here in place of A Hobby, Not a Job. Contest it if you want the original back.

---

*Prepared by Glen Pryer, NBI, 27 July 2026. Worked from two sources: Simon's Design Pillars Unified Draft and Robin's The Pillars. Part 1 sets out every change made to them and the reasoning for it. Where Part 2 carries a commitment that appears in neither source, treat it as a proposal from this review rather than as something already agreed.*
