# GG-Ranked

**Source:** GG-Ranked-150426-101608.pdf

---

## Page 1

Ranked
Game Mode
The Ranked game mode utilizes a rank system, where users strive to climb in ranks on a weekly
basis, starting in Division 10 at the beginning of each week (9:00 on Mondays) with the ambition
to get to rank 1. The rank a user has in the Ranked game mode is decided by how many Ranking
Points they have gathered during the week, which is an up-only value based on the number of
games and performance. Ranking points should not be confused with Skill Rating, which is a
separate value that we use for matchmaking purposes, but that does not determine a userʼs
rank. Ranking points and rank reset on a weekly basis (Monday 9:00), whereas Skill Rating does
not reset.
See the ranking points buckets for each rank under “Rank Rewards”.
Matchmaking
For matchmaking, we strictly use Skill Rating, a value that does not reset when ranking points
are reset.
Match Points
Users playing Ranked get a points reward after every game according to our soft currency
reward formula (currently used in Quickplay, ).
However, in Ranked, the number of soft currency gained from a match increases with the skill
rating (not to be confused with ranking points) of the opponent. This is to avoid users from
intentionally tanking their skill rating to easier farm rewards. The same base soft currency
formula as for Quickplay will be used, but with a multiplier based on the SR of the opponent. The
multiplier should be setup the following way, linearly increasing between 500 and 2500 SR:
≤500 - 1.0 soft currency multiplier
≥2500 - 2.0 soft currency multiplier
The SR soft currency multiplier is applied both to the winning and losing user, as well as if the
game end in a draw. The calculation of soft currency from a ranked game hence becomes:
Loser/Winner soft currency * Duration multiplier * SR multiplier. The theoretical maximum soft
currency a user can earn if beating a 2500+ SR user in a game that runs the full duration would
be: 1000 * 1.0 * 2.0 = 2000 soft currency.GG-6640: Quickplay coin rewardsDONE

---

## Page 2

If a user disconnects, they are considered the loser of the game but are rewarded with soft
currency for the duration they stayed in the game. The SR multiplier is applied even in a case
where a user disconnects.
For the user that remains in a game after their opponent disconnects, they are considered the
winner of the game, and get rewarded with winner soft currency for the duration the game
lasted. The SR multiplier is applied to the remaining user as well.
Rank Rewards
In addition to soft currency after a match, users also get rewards based on their rank
determined by their number of ranking points. These rewards come in two forms - instant soft
currency bonus when reaching a new rank, and weekly rewards (player pack(s)) based on the
rank a user has when the reset occurs. Below is the breakdown of rewards per rank:
Rank 10
Ranking points: 0-199
Weekly rewards: None
Rank 9
Ranking points: 200-299
Weekly rewards:
Rank 8
Ranking points: 300-399
Weekly rewards: 1 10 Basic+Contains 10x Basic+ (40+)Pack
NumberPack NameDescription
1 10 Basic+Contains 10x Basic+ (40+)Pack
NumberPack NameDescription

---

## Page 3

Rank 7
Ranking points: 400-499
Weekly rewards:
Rank 6
Ranking points: 500-599
Weekly rewards: 
Rank 5
Ranking points: 600-699
Weekly rewards: 2 10 Basic+Contains 10x Basic+ (40+)
1 10 Basic+Contains 10x Basic+ (40+)
2 10 Basic+Contains 10x Basic+ (40+)
3 2 Common+Contains 2x Common+ (60+)Pack
NumberPack NameDescription
1 10 Basic+Contains 10x Basic+ (40+)
2 10 Basic+Contains 10x Basic+ (40+)
3 4 Common+Contains 4x Common+ (60+)Pack
NumberPack NameDescription
1 10 Basic+Contains 10x Basic+ (40+)
2 10 Basic+Contains 10x Basic+ (40+)Pack
NumberPack NameDescription

---

## Page 4

Rank 4
Ranking points: 700-799
Weekly rewards: 
Rank 3
Ranking points: 800-899
Weekly rewards: 
Rank 2
Ranking points: 900-999
Weekly rewards:  3 10 Basic+Contains 10x Basic+ (40+)
4 4 Common+Contains 4x Common+ (60+)
1 10 Basic+Contains 10x Basic+ (40+)
2 10 Basic+Contains 10x Basic+ (40+)
3 10 Basic+Contains 10x Basic+ (40+)
4 6 Common+Contains 6x Common+ (60+)Pack
NumberPack NameDescription
1 10 Basic+Contains 10x Basic+ (40+)
2 10 Basic+Contains 10x Basic+ (40+)
3 2 Common+Contains 2x Common+ (60+)
4 1
Uncommon+Contains 1x Uncommon+ (70+)Pack
NumberPack NameDescription

---

## Page 5

Rank 1
Ranking points: ≥ 1000
Weekly rewards: 
Leaderboard
TOP500 global leaderboard based on current skill rating. The ranking points value should not
be displayed in the leaderboard, but we show a symbol indicating what rank a user is currently
in.
The local user's leaderboard placement should be visible to the local user even if they are
outside the global TOP500.
Long-term: The TOP500 leaderboard should be sortable by region and friends list. The purpose1 10 Basic+Contains 10x Basic+ (40+)
2 10 Basic+Contains 10x Basic+ (40+)
3 5 Common+Contains 5x Common+ (60+)
4 1
Uncommon+Contains 1x Uncommon+ (70+)Pack
NumberPack NameDescription
1 10 Basic+Contains 10x Basic+ (40+)
2 10 Basic+Contains 10x Basic+ (40+)
3 10 Basic+Contains 10x Basic+ (40+)
4 5 Common+Contains 5x Common+ (60+)
5 1
Uncommon+Contains 1x Uncommon+ (70+)Pack
NumberPack NameDescription

---

## Page 6

of those filters is to see how you compare to different groups of interest.