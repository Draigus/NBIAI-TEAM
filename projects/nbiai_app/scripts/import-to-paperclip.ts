/**
 * Import all 33 NBI roles into Paperclip via its REST API.
 *
 * Paperclip role enum is limited to: ceo, cto, cmo, cfo, engineer, designer, pm, qa, devops, researcher, general
 * We map our roles to the closest match and use the title field for the actual role name.
 */

const COMPANY_ID = '359ab370-c36f-4558-a252-637255ad1a7b'
const API_BASE = 'http://localhost:3100/api'

// CEO already exists from onboarding - we'll update it
const EXISTING_CEO_ID = 'f35ca020-cb28-4ec0-8f7b-37d236dcfd04'

interface AgentDef {
  name: string
  role: string // Paperclip enum value
  title: string
  reportsToName: string | null // resolved to ID after creation
  modelTier: 'opus' | 'sonnet'
}

// All 33 roles mapped to Paperclip's role enum
const AGENTS: AgentDef[] = [
  // CEO already exists, skip
  { name: 'COO', role: 'general', title: 'Chief Operating Officer', reportsToName: 'CEO', modelTier: 'opus' },
  { name: 'CFO', role: 'cfo', title: 'Chief Financial Officer', reportsToName: 'CEO', modelTier: 'opus' },
  { name: 'CTO', role: 'cto', title: 'Chief Technology Officer', reportsToName: 'CEO', modelTier: 'opus' },
  { name: 'VP Engineering', role: 'engineer', title: 'VP Engineering', reportsToName: 'CTO', modelTier: 'opus' },
  { name: 'VP Product', role: 'pm', title: 'VP Product', reportsToName: 'CEO', modelTier: 'opus' },
  { name: 'CMO / Head of BD', role: 'cmo', title: 'CMO / Head of Business Development', reportsToName: 'CEO', modelTier: 'opus' },
  { name: 'Head of People', role: 'general', title: 'Head of People', reportsToName: 'CEO', modelTier: 'sonnet' },
  { name: 'Producer', role: 'pm', title: 'Producer', reportsToName: 'COO', modelTier: 'sonnet' },
  { name: 'Data Analyst', role: 'researcher', title: 'Data Analyst', reportsToName: 'COO', modelTier: 'sonnet' },
  { name: 'Senior Engineer', role: 'engineer', title: 'Senior Engineer', reportsToName: 'VP Engineering', modelTier: 'sonnet' },
  { name: 'Engineer', role: 'engineer', title: 'Engineer', reportsToName: 'VP Engineering', modelTier: 'sonnet' },
  { name: 'Data Engineer', role: 'engineer', title: 'Data Engineer', reportsToName: 'VP Engineering', modelTier: 'sonnet' },
  { name: 'DevOps', role: 'devops', title: 'DevOps Engineer', reportsToName: 'VP Engineering', modelTier: 'sonnet' },
  { name: 'QA Lead', role: 'qa', title: 'QA Lead', reportsToName: 'CTO', modelTier: 'sonnet' },
  { name: 'QA Engineer', role: 'qa', title: 'QA Engineer', reportsToName: 'QA Lead', modelTier: 'sonnet' },
  { name: 'UI/UX Lead', role: 'designer', title: 'UI/UX Lead', reportsToName: 'CTO', modelTier: 'sonnet' },
  { name: 'UI/UX Designer', role: 'designer', title: 'UI/UX Designer', reportsToName: 'UI/UX Lead', modelTier: 'sonnet' },
  { name: 'Technical Writer', role: 'general', title: 'Technical Writer', reportsToName: 'VP Product', modelTier: 'sonnet' },
  { name: 'Brand Manager', role: 'general', title: 'Brand Manager', reportsToName: 'CMO / Head of BD', modelTier: 'sonnet' },
  { name: 'Content Marketer', role: 'general', title: 'Content Marketer', reportsToName: 'CMO / Head of BD', modelTier: 'sonnet' },
  { name: 'Demand Generation Manager', role: 'general', title: 'Demand Generation Manager', reportsToName: 'CMO / Head of BD', modelTier: 'sonnet' },
  { name: 'Market Researcher', role: 'researcher', title: 'Market Researcher', reportsToName: 'CMO / Head of BD', modelTier: 'sonnet' },
  { name: 'General Counsel', role: 'general', title: 'General Counsel', reportsToName: 'CEO', modelTier: 'opus' },
  { name: 'Employment Lawyer', role: 'general', title: 'Employment Lawyer', reportsToName: 'General Counsel', modelTier: 'sonnet' },
  { name: 'IP and Trademark Lawyer', role: 'general', title: 'IP and Trademark Lawyer', reportsToName: 'General Counsel', modelTier: 'sonnet' },
  { name: 'Commercial and Data Protection Lawyer', role: 'general', title: 'Commercial and Data Protection Lawyer', reportsToName: 'General Counsel', modelTier: 'sonnet' },
  { name: 'Gaming Practice Lead', role: 'general', title: 'Gaming Practice Lead', reportsToName: 'CEO', modelTier: 'opus' },
  { name: 'Game Economy and Monetisation Consultant', role: 'general', title: 'Game Economy and Monetisation Consultant', reportsToName: 'Gaming Practice Lead', modelTier: 'sonnet' },
  { name: 'Live Operations Consultant', role: 'general', title: 'Live Operations Consultant', reportsToName: 'Gaming Practice Lead', modelTier: 'sonnet' },
  { name: 'Production Consultant', role: 'general', title: 'Production Consultant', reportsToName: 'Gaming Practice Lead', modelTier: 'sonnet' },
  { name: 'Studio Operations and Org Design Consultant', role: 'general', title: 'Studio Operations and Org Design Consultant', reportsToName: 'Gaming Practice Lead', modelTier: 'sonnet' },
]

