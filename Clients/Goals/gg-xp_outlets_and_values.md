# GG-XP Outlets and Values

**Source:** GG-XP Outlets and Values-150426-101845.pdf

---

## Page 1

XP Outlets and Values
By earning XP users are working towards unlocking player upgrades. The amount of XP required
for each player to unlock their next upgrade depends on their current tier, where a higher tier
requires more XP for the next unlock. Whenever users earn XP, all players in their inventory 
gets that amount added to their total. 
The following amount of XP is required per tier to unlock the next upgrade:
Basic 500,000 XP
Common 1,000,000 XP
Uncommon 1,500,000 XP
Rare 2,500,000 XP
Epic 4,000,000 XP
Legendary 5,500,000 XP
Mythic 7,500,000 XP
(Note: in the UI we will display the total amount of XP a player has gathered during their career. 
This means that if a basic player gets their first upgrade at 500,000 XP and their tier increases
to common after their upgrade, their next upgrade will be unlocked at 500,000 + 1,000,000 =
1,500,000 XP).
There are a number of different ways to earn XP in GOALS
1)Match rewards
After every game users get rewarded with XP. The amount of XP awarded will follow the same
formula as we use for match points today (but with different base values). The base values for
playing a game differ based on game mode:
Ranked
Win = 10,000 XP
Loss = 5,000 XP
Quickplay
Win = 7,500 XP
Loss = 3,750 XP

---

## Page 2

Friendly
Win = 5,000 XP
Loss = 2,500 XP
Bot Mode
Win = 5,000 XP
Loss = 2,500 XP
Just like our match points formula, we will also apply a multiplier based on game time to ensure
the system cannot be manipulated by colluding users. That means that a game that lasted 1 in-
game minute will have a 1/90 XP multiplier, whereas a game that lasted the full 90 minutes (or
even went to Golden Goal) will have an XP multiplier of 90/90 = 1.
Important to note is that just like for match points, users still get rewarded with losing XP even if
they leave a game. The reason for this is to not force users whoʼve given up on a game to stick
around just to not lose out on points/XP, which is not a desirable experience for either user. I. e.
even if you leave, you still get rewarded for the time you spent in the game.
A concrete example of a match XP reward (Ranked) would look like this:
User leaves in 27th minute. This results in a time multiplier of 27/90, with a base loss value of
5,000 in Ranked → 5,000 * (27/90) = 1,500 XP earned.
2) Challenges & Swaps Rewards
Every week, 500,000 XP will be handed out through challenges and Swaps.
Since time-limited Swaps are not supported yet, all 500,000 XP will be handed out through
challenges initially every week. However, when we add the ability for time-limited Swaps we
should also add the ability to assign XP as a reward type, and the 500,000 XP will be spread
across challenges and Swaps.
3) Ranked Rewards
XP will also be added as part of the Ranked rewards (which also needs admin support). To give
all users an equal opportunity to develop their players regardless of skill-level, the XP rewards

---

## Page 3

will be the same across all ranks. However, the XP reward will differ based on reward tiers to
reward those who put in a lot of effort during a week.
Tier 1: 100,000 XP
Tier 2: 150,000 XP
Tier 3: 250,000 XP
Tier 4: 400,000 XP
Tier 5: 600,000 XP
4) Tournaments
Tournaments will be used as another XP outlet. There are two ways a user can earn XP by
playing tournaments:
Match XP reward - Same formula as described for the match XP reward under 1), but with
round-specific base values.
Round 1:
Win = 5,000 XP
Loss = 2,500 XP
Round 2:
Win = 7,500 XP
Loss = 3,750 XP
Round 3: 
Win = 10,000 XP
Loss = 5,000 XP
Round 4
Win = 15,000 XP
Loss = 7,500 XP
XP Reward for winning a tournament
If a user wins the tournament, they are given a bigger XP reward as part of the tournament
victory reward.

---

## Page 4

First tournament win reward: 250,000 XP
Repeatable tournament win reward: 100,000 XP
Other requirements:
1) When playing their first game of the day, users receive an XP Bonus of 50,000 XP (a new day
starts for all users at the same time. The time of the day should be aligned with the daily free
pack reset, which I believe is 1 am CET)
2) When playing their first game of the week, users receive an XP Bonus of 100,000 XP (a new
week starts for all users at the same time, and should be aligned with the ranked reset on
Monday mornings).
3) Admin support for XP reward in challenges, and (eventually) Tournaments and Swaps.
4) For FTUE purposes, when a user completes their first game, one player in the inventory
should immediately be given enough XP to reach their next upgrade to quickly introduce the
concept to new users. This is simply a one-time thing after a userʼs very first game, with no
other implications on the system. A player of the lowest tier available should be selected for this
immediate upgrade (most likely a basic, but if there are no basic players in the collection, a
common player is instead picked, and so on).
5) When a player has retired, they can no longer earn any XP, but they keep all the XP they
gathered throughout their career and any unrealized upgrades are still available.
6) To convert a retired player to a legend, all unrealized upgrades must first be unlocked. When
a retired player no longer has enough XP for another upgrade, they become eligible for legend
conversion.
Important! All XP values above are just starting values, and we expect to balance this system a
lot over time. Therefore, it is important that all valuables are easy to adjust when we see a need
for it (unlock thresholds, game mode rewards, match rewards, etc.).
Long-term:

---

## Page 5

Support for XP rewards in the 5v5 and Knockout game modes. This will require a bit of re-
balancing of the values above to ensure the total inflow of XP per week remains similar.
UX Specific Requirements:
In order to present XP in a logical way to users at the end of each match, it is important that we
are able to communicate each individual component of XP that was awarded. That means
things like “first match of the week” or “first match of the day” should be elements that can be
presented both as their individual XP, and together with the combined XP bucket earned.