/**
 * Database seed script for the NBIAI Team App.
 *
 * Populates the database with NBI's initial reference data:
 *   - Company record
 *   - 18 agent roles (in reporting order)
 *   - Active project portfolio
 *   - Tier 1 knowledge file registry
 *   - Initial revenue items
 *
 * Idempotent: safe to run multiple times. Uses ON CONFLICT DO NOTHING
 * throughout. Run with: npm run db:seed
 */

import 'dotenv/config'
import { db } from './index.js'
import * as schema from './schema.js'
import { eq, and } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

const COMPANY = {
  name: 'NBI Analytics Ltd',
  slug: 'nbi-analytics',
}

// ---------------------------------------------------------------------------
// Roles (must be in parent-before-child order for reportsToSlug resolution)
// ---------------------------------------------------------------------------

const ROLES: Array<{
  name: string
  slug: string
  modelTier: 'opus' | 'sonnet' | 'haiku'
  department: string
  reportsToSlug: string | null
  isLeadership?: boolean
}> = [
  { name: 'CEO',            slug: 'ceo',            modelTier: 'opus',   department: 'Leadership',  reportsToSlug: null,            isLeadership: true  },
  { name: 'COO',            slug: 'coo',            modelTier: 'opus',   department: 'Operations',  reportsToSlug: 'ceo',           isLeadership: true  },
  { name: 'CFO',            slug: 'cfo',            modelTier: 'opus',   department: 'Finance',     reportsToSlug: 'ceo',           isLeadership: true  },
  { name: 'CTO',            slug: 'cto',            modelTier: 'opus',   department: 'Technology',  reportsToSlug: 'ceo',           isLeadership: true  },
  { name: 'CMO',            slug: 'cmo',            modelTier: 'opus',   department: 'Marketing',   reportsToSlug: 'ceo',           isLeadership: true  },
  { name: 'VP Engineering', slug: 'vp_engineering', modelTier: 'opus',   department: 'Technology',  reportsToSlug: 'cto',           isLeadership: true  },
  { name: 'VP Product',     slug: 'vp_product',     modelTier: 'opus',   department: 'Product',     reportsToSlug: 'ceo',           isLeadership: true  },
  { name: 'Head of People', slug: 'head_of_people', modelTier: 'opus',   department: 'People',      reportsToSlug: 'coo',           isLeadership: false },
  { name: 'Senior Engineer',slug: 'senior_engineer',modelTier: 'sonnet', department: 'Technology',  reportsToSlug: 'vp_engineering', isLeadership: false },
  { name: 'Engineer',       slug: 'engineer',       modelTier: 'sonnet', department: 'Technology',  reportsToSlug: 'vp_engineering', isLeadership: false },
  { name: 'DevOps',         slug: 'devops',         modelTier: 'sonnet', department: 'Technology',  reportsToSlug: 'coo',           isLeadership: false },
  { name: 'QA Lead',        slug: 'qa_lead',        modelTier: 'sonnet', department: 'Quality',     reportsToSlug: 'vp_engineering', isLeadership: false },
  { name: 'QA Engineer',    slug: 'qa_engineer',    modelTier: 'sonnet', department: 'Quality',     reportsToSlug: 'qa_lead',       isLeadership: false },
  { name: 'UI/UX Lead',     slug: 'ui_ux_lead',     modelTier: 'sonnet', department: 'Design',      reportsToSlug: 'vp_product',    isLeadership: false },
  { name: 'UI/UX Designer', slug: 'ui_ux_designer', modelTier: 'sonnet', department: 'Design',      reportsToSlug: 'ui_ux_lead',    isLeadership: false },
  { name: 'Data Analyst',   slug: 'data_analyst',   modelTier: 'sonnet', department: 'Analytics',   reportsToSlug: 'coo',           isLeadership: false },
  { name: 'Producer',       slug: 'producer',       modelTier: 'sonnet', department: 'Operations',  reportsToSlug: 'coo',           isLeadership: false },
  { name: 'Tech Writer',    slug: 'tech_writer',    modelTier: 'sonnet', department: 'Product',     reportsToSlug: 'vp_product',    isLeadership: false },
]

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

// Note: project_status enum values are: planning | active | paused | completed | cancelled
// 'stalled' projects are mapped to 'paused' (no stalled value in schema).
const PROJECTS: Array<{
  name: string
  slug: string
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled'
  description: string
}> = [
  {
    name: 'NBIAI App',
    slug: 'nbiai-app',
    status: 'active',
    description: 'The NBIAI Team App — control plane for the AI agent company',
  },
  {
    name: 'Playsage',
    slug: 'playsage',
    status: 'paused',
    description: 'AI-powered games salary comparison tool',
  },
  {
    name: 'SalarySage',
    slug: 'salarysage',
    status: 'active',
    description: 'Salary benchmarking platform for the games industry',
  },
  {
    name: 'NBI Website',
    slug: 'nbi-website',
    status: 'paused',
    description: 'NBI Analytics corporate website redesign',
  },
  {
    name: 'NBI Operations',
    slug: 'nbi-operations',
    status: 'active',
    description: 'Ongoing business operations and client delivery',
  },
  {
    name: 'General',
    slug: 'general',
    status: 'active',
    description: 'Catch-all project for tasks created without a specific project context',
  },
]

