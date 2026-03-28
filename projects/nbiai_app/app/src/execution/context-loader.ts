/**
 * Context Loader — assembles the three-tier knowledge context for an agent
 * before it runs.
 *
 * Tier 1: company-wide knowledge (all agents, every run)
 * Tier 2: role-specific knowledge (per role slug)
 * Tier 3: project-specific knowledge (per task's project, if any)
 *
 * Files are read directly from the NBIAI Team repo on disk.
 * Missing files are silently skipped (a warning is logged).
 *
 * Token estimate: rough calculation at (total chars / 4) — accurate enough
 * for budget gating without requiring a full SDK token count on every load.
 */

import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { eq } from 'drizzle-orm'

import { db } from '../db/index.js'
import { agents, roles, tasks, projects } from '../db/schema.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentContext {
  /** The role's assembled system prompt. */
  systemPrompt: string
  /** Concatenated content of all Tier 1 knowledge files. */
  tier1Knowledge: string
  /** Concatenated content of all Tier 2 knowledge files. */
  tier2Knowledge: string
  /** Concatenated content of all Tier 3 knowledge files (empty string if no project). */
  tier3Knowledge: string
  /** The task description and current assignment block. */
  taskContext: string
  /** Estimated total tokens: (totalChars / 4), rounded. */
  estimatedTokens: number
}

// ---------------------------------------------------------------------------
// Repo path
// ---------------------------------------------------------------------------

const REPO_PATH = process.env.NBIAI_REPO_PATH ?? 'D:/OneDrive/Claude_code/NBIAI_TEAM'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read a single file from disk. Returns the contents as a string, or null if
 * the file does not exist or cannot be read. Logs a warning on failure.
 */
async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8')
  } catch (err) {
    console.warn(`[context-loader] Skipping missing file: ${filePath}`, (err as NodeJS.ErrnoException).code)
    return null
  }
}

/**
 * Read all .md files from a directory. Returns concatenated content with
 * a simple header per file so the model can identify the source.
 * Returns an empty string if the directory does not exist.
 */
async function readMarkdownDir(dirPath: string): Promise<string> {
  let entries: string[]

  try {
    const dirEntries = await readdir(dirPath, { withFileTypes: true })
    entries = dirEntries
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name)
      .sort()
  } catch (err) {
    console.warn(`[context-loader] Skipping missing directory: ${dirPath}`, (err as NodeJS.ErrnoException).code)
    return ''
  }

  const chunks: string[] = []

  for (const fileName of entries) {
    const filePath = join(dirPath, fileName)
    const content = await readFileSafe(filePath)
    if (content !== null) {
      chunks.push(`### ${fileName}\n\n${content.trim()}`)
    }
  }

  return chunks.join('\n\n---\n\n')
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Load the full three-tier context for an agent run.
 *
 * @param agentId - UUID of the agent being run.
 * @param taskId  - UUID of the task being worked on, or null for heartbeat runs.
 * @returns       Assembled AgentContext ready to pass to the Claude client.
 */
