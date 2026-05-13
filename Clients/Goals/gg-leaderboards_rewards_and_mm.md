# GG-Leaderboards, Rewards & MM

**Source:** GG-Leaderboards, Rewards & MM-150426-101855.pdf

---

## Page 1

Leaderboards, Rewards & MM
All leaderboards, rewards, and matchmaking in GOALS are game-mode specific. This means
that they will be introduced step by step in the following order:
1) Divisions (1v1)
2) Evolution (1v1)
3) Tournaments (1v1)
4) Divisions (5v5)
5) Quick Play (1v1)
6) Quick Play (5v5)
Divisions:
Separate skill rating, leaderboard, and rewards for Divisions 1v1 and Divisions 5v5. Structure
otherwise the same. This is our hardcore mode where we always secure competitive games on-
demand.
Leaderboard
Div 10 - 1 + TOP 500 leaderboard. 
Users can see their current skill rating, and thresholds for promotion/relegation to the next
division.
TOP 500 is based on the highest skill rating, and if the skill rating is tied, the user who
achieved it first is placed highest on the leaderboard. 
The TOP 500 can be filtered by Global/Regional/Friends. Global by default.
The TOP 500 leaderboard always has the local userʼs rank present at the bottom. E. g.
“54,737”
Rewards
Seasonal rewards based on final division or global TOP 500 placement at the end of a season.
Users can inspect seasonal rewards at any point for each division, e.g. 
Division 3: 10 x Standard packs, 3 x uncommon packs, 1 x rare pack, 1 x Brazil kit, 1 x Samba
Celebration, 1 x Copacabana ball.
Coin reward for every game, increasing amount in higher divisions. 
X amount of coins for a win, Y amount of coins for a loss. Leaving before full-time gives the
user Y -(playtime/90) number of coins. The reasoning behind this is that we do not want to

---

## Page 2

prohibit users from leaving games where they have given up. This would create a bad
experience for both users.
A minimum amount of games per season will be required to be eligible for seasonal rewards. 
Skill rating adjustments + leaderboard reset at the end of every season.
Matchmaking
Strict SBMM, where users can only match against other users (or teams for 5v5) within +- X%
of their own matchmaking.
Skill rating requirements will have to loosen up for outliers. Otherwise the lowest and highest
ranked users in the world would find it impossible to find a game
When several options are available, we should match users to create the lowest latency
possible for both users
In demographic areas with a small user base, or during certain periods of the day, user
liquidity can be low. At these points, we need to be prepared to widen skill rating thresholds
and/or latency requirements to find games within a reasonable time. What works in our favor
is that games are fairly short (12 minutes), meaning the liquidity of users searching for a game
is generally high.
Evolution: 
Evolution is a weekly 1v1 game mode that runs from Tuesday to Sunday. This is the only game
mode where users can earn stat upgrades for their players.
Leaderboard
13 ranks (bronze 3/2/1, silver 3/2/1, gold 3/2/1, elite 3/2/1, knockout) + TOP 500 based on
longest streak in knockout level. For tied streaks, the user who achieved it first is placed on
top in the leaderboard. 
Users can always see their current rank, and the required amount of wins to achieve the next
rank.
Ranks + leaderboard reset every week (Monday). Game mode running Tuesday-Sunday.
TOP 500 can be filtered by Global/Regional/Friends. TOP 500 for regional and friends is
ordered by, in descending order:

---

## Page 3