// ---------------------------------------------------------------------------
// Tier 1 knowledge files (company-wide, loaded by all agents)
// ---------------------------------------------------------------------------

const KNOWLEDGE_FILES: Array<{
  name: string
  contentPath: string
  description: string
}> = [
  {
    name: 'Company Overview',
    contentPath: 'company/knowledge/company_overview.md',
    description: 'Who NBI is, what we do, our mission and positioning',
  },
  {
    name: 'Clients',
    contentPath: 'company/knowledge/clients.md',
    description: 'Current and past client relationships, context, and engagement status',
  },
  {
    name: 'Team Directory',
    contentPath: 'company/knowledge/team_directory.md',
    description: 'Human team members across NBI Gaming and NBI Analytics practices',
  },
  {
    name: 'Tools and Systems',
    contentPath: 'company/knowledge/tools_and_systems.md',
    description: 'Software stack, communication tools, and system access across NBI',
  },
  {
    name: 'Strategic Decisions',
    contentPath: 'company/knowledge/strategic_decisions.md',
    description: 'Locked strategic and technical decisions agents must not re-litigate',
  },
]

// ---------------------------------------------------------------------------
// Revenue items
// ---------------------------------------------------------------------------

const REVENUE_ITEMS: Array<{
  clientName: string
  description: string
  revenueType: 'monthly_retainer' | 'one_off' | 'milestone'
  amount: string
  currency: string
  startDate: string
  isActive: boolean
}> = [
  {
    clientName: 'NSI Gaming',
    description: 'Monthly analytics and intelligence retainer',
    revenueType: 'monthly_retainer',
    amount: '16650.00',
    currency: 'GBP',
    startDate: '2024-01-01',
    isActive: true,
  },
]

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  console.log('[seed] Starting database seed...')

  // -------------------------------------------------------------------------
  // 1. Company
  // -------------------------------------------------------------------------
  console.log('[seed] Seeding company...')

  const existingCompanies = await db
    .select({ id: schema.companies.id })
    .from(schema.companies)
    .where(eq(schema.companies.slug, COMPANY.slug))
    .limit(1)

  let companyId: string

  if (existingCompanies.length > 0) {
    companyId = existingCompanies[0].id
    console.log(`[seed]   Company already exists (id: ${companyId}) — skipping`)
  } else {
    const [inserted] = await db
      .insert(schema.companies)
      .values(COMPANY)
      .returning({ id: schema.companies.id })
    companyId = inserted.id
    console.log(`[seed]   Inserted company: ${COMPANY.name} (id: ${companyId})`)
  }

  // -------------------------------------------------------------------------
  // 2. Roles
  // -------------------------------------------------------------------------
  console.log('[seed] Seeding roles...')

  // Build a slug → id map as we insert, so children can resolve parent paths
  const roleIdBySlug: Record<string, string> = {}

  for (const role of ROLES) {
    const existing = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(
        and(
          eq(schema.roles.companyId, companyId),
          eq(schema.roles.slug, role.slug),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      roleIdBySlug[role.slug] = existing[0].id
      console.log(`[seed]   Role '${role.name}' already exists — skipping`)
      continue
    }

    const [inserted] = await db
      .insert(schema.roles)
      .values({
        companyId,
        name: role.name,
        slug: role.slug,
        department: role.department,
        defaultModelTier: role.modelTier,
        isLeadership: role.isLeadership ?? false,
        personaPath: `roles/${role.slug}/persona.md`,
        systemPromptPath: `roles/${role.slug}/prompts/system_prompt.md`,
        responsibilitiesPath: `roles/${role.slug}/responsibilities.md`,
      })
      .returning({ id: schema.roles.id })

    roleIdBySlug[role.slug] = inserted.id
    console.log(`[seed]   Inserted role: ${role.name}`)
  }

  // -------------------------------------------------------------------------
  // 3. Agents (one per role) and their reporting relationships
  //
  // We insert agents first without reporting relationships (agent_reports is
  // a separate table). Then insert agent_reports rows once all agents exist.
  // -------------------------------------------------------------------------
  console.log('[seed] Seeding agents...')

  const agentIdBySlug: Record<string, string> = {}

  for (const role of ROLES) {
    const roleId = roleIdBySlug[role.slug]
    if (!roleId) {
      console.warn(`[seed]   WARNING: No role id found for slug '${role.slug}' — skipping agent`)
      continue
    }

    // Check if a non-terminated agent already exists for this role
    const existing = await db
      .select({ id: schema.agents.id })
      .from(schema.agents)
      .where(
        and(
          eq(schema.agents.roleId, roleId),
          eq(schema.agents.companyId, companyId),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      agentIdBySlug[role.slug] = existing[0].id
      console.log(`[seed]   Agent '${role.name}' already exists — skipping`)
      continue
    }

    const [inserted] = await db
      .insert(schema.agents)
      .values({
        companyId,
        roleId,
        name: role.name,
        modelTier: role.modelTier,
        status: 'idle',
      })
      .returning({ id: schema.agents.id })

    agentIdBySlug[role.slug] = inserted.id
    console.log(`[seed]   Inserted agent: ${role.name}`)
  }

  // Insert reporting relationships
  console.log('[seed] Seeding agent reporting relationships...')
  for (const role of ROLES) {
    if (!role.reportsToSlug) continue // CEO has no manager

    const agentId = agentIdBySlug[role.slug]
    const managerAgentId = agentIdBySlug[role.reportsToSlug]

    if (!agentId || !managerAgentId) {
      console.warn(
        `[seed]   WARNING: Cannot create report for '${role.slug}' → '${role.reportsToSlug}' — agent(s) not found`,
      )
      continue
    }

    // Check if relationship already exists
    const existing = await db
      .select({ id: schema.agentReports.id })
      .from(schema.agentReports)
      .where(eq(schema.agentReports.agentId, agentId))
      .limit(1)

    if (existing.length > 0) {
      console.log(`[seed]   Report '${role.slug}' → '${role.reportsToSlug}' already exists — skipping`)
      continue
    }

    await db.insert(schema.agentReports).values({
      agentId,
      reportsToAgentId: managerAgentId,
    })
    console.log(`[seed]   Reporting: ${role.name} → ${role.reportsToSlug}`)
  }

  // -------------------------------------------------------------------------
  // 4. Projects
  // -------------------------------------------------------------------------
  console.log('[seed] Seeding projects...')

  const projectIdBySlug: Record<string, string> = {}

  for (const project of PROJECTS) {
    const existing = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.companyId, companyId),
          eq(schema.projects.slug, project.slug),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      projectIdBySlug[project.slug] = existing[0].id
      console.log(`[seed]   Project '${project.name}' already exists — skipping`)
      continue
    }

    const [inserted] = await db
      .insert(schema.projects)
      .values({
        companyId,
        name: project.name,
        slug: project.slug,
        description: project.description,
        status: project.status,
      })
      .returning({ id: schema.projects.id })

    projectIdBySlug[project.slug] = inserted.id
    console.log(`[seed]   Inserted project: ${project.name}`)
  }

  // -------------------------------------------------------------------------
  // 5. Knowledge files (Tier 1)
  // -------------------------------------------------------------------------
  console.log('[seed] Seeding Tier 1 knowledge files...')

  for (const kf of KNOWLEDGE_FILES) {
    const existing = await db
      .select({ id: schema.knowledgeFiles.id })
      .from(schema.knowledgeFiles)
      .where(
        and(
          eq(schema.knowledgeFiles.companyId, companyId),
          eq(schema.knowledgeFiles.contentPath, kf.contentPath),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      console.log(`[seed]   Knowledge file '${kf.name}' already exists — skipping`)
      continue
    }

    await db.insert(schema.knowledgeFiles).values({
      companyId,
      name: kf.name,
      tier: 'tier_1',
      contentPath: kf.contentPath,
      description: kf.description,
    })
    console.log(`[seed]   Inserted knowledge file: ${kf.name}`)
  }

  // -------------------------------------------------------------------------
  // 6. Revenue items
  // -------------------------------------------------------------------------
  console.log('[seed] Seeding revenue items...')

  for (const item of REVENUE_ITEMS) {
    const existing = await db
      .select({ id: schema.revenueItems.id })
      .from(schema.revenueItems)
      .where(
        and(
          eq(schema.revenueItems.companyId, companyId),
          eq(schema.revenueItems.clientName, item.clientName),
          eq(schema.revenueItems.revenueType, item.revenueType),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      console.log(`[seed]   Revenue item '${item.clientName}' already exists — skipping`)
      continue
    }

    await db.insert(schema.revenueItems).values({
      companyId,
      clientName: item.clientName,
      description: item.description,
      revenueType: item.revenueType,
      amount: item.amount,
      currency: item.currency,
      startDate: item.startDate,
      isActive: item.isActive,
    })
    console.log(`[seed]   Inserted revenue item: ${item.clientName}`)
  }

  console.log('[seed] Seed complete.')
}

seed().catch((err) => {
  console.error('[seed] Seed failed:', err)
  process.exit(1)
})