export async function loadAgentContext(
  agentId: string,
  taskId: string | null,
): Promise<AgentContext> {
  // -------------------------------------------------------------------------
  // 1. Load agent + role from database
  // -------------------------------------------------------------------------

  const agentRows = await db
    .select({
      agentName: agents.name,
      agentConfig: agents.config,
      personaOverride: agents.personaOverride,
      roleSlug: roles.slug,
      roleName: roles.name,
      systemPromptPath: roles.systemPromptPath,
      personaPath: roles.personaPath,
      responsibilitiesPath: roles.responsibilitiesPath,
    })
    .from(agents)
    .innerJoin(roles, eq(agents.roleId, roles.id))
    .where(eq(agents.id, agentId))
    .limit(1)

  if (agentRows.length === 0) {
    throw new Error(`[context-loader] Agent not found: ${agentId}`)
  }

  const agent = agentRows[0]
  const roleSlug = agent.roleSlug

  // -------------------------------------------------------------------------
  // 2. Load task + project (if task is provided)
  // -------------------------------------------------------------------------

  let taskRecord: {
    title: string
    description: string | null
    status: string
    priority: string
    projectId: string
    output: string | null
  } | null = null

  let projectRecord: {
    name: string
    slug: string
    description: string | null
  } | null = null

  if (taskId !== null) {
    const taskRows = await db
      .select({
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        projectId: tasks.projectId,
        output: tasks.output,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (taskRows.length > 0) {
      taskRecord = taskRows[0]

      const projectRows = await db
        .select({
          name: projects.name,
          slug: projects.slug,
          description: projects.description,
        })
        .from(projects)
        .where(eq(projects.id, taskRecord.projectId))
        .limit(1)

      if (projectRows.length > 0) {
        projectRecord = projectRows[0]
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. System prompt (Tier 0 — role persona + system prompt)
  // -------------------------------------------------------------------------

  const systemParts: string[] = []

  // Role system prompt from filesystem
  if (agent.systemPromptPath) {
    const absPath = join(REPO_PATH, agent.systemPromptPath)
    const content = await readFileSafe(absPath)
    if (content) systemParts.push(content.trim())
  } else {
    // Fallback: try the conventional location
    const conventionalPath = join(REPO_PATH, 'roles', roleSlug, 'prompts', 'system_prompt.md')
    const content = await readFileSafe(conventionalPath)
    if (content) systemParts.push(content.trim())
  }

  // Role persona
  if (agent.personaOverride) {
    systemParts.push(`## Persona\n\n${agent.personaOverride.trim()}`)
  } else if (agent.personaPath) {
    const absPath = join(REPO_PATH, agent.personaPath)
    const content = await readFileSafe(absPath)
    if (content) systemParts.push(`## Persona\n\n${content.trim()}`)
  } else {
    const conventionalPath = join(REPO_PATH, 'roles', roleSlug, 'persona.md')
    const content = await readFileSafe(conventionalPath)
    if (content) systemParts.push(`## Persona\n\n${content.trim()}`)
  }

  // Current date/time and agent identity block
  const now = new Date()
  systemParts.push(
    `## Context\n\nCurrent date and time: ${now.toISOString()}\n\n` +
    `You are ${agent.agentName}, the ${agent.roleName} at NBI.`,
  )

  const systemPrompt = systemParts.join('\n\n')

  // -------------------------------------------------------------------------
  // 4. Tier 1 — Company-wide knowledge
  // -------------------------------------------------------------------------

  const tier1Dir = join(REPO_PATH, 'company', 'knowledge')
  const tier1Knowledge = await readMarkdownDir(tier1Dir)

  // -------------------------------------------------------------------------
  // 5. Tier 2 — Role-specific knowledge
  // -------------------------------------------------------------------------

  const tier2Parts: string[] = []

  // knowledge/ directory
  const tier2KnowledgeDir = join(REPO_PATH, 'roles', roleSlug, 'knowledge')
  const tier2KnowledgeContent = await readMarkdownDir(tier2KnowledgeDir)
  if (tier2KnowledgeContent) tier2Parts.push(tier2KnowledgeContent)

  // responsibilities.md
  if (agent.responsibilitiesPath) {
    const absPath = join(REPO_PATH, agent.responsibilitiesPath)
    const content = await readFileSafe(absPath)
    if (content) tier2Parts.push(`### responsibilities.md\n\n${content.trim()}`)
  } else {
    const conventionalPath = join(REPO_PATH, 'roles', roleSlug, 'responsibilities.md')
    const content = await readFileSafe(conventionalPath)
    if (content) tier2Parts.push(`### responsibilities.md\n\n${content.trim()}`)
  }

  const tier2Knowledge = tier2Parts.join('\n\n---\n\n')

  // -------------------------------------------------------------------------
  // 6. Tier 3 — Project-specific knowledge (if task has a project)
  // -------------------------------------------------------------------------

  let tier3Knowledge = ''

  if (projectRecord !== null) {
    const tier3Parts: string[] = []
    const projectSlug = projectRecord.slug

    // project_brief.md
    const briefPath = join(REPO_PATH, 'projects', projectSlug, 'project_brief.md')
    const briefContent = await readFileSafe(briefPath)
    if (briefContent) {
      tier3Parts.push(`### project_brief.md\n\n${briefContent.trim()}`)
    }

    // knowledge/ directory
    const tier3KnowledgeDir = join(REPO_PATH, 'projects', projectSlug, 'knowledge')
    const tier3KnowledgeContent = await readMarkdownDir(tier3KnowledgeDir)
    if (tier3KnowledgeContent) tier3Parts.push(tier3KnowledgeContent)

    tier3Knowledge = tier3Parts.join('\n\n---\n\n')
  }

  // -------------------------------------------------------------------------
  // 7. Task context block
  // -------------------------------------------------------------------------

  let taskContext = ''

  if (taskRecord !== null && projectRecord !== null) {
    const lines: string[] = [
      `## Current Assignment`,
      ``,
      `**Project:** ${projectRecord.name}`,
      `**Task:** ${taskRecord.title}`,
      `**Status:** ${taskRecord.status}`,
      `**Priority:** ${taskRecord.priority}`,
    ]

    if (taskRecord.description) {
      lines.push(``, `**Description:**`, ``, taskRecord.description.trim())
    }

    if (taskRecord.output) {
      lines.push(``, `**Previous Output:**`, ``, taskRecord.output.trim())
    }

    lines.push(
      ``,
      `**Instruction:** Complete this task according to your role responsibilities and NBI standards.`,
    )

    taskContext = lines.join('\n')
  } else {
    taskContext =
      `## Status Check\n\n` +
      `No task is currently assigned to you. Review your responsibilities and check if there is any pending work you should be progressing.`
  }

  // -------------------------------------------------------------------------
  // 8. Token estimate
  // -------------------------------------------------------------------------

  const totalChars =
    systemPrompt.length +
    tier1Knowledge.length +
    tier2Knowledge.length +
    tier3Knowledge.length +
    taskContext.length

  const estimatedTokens = Math.round(totalChars / 4)

  return {
    systemPrompt,
    tier1Knowledge,
    tier2Knowledge,
    tier3Knowledge,
    taskContext,
    estimatedTokens,
  }
}