- Placement on global TOP 500
- Knockout streak
- Final rank (Elite 1 falling to Bronze 3)
The local userʼs final rank is always present at the bottom of the leaderboard, e. g. “Gold 1”
Rewards
Weekly rewards based on final rank or global TOP 500 placement.
User finishing outside the TOP 500 get their Evolution rewards instantly. Users who are in the
TOP 500 get their rewards on Monday when their final placement has been settled (or when
they are pushed out of the TOP 500).
Users can inspect the rewards for each rank whenever they want. E.g. 
Silver 2: 4 x Standard packs, 1 x Uncommon pack, 4 x player upgrades, 1 x Hyper Kit.
Coins for every game won, increasing amount in later levels.
X amount of coins for a win, Y amount of coins for a loss. Leaving before full-time gives the
user Y -(playtime/90) number of coins. The reasoning behind this is that we do not want to
prohibit users from leaving games where they have given up. This would create a bad
experience for both users.
Matchmaking
Matchmaking is round-based, where users can match against anybody within the same
round. We propose the following matchmaking pools:
Pool 1: Bronze 1,2,3
Pool 2: Silver 1,2,3
Pool 3: Gold 1,2,3
Pool 4: Elite 1,2,3 + Knockout
When several options are available, we should match users to create the lowest latency
possible for both users
In demographic areas with a small user base, or during certain periods of the day or week,
user liquidity can be low. At these points, we need to be prepared to merge matchmaking
pools and/or loosen our latency requirements to find games within a reasonable time. If
matchmaking pools are merged for this reason, it needs to be merged upwards to not create
exploitable scenarios. I. e. if we cannot find a game in the silver pool, we look in the gold pool
for a game, not the bronze pool. What works in our favor is that games are fairly short (12

---

## Page 4

minutes), meaning the liquidity of users searching for a game is generally high.
Tournaments
The long-term vision is for users to be able to host custom tournaments in GOALS. However,
that is not something we will have in place for the full launch. Instead, we will focus on
repeatable GOALS-hosted tournaments, where users can match against any user in the same
round. This makes it quick to find tournament games, and users do not have to play the full
tournament at once if they donʼt want to.
Leaderboards
No leaderboard, users can only see which round of a tournament they are currently in (round
of 16, quarter-final, semi-final, final)
Rewards
4 rounds, bonus reward for winning the final, e. g. a standard player pack or a cosmetic. Users
can inspect this reward before starting a tournament.
X amount of coins for a win, Y amount of coins for a loss. Leaving before full-time gives the
user Y -(playtime/90) number of coins. The reasoning behind this is that we do not want to
prohibit users from leaving games where they have given up. This would create a bad
experience for both users.
The reward for winning the tournament can only be claimed once per user. The tournament
can be re-entered indefinitely until the expiry date, even if the reward for winning has already
been claimed.
Tournaments are GOALS-hosted, and new tournaments will be launched on a regular basis. At
least two times per week.
Each tournament comes with a specific set of entry requirements, e. g. max. team rating 84,
min. 2 Brazilian players, max. 3 legends. This needs to be easy to set up for every new
tournament.
Each tournament comes with a new reward. Setting the reward for winning a tournament
needs to be easy.
Each tournament has a limited run-time, e. g. 7 days. Setting this time limit needs to be
straight forward.

---

## Page 5

Matchmaking
Matchmaking is round-based, i.e. users can only match against users in the same round.
When several options are available, we should match users to create the lowest latency
possible for both users
In demographic areas with a small user base, or during certain periods of the day or week,
user liquidity can be low. At these points, we need to be prepared to merge matchmaking
pools and/or loosen our latency requirements to find games within a reasonable time. If
matchmaking pools are merged for this reason, it needs to be merged upwards to not create
exploitable scenarios. I. e. if we cannot find a game in the “quarter-final pool”, we look in the
“semi-final pool” for a game, not the “round of 16 pool”. What works in our favor is that games
are fairly short (12 minutes), meaning the liquidity of users searching for a game is generally
high.
Quick Play
Quick Play is a game mode where you can play completely without any pressure, as it wonʼt
affect your skill rating or rewards progression. You can get into a casual game, 1v1 or 5v5, very
quickly.
No Leaderboard or rewards
Open matchmaking skill-rating-wise
1v1 games can be played against a friend or a random user. When playing against a friend, no
matchmaking is required. 5v5 games can also be played either internally with friends, or be
matchmaked against another team. If played internally, users will face a similar team-setup
screen as the one we currently have in 5v5 (see below), where any number of users between
1-10 is allowed. If matchmaking is against another team, both teams will be filled up to
constitute 5 users. So if we for example search for a quick play game as a part of 3, the
remaining two spots on our team will be filled up with either a party of 2 or two individual
users. 

---

## Page 6

The Arena
No Leaderboard, matchmaking, or rewards
