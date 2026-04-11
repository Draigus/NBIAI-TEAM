require('dotenv').config();
const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL;

async function run() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  console.log('Running leads tracker migration...\n');

  // ==================== NEW TABLES ====================

  await db.query(`
    -- Lead Pipeline Stages (configurable)
    CREATE TABLE IF NOT EXISTS lead_pipeline_stages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      sort_order INT NOT NULL DEFAULT 0,
      colour TEXT DEFAULT '#666666',
      is_closed BOOLEAN DEFAULT FALSE,
      is_won BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Lead Resource Types (staffing roles)
    CREATE TABLE IF NOT EXISTS lead_resource_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Lead Field Options (all picklists)
    CREATE TABLE IF NOT EXISTS lead_field_options (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      field_name TEXT NOT NULL,
      value TEXT NOT NULL,
      sort_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(field_name, value)
    );

    -- Leads (main table)
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      work_type TEXT,
      service_line TEXT,
      stage_id UUID NOT NULL REFERENCES lead_pipeline_stages(id),
      priority INT,
      currency TEXT NOT NULL DEFAULT 'GBP',
      rom_min NUMERIC,
      rom_max NUMERIC,
      rom_text TEXT,
      win_probability INT,
      primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
      deal_owner TEXT,
      lead_source TEXT,
      est_start_date DATE,
      expected_close_date DATE,
      last_contacted DATE,
      next_followup_date DATE,
      next_action TEXT,
      location TEXT,
      notes TEXT,
      time_estimate TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id);
    CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage_id);
    CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(deal_owner);
    CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
    CREATE INDEX IF NOT EXISTS idx_leads_followup ON leads(next_followup_date);

    -- Lead Resources (staffing requirements per lead)
    CREATE TABLE IF NOT EXISTS lead_resources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      resource_type_id UUID NOT NULL REFERENCES lead_resource_types(id),
      quantity INT DEFAULT 1,
      notes TEXT,
      UNIQUE(lead_id, resource_type_id)
    );

    -- Lead Activities (interaction history)
    CREATE TABLE IF NOT EXISTS lead_activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL,
      description TEXT,
      performed_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
    CREATE INDEX IF NOT EXISTS idx_lead_activities_date ON lead_activities(created_at DESC);
  `);
  console.log('Tables created');

  // Add sector column to clients (idempotent)
  await db.query(`
    DO $$ BEGIN
      ALTER TABLE clients ADD COLUMN sector TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);
  console.log('Added sector column to clients');

  // Add weighted_value generated column to leads (idempotent)
  // Note: generated columns can't be added with IF NOT EXISTS, so we check first
  const hasWeightedValue = await db.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'weighted_value'
  `);
  if (hasWeightedValue.rows.length === 0) {
    await db.query(`
      ALTER TABLE leads ADD COLUMN weighted_value NUMERIC
        GENERATED ALWAYS AS (COALESCE(rom_max, rom_min, 0) * COALESCE(win_probability, 0) / 100) STORED
    `);
    console.log('Added weighted_value generated column');
  }

  // ==================== SEED DATA ====================

  // Pipeline stages
  const stages = [
    { name: 'Lead', sort_order: 1, colour: '#6b7280', is_closed: false, is_won: false },
    { name: 'First Contact', sort_order: 2, colour: '#3b82f6', is_closed: false, is_won: false },
    { name: 'Discovery', sort_order: 3, colour: '#8b5cf6', is_closed: false, is_won: false },
    { name: 'Proposal', sort_order: 4, colour: '#f59e0b', is_closed: false, is_won: false },
    { name: 'Negotiation', sort_order: 5, colour: '#f97316', is_closed: false, is_won: false },
    { name: 'Won', sort_order: 6, colour: '#22c55e', is_closed: true, is_won: true },
    { name: 'Holding', sort_order: 7, colour: '#94a3b8', is_closed: true, is_won: false },
    { name: 'Lost', sort_order: 8, colour: '#ef4444', is_closed: true, is_won: false },
  ];
  for (const s of stages) {
    await db.query(
      `INSERT INTO lead_pipeline_stages (name, sort_order, colour, is_closed, is_won)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO NOTHING`,
      [s.name, s.sort_order, s.colour, s.is_closed, s.is_won]
    );
  }
  console.log('Pipeline stages seeded');

  // Resource types
  const resourceTypes = [
    'UXR Lead', 'Researcher', 'Data Analyst', 'Snr Data Analyst', 'Analytics Manager',
    'Data Scientist', 'Data Engineer', 'Snr Data Engineer', 'Data Architect',
    'Financial Analyst', 'Process Analyst', 'Economist', 'Producer',
    'AI Implementor', 'Telemetry Eng', 'GTM Specialist', 'Application Engineer',
    'Designer', 'Process Engineering', 'SME'
  ];
  for (let i = 0; i < resourceTypes.length; i++) {
    await db.query(
      `INSERT INTO lead_resource_types (name, sort_order) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
      [resourceTypes[i], i + 1]
    );
  }
  console.log('Resource types seeded');

  // Field options
  const fieldOptions = [
    // Service lines
    { field: 'service_line', values: ['Data & Analytics', 'UXR', 'AI', 'Production Consulting', 'Process Engineering'] },
    // Lead sources
    { field: 'lead_source', values: ['Referral', 'Conference', 'Inbound', 'Existing Client', 'LinkedIn', 'Cold Outreach'] },
    // Work types
    { field: 'work_type', values: ['Playtesting', 'Data Library Blueprint', 'Analytics Audit', 'Player Research', 'Economy Design', 'LiveOps Review', 'AI Implementation', 'Process Consulting'] },
    // Client sectors
    { field: 'client_sector', values: ['Gaming', 'Human Capital'] },
    // Currencies
    { field: 'currency', values: ['GBP', 'USD', 'EUR'] },
    // Deal owners
    { field: 'deal_owner', values: ['Glen', 'Tom'] },
  ];
  for (const group of fieldOptions) {
    for (let i = 0; i < group.values.length; i++) {
      await db.query(
        `INSERT INTO lead_field_options (field_name, value, sort_order)
         VALUES ($1, $2, $3) ON CONFLICT (field_name, value) DO NOTHING`,
        [group.field, group.values[i], i + 1]
      );
    }
  }
  console.log('Field options seeded');

  // Set default FX rates
  await db.query(`
    INSERT INTO settings (key, value) VALUES ('fx_rates', $1)
    ON CONFLICT (key) DO NOTHING
  `, [JSON.stringify({ USD: 0.79, EUR: 0.86 })]);
  console.log('Default FX rates set');

  // Make Tom an admin (Glen's requirement)
  await db.query(`UPDATE users SET role = 'admin' WHERE username = 'tom'`);
  console.log('Tom updated to admin');

  // Summary
  const counts = {};
  for (const table of ['lead_pipeline_stages', 'lead_resource_types', 'lead_field_options', 'leads', 'lead_resources', 'lead_activities']) {
    const r = await db.query(`SELECT count(*) FROM ${table}`);
    counts[table] = r.rows[0].count;
  }
  console.log('\nTable row counts:');
  Object.entries(counts).forEach(([t, c]) => console.log(`  ${t}: ${c}`));

  await db.end();
  console.log('\nMigration complete.');
}

run().catch(e => { console.error(e); process.exit(1); });
