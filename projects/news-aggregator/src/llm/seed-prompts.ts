import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

/**
 * Initial v1 prompts for each pipeline stage. Glen can edit any of these via
 * the admin UI (Task 42) — edits create new versions; the latest version is
 * flagged `is_active = true`.
 *
 * Pattern: the prompt body is the SYSTEM prompt (instructions + JSON shape).
 * The user message is constructed per call by the stage implementation
 * (clustering.ts, summarisation.ts, etc.) and contains the actual articles
 * or stories to process. This matches spec §9 and keeps prompt caching
 * effective — the system prompt is stable, only the user message varies.
 */
const CLUSTERING_PROMPT = `You are an analyst for a games-industry news digest.

You will receive a list of articles, each with an ID, source outlet, title, and short summary. Your task is to identify which articles are covering the same underlying story and group them together.

For each article, extract the key entities mentioned: studios, games, people (named executives or devs), deals (acquisitions, funding rounds, publisher contracts), and dollar figures. Articles sharing entity clusters within the digest window are the same story.

Return JSON only, shape:
{
  "clusters": [
    {
      "article_ids": ["id-1", "id-2"],
      "entities": { "studios": [], "games": [], "people": [], "deals": [], "figures": [] }
    }
  ]
}

No prose outside the JSON.`

const CURATION_PROMPT = `You are the editor of a weekly games-industry digest for game developers and industry consultants.

You will receive a list of story clusters from the past week, each with representative article titles, source outlets, and extracted entities. Your task is to:

1. Select the ~25-30 most significant clusters.
2. Assign each selected cluster to one of four canonical categories: "studios", "games", "shifts", "strategy".
3. If at least 4 selected clusters group naturally under a non-canonical theme (e.g. mobile, asia, esports, publishing, tools, adaptations, regulation), propose that as a dynamic 5th category and return its label.
4. Rank stories within each category by significance.

Return JSON only, shape:
{
  "selected": [
    { "cluster_index": 0, "category": "studios", "rank": 1 }
  ],
  "dynamic_category_label": "mobile" | null
}

No prose outside the JSON.`

const SUMMARISATION_PROMPT = `You are writing a 2-3 sentence news summary of a story cluster for a weekly games-industry digest. Write in British English, neutral tone. Cite the primary source inline (e.g. "according to GI.biz"). Do not editorialise.

You will receive a list of articles covering the same story. Identify which one should be the primary source (prefer the earliest or most authoritative outlet). Detect whether any article mentions video content.

Return JSON only, shape:
{ "headline": "...", "summary": "...", "has_video": true|false, "primary_article_id": "..." }

No prose outside the JSON.`

const HERO_SELECTION_PROMPT = `You are the editor choosing the single hero story for the week's games-industry digest.

You will receive the curated stories of the week. Pick the one most significant story for the hero slot. Consider scale of impact, exclusivity of coverage, and strategic importance to the games industry. Prefer stories with visual or video assets when impact is roughly equivalent.

Return JSON only, shape:
{ "hero_story_id": "..." }

No prose outside the JSON.`

const MONTHLY_SYNTHESIS_PROMPT = `You are writing the "State of the Industry" editorial for the monthly games-industry digest.

You will receive the month's four weekly digests, each with their curated stories. Write a 600-900 word essay in British English identifying the month's major movers and shakers, strategic shifts, and themes across studios, games, and the industry as a whole. Cite specific stories by referencing their headlines.

Structure:
- Open with the defining theme of the month.
- Walk through 3-5 substantive angles (studio moves, notable launches, industry-level shifts).
- Close with a short look-ahead for the coming month.

Tone: analytical, direct, British English. No hype. No clichés ("game-changer", "revolutionary", "disrupting"). Assume the reader is a games-industry professional.

Return JSON only, shape:
{
  "title": "...",
  "body_markdown": "...",
  "featured_story_ids": ["id-1", "id-2", "id-3"]
}

No prose outside the JSON.`