// Name -> ID map
const nameToId = new Map<string, string>()
nameToId.set('CEO', EXISTING_CEO_ID)

async function createAgent(agent: AgentDef): Promise<string> {
  const reportsTo = agent.reportsToName ? nameToId.get(agent.reportsToName) ?? null : null

  const body = {
    name: agent.name,
    role: agent.role,
    title: agent.title,
    reportsTo,
    adapterType: 'claude_local',
    adapterConfig: {
      maxTurnsPerRun: 300,
      dangerouslySkipPermissions: true,
    },
    runtimeConfig: {
      heartbeat: {
        enabled: false, // disabled until we're ready
        cooldownSec: 10,
        intervalSec: 3600,
        wakeOnDemand: true,
        maxConcurrentRuns: 1,
      },
    },
  }

  const res = await fetch(`${API_BASE}/companies/${COMPANY_ID}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`  FAILED: ${agent.name} - ${err}`)
    throw new Error(`Failed to create ${agent.name}`)
  }

  const data = await res.json()
  console.log(`  Created: ${agent.name} (${agent.role}) -> ${data.id}`)
  return data.id
}

async function main() {
  console.log('Importing NBI agents into Paperclip...')
  console.log(`Company: ${COMPANY_ID}`)
  console.log(`Existing CEO: ${EXISTING_CEO_ID}`)
  console.log('')

  // Update CEO title
  await fetch(`${API_BASE}/companies/${COMPANY_ID}/agents/${EXISTING_CEO_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Chief Executive Officer' }),
  })
  console.log('  Updated: CEO title')

  // Create agents in order (parents before children)
  for (const agent of AGENTS) {
    // Check parent exists
    if (agent.reportsToName && !nameToId.has(agent.reportsToName)) {
      console.error(`  SKIP: ${agent.name} - parent "${agent.reportsToName}" not yet created`)
      continue
    }

    try {
      const id = await createAgent(agent)
      nameToId.set(agent.name, id)
    } catch {
      // Already logged
    }
  }

  console.log('')
  console.log(`Done. Created ${nameToId.size - 1} agents (+ 1 existing CEO).`)
  console.log('')
  console.log('Agent ID map:')
  for (const [name, id] of nameToId) {
    console.log(`  ${name}: ${id}`)
  }
}

main()
