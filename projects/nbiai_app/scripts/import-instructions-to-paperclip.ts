/**
 * Import NBI role definitions into Paperclip agent instructions.
 *
 * For each agent, reads from the NBIAI_TEAM/roles/{slug}/ directory and writes:
 * - SOUL.md (persona)
 * - AGENTS.md (responsibilities + delegation rules + knowledge)
 * - HEARTBEAT.md (kept as Paperclip default + NBI additions)
 *
 * Also copies Tier 1 company knowledge into each agent's instructions.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const REPO_PATH = 'D:/OneDrive/Claude_code/NBIAI_TEAM'
const PAPERCLIP_BASE = 'C:/Users/gpbea/.paperclip/instances/default/companies/359ab370-c36f-4558-a252-637255ad1a7b/agents'

// Agent name -> { id, roleSlug }
const AGENTS: Record<string, { id: string; slug: string }> = {
  'CEO': { id: 'f35ca020-cb28-4ec0-8f7b-37d236dcfd04', slug: 'ceo' },
  'COO': { id: '4626f3be-6300-4079-a918-6751758375be', slug: 'coo' },
  'CFO': { id: 'b3bd8f33-8027-4124-83c2-baa5158a3968', slug: 'cfo' },
  'CTO': { id: '930bd58f-38e7-4354-9401-9ab2a3188d1b', slug: 'cto' },
  'VP Engineering': { id: '24fdf047-e82c-49df-b182-64496912bf7f', slug: 'vp_engineering' },
  'VP Product': { id: '83634d5d-0f93-4298-b251-9d7f2dfc5277', slug: 'vp_product' },
  'CMO / Head of BD': { id: 'acfc9b17-a92b-472f-be62-ab2e9b18caf4', slug: 'cmo' },
  'Head of People': { id: 'a57c5a62-b762-467a-bfe2-ae401be1223c', slug: 'head_of_people' },
  'Producer': { id: 'a958d514-7123-4825-9961-65e9aeaa1aa0', slug: 'producer' },
  'Data Analyst': { id: '760dc04c-97a0-4245-971a-b8fc1dc215c5', slug: 'data_analyst' },
  'Senior Engineer': { id: '5d5fd790-28c4-498f-b9d1-c85fa19b361b', slug: 'senior_engineer' },
  'Engineer': { id: 'd1ee7177-b93e-4f7f-86ae-ced4ba8db5b6', slug: 'engineer' },
  'Data Engineer': { id: '5135b891-4409-491e-b7f3-87d072628125', slug: 'data_engineer' },
  'DevOps': { id: '0a21f694-16ea-4112-9d82-6e31915b64df', slug: 'devops' },
  'QA Lead': { id: '2bc20d9f-78fa-4e08-a066-3a338bb2767f', slug: 'qa_lead' },
  'QA Engineer': { id: 'cd03e646-7705-44c2-bbb1-af075a067993', slug: 'qa_engineer' },
  'UI/UX Lead': { id: 'cad57b4a-ab73-46fd-b6be-740c5a096713', slug: 'ui_ux_lead' },
  'UI/UX Designer': { id: '9a524d2d-9839-49ec-8268-182f6ea49e4a', slug: 'ui_ux_designer' },
  'Technical Writer': { id: 'bea52952-e29b-4f78-ab2d-6e190de85ed1', slug: 'tech_writer' },
  'Brand Manager': { id: '99804384-56b9-4e50-9555-18a390c492c2', slug: 'brand_manager' },
  'Content Marketer': { id: '4e82246e-985c-4533-b042-f3e76b9cf91b', slug: 'content_marketer' },
  'Demand Generation Manager': { id: 'a6943d0d-a08a-4367-a7df-4f7ecaad6fbc', slug: 'demand_gen_manager' },
  'Market Researcher': { id: '64f7ab61-1b40-4b56-97b8-b9ceb7ca3432', slug: 'market_researcher' },
  'General Counsel': { id: 'effaa7fd-0b22-40c4-935b-4f5e659a092d', slug: 'general_counsel' },
  'Employment Lawyer': { id: '6613dc60-a2ec-4d53-ac48-5c6161a02233', slug: 'employment_lawyer' },
  'IP and Trademark Lawyer': { id: 'ed313f0d-7230-4e28-8f49-38ab05dd1248', slug: 'ip_trademark_lawyer' },
  'Commercial and Data Protection Lawyer': { id: 'd86fc08a-364e-4595-ab1f-1defa13b5328', slug: 'commercial_dp_lawyer' },
  'Gaming Practice Lead': { id: 'b3edfbc3-2eb1-4228-a128-5ce3c5f149b1', slug: 'gaming_practice_lead' },
  'Game Economy and Monetisation Consultant': { id: '530ecb80-fcec-4465-8a46-ee179abd0917', slug: 'game_economy_consultant' },
  'Live Operations Consultant': { id: 'b580171a-80fc-434e-9253-e5857c0e86ad', slug: 'live_ops_consultant' },
  'Production Consultant': { id: '31d9cd75-68ed-4ee3-a5e5-0181f24bca6a', slug: 'production_consultant' },
  'Studio Operations and Org Design Consultant': { id: '17a09078-916f-43c7-bdc0-6019aeead6d4', slug: 'studio_ops_consultant' },
}

function readSafe(path: string): string {
  try { return readFileSync(path, 'utf8').trim() } catch { return '' }
}

function readAllMdInDir(dirPath: string): string {
  if (!existsSync(dirPath)) return ''
  const files = readdirSync(dirPath).filter(f => f.endsWith('.md')).sort()
  return files
    .map(f => {
      const content = readSafe(join(dirPath, f))
      return content ? `### ${f}\n\n${content}` : ''
    })
    .filter(Boolean)
    .join('\n\n---\n\n')
}

// Read Tier 1 company knowledge (shared by all agents)
const tier1Knowledge = readAllMdInDir(join(REPO_PATH, 'company', 'knowledge'))

// Read company policies (shared by all agents)
const companyPolicies = readAllMdInDir(join(REPO_PATH, 'company', 'policies'))

// Read org chart
const orgChart = readSafe(join(REPO_PATH, 'company', 'org_chart.md'))

// Read pipeline definitions (shared by relevant agents)
const pipelineFiles: string[] = []
const pipelineDirs = ['bd_pipeline', 'client_delivery', 'reporting', 'sdlc', 'sprint']
for (const dir of pipelineDirs) {
  const dirContent = readAllMdInDir(join(REPO_PATH, 'pipelines', dir))
  if (dirContent) pipelineFiles.push(dirContent)
}
const pipelines = pipelineFiles.join('\n\n---\n\n')

function processAgent(name: string, info: { id: string; slug: string }) {
  const roleDir = join(REPO_PATH, 'roles', info.slug)
  const instrDir = join(PAPERCLIP_BASE, info.id, 'instructions')

  if (!existsSync(roleDir)) {
    console.log(`  SKIP: ${name} - no role directory at ${roleDir}`)
    return
  }

  mkdirSync(instrDir, { recursive: true })

  // Read NBI role files
  const persona = readSafe(join(roleDir, 'persona.md'))
  const responsibilities = readSafe(join(roleDir, 'responsibilities.md'))
  const workflows = readSafe(join(roleDir, 'workflows.md'))
  const systemPrompt = readSafe(join(roleDir, 'prompts', 'system_prompt.md'))
  const tier2Knowledge = readAllMdInDir(join(roleDir, 'knowledge'))

  // --- SOUL.md (persona) ---
  const soulParts = [`# SOUL.md -- ${name} Persona (NBI)\n`]
  if (persona) {
    soulParts.push(persona)
  }
  soulParts.push(`\n## NBI Company Context\n`)
  soulParts.push(`You work for NBI Analytics Ltd / NBI Consulting, a full games lifecycle advisory firm.`)
  soulParts.push(`Owner and Managing Director: Glen Pryer. All external communications, financial decisions, and client-facing deliverables require Glen's approval.`)
  soulParts.push(`\n## Communication Style\n`)
  soulParts.push(`- British English only. No American spellings.`)
  soulParts.push(`- Never use em dashes.`)
  soulParts.push(`- Direct, no-fluff communication.`)
  soulParts.push(`- Deep and thorough over fast and shallow.`)
  soulParts.push(`- If uncertain about a fact, say so. Never fabricate.`)

  writeFileSync(join(instrDir, 'SOUL.md'), soulParts.join('\n'), 'utf8')

  // --- AGENTS.md (role instructions + knowledge + workflows + policies + pipelines) ---
  const agentParts = [`# ${name} -- NBI Agent Instructions\n`]

  if (systemPrompt) {
    agentParts.push(systemPrompt)
    agentParts.push('')
  }

  if (responsibilities) {
    agentParts.push(`---\n\n## Responsibilities\n\n${responsibilities}`)
  }

  // Workflows (how the role actually operates day-to-day)
  if (workflows) {
    agentParts.push(`---\n\n## Workflows\n\n${workflows}`)
  }

  // Tier 2 knowledge (role-specific)
  if (tier2Knowledge) {
    agentParts.push(`---\n\n## Role Knowledge (Tier 2)\n\n${tier2Knowledge}`)
  }

  // Tier 1 knowledge (company-wide)
  if (tier1Knowledge) {
    agentParts.push(`---\n\n## Company Knowledge (Tier 1)\n\n${tier1Knowledge}`)
  }

  // Org chart
  if (orgChart) {
    agentParts.push(`---\n\n## Organisation Chart\n\n${orgChart}`)
  }

  // Company policies
  if (companyPolicies) {
    agentParts.push(`---\n\n## Company Policies\n\n${companyPolicies}`)
  }

  // Pipelines and processes
  if (pipelines) {
    agentParts.push(`---\n\n## Pipelines and Processes\n\n${pipelines}`)
  }

  // Approval gates
  agentParts.push(`---\n\n## Approval Gates\n`)
  agentParts.push(`The following require Glen's explicit approval before proceeding:`)
  agentParts.push(`- External communications (emails, posts, messages to anyone outside NBI)`)
  agentParts.push(`- Client-facing deliverables`)
  agentParts.push(`- Financial decisions or commitments`)
  agentParts.push(`- Hiring real people`)
  agentParts.push(`- Strategic pivots`)
  agentParts.push(`- Spending money`)
  agentParts.push(`- Publishing anything publicly`)
  agentParts.push(`\nAuto-approved (no Glen sign-off needed):`)
  agentParts.push(`- Internal research, code writing, document drafting`)
  agentParts.push(`- Test execution, architecture proposals, status reports`)
  agentParts.push(`- Cross-agent task requests`)

  writeFileSync(join(instrDir, 'AGENTS.md'), agentParts.join('\n'), 'utf8')

  console.log(`  Written: ${name} (SOUL.md: ${persona ? 'custom' : 'default'}, AGENTS.md: ${systemPrompt ? 'full' : 'partial'})`)
}

// Main
console.log('Importing NBI role instructions into Paperclip...\n')

let count = 0
for (const [name, info] of Object.entries(AGENTS)) {
  processAgent(name, info)
  count++
}

console.log(`\nDone. Processed ${count} agents.`)