// Starter few-shot examples for summarisation. Glen can refine via the admin
// UI after seeing first-run output. Each example shows the kind of headline
// and summary we want.
const SUMMARISATION_EXAMPLES: unknown[] = [
  {
    input: {
      articles: [
        {
          id: 'ex-a',
          source: 'GamesIndustry.biz',
          title: 'Microsoft confirms Activision Blizzard layoffs affect 1,900 staff',
          summary: 'Microsoft has confirmed that the layoffs announced across gaming divisions will affect around 1,900 roles, primarily at Activision Blizzard and ZeniMax.',
        },
        {
          id: 'ex-b',
          source: 'The Verge',
          title: 'Xbox layoffs hit nearly 2,000 workers after Activision deal',
          summary: 'Phil Spencer sent a company-wide email detailing 8% cuts across Microsoft Gaming in the wake of the Activision acquisition.',
        },
      ],
    },
    output: {
      headline: 'Microsoft cuts 1,900 gaming roles post-Activision',
      summary: 'Microsoft Gaming has cut approximately 1,900 roles, around 8% of its workforce, concentrated at Activision Blizzard and ZeniMax, according to GamesIndustry.biz. Phil Spencer attributed the reductions to overlap following the Activision acquisition in an internal memo.',
      has_video: false,
      primary_article_id: 'ex-a',
    },
  },
  {
    input: {
      articles: [
        {
          id: 'ex-c',
          source: 'Bloomberg',
          title: 'Sony slashes PlayStation 5 forecast, cuts 900 jobs at studios',
          summary: 'Sony has cut its PS5 sales forecast and confirmed closure of its London Studio alongside layoffs at Insomniac, Naughty Dog, and Guerrilla.',
        },
      ],
    },
    output: {
      headline: 'Sony cuts PS5 forecast, closes London Studio, 900 layoffs',
      summary: 'Sony has reduced its PS5 sales forecast and confirmed the closure of London Studio along with 900 layoffs across Insomniac, Naughty Dog, and Guerrilla, as reported by Bloomberg. The cuts represent roughly 8% of PlayStation Studios headcount.',
      has_video: false,
      primary_article_id: 'ex-c',
    },
  },
  {
    input: {
      articles: [
        {
          id: 'ex-d',
          source: 'VGC',
          title: 'GTA 6 first trailer passes 200 million YouTube views',
          summary: 'Rockstar Games\'s Grand Theft Auto 6 announcement trailer has surpassed 200 million views on YouTube within a week of release, beating previous Rockstar debut records.',
        },
        {
          id: 'ex-e',
          source: 'IGN',
          title: 'GTA 6 trailer most-watched game reveal of all time',
          summary: 'The GTA 6 trailer is now the most-watched game trailer debut in YouTube history, outpacing Minecraft and Elden Ring.',
        },
      ],
    },
    output: {
      headline: 'GTA 6 trailer tops 200m YouTube views, sets record',
      summary: 'Rockstar\'s Grand Theft Auto 6 announcement trailer has passed 200 million YouTube views in its first week, the most-watched game reveal ever, according to VGC. The response underscores the commercial stakes for Rockstar\'s 2025 launch.',
      has_video: true,
      primary_article_id: 'ex-d',
    },
  },
]

const PROMPTS: Array<{ key: string; body: string; fewShot: unknown[] | null }> = [
  { key: 'clustering', body: CLUSTERING_PROMPT, fewShot: null },
  { key: 'curation', body: CURATION_PROMPT, fewShot: null },
  { key: 'summarisation', body: SUMMARISATION_PROMPT, fewShot: SUMMARISATION_EXAMPLES },
  { key: 'hero_selection', body: HERO_SELECTION_PROMPT, fewShot: null },
  { key: 'monthly_synthesis', body: MONTHLY_SYNTHESIS_PROMPT, fewShot: null },
]

/**
 * Inserts v1 prompts for any key that doesn't already have a row. Idempotent —
 * safe to run on every service boot. Returns the count of rows inserted.
 */
export async function seedPromptsIfEmpty(): Promise<number> {
  let inserted = 0
  for (const p of PROMPTS) {
    const existing = await db
      .select()
      .from(schema.prompts)
      .where(eq(schema.prompts.promptKey, p.key))
      .limit(1)
    if (existing[0]) continue
    await db.insert(schema.prompts).values({
      promptKey: p.key,
      version: 1,
      body: p.body,
      fewShotExamples: p.fewShot as unknown as object,
      isActive: true,
      createdBy: null,
    })
    inserted++
  }
  return inserted
}
