require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const ADMIN_URL = process.env.ADMIN_DATABASE_URL;
const DB_URL = process.env.DATABASE_URL;
const DB_NAME = 'nbi_dashboard';
if (!ADMIN_URL || !DB_URL) { console.error('FATAL: Set ADMIN_DATABASE_URL and DATABASE_URL in .env'); process.exit(1); }

async function run() {
  // Create database if it doesn't exist
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  const exists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]);
  if (exists.rows.length === 0) {
    await admin.query(`CREATE DATABASE ${DB_NAME}`);
    console.log(`Created database: ${DB_NAME}`);
  } else {
    console.log(`Database ${DB_NAME} already exists`);
  }
  await admin.end();

  // Create tables
  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  await db.query(`
    -- Clients
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      founded TEXT DEFAULT '',
      headquarters TEXT DEFAULT '',
      employees TEXT DEFAULT '',
      revenue TEXT DEFAULT '',
      website TEXT DEFAULT '',
      linkedin_company TEXT DEFAULT '',
      nbi_relationship TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Contacts (belongs to client)
    CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      background TEXT DEFAULT '',
      linkedin TEXT DEFAULT '',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id);

    -- Tasks (self-referencing tree with 4-level hierarchy: project > feature > story > task)
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      item_type TEXT NOT NULL DEFAULT 'task',
      status TEXT NOT NULL DEFAULT 'Not started',
      priority TEXT DEFAULT '',
      health_state TEXT DEFAULT '',
      description TEXT DEFAULT '',
      assignees TEXT[] DEFAULT '{}',
      hours_estimated REAL DEFAULT 0,
      hours_spent REAL DEFAULT 0,
      due_date TEXT DEFAULT '',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      dependencies UUID[] DEFAULT '{}',
      planner_task_id TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_item_type ON tasks(item_type);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignees ON tasks USING GIN(assignees);

    -- Task notes
    CREATE TABLE IF NOT EXISTS task_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      author TEXT DEFAULT 'Glen',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_task_notes_task ON task_notes(task_id);

    -- Client notes (meeting notes, Granola imports, manual notes)
    CREATE TABLE IF NOT EXISTS client_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      source_id TEXT DEFAULT '',
      source_url TEXT DEFAULT '',
      meeting_date TIMESTAMPTZ,
      author TEXT DEFAULT 'Glen',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_client_notes_client ON client_notes(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_notes_date ON client_notes(meeting_date DESC);

    -- Settings (key-value, shared across all users)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Audit log (who changed what)
    CREATE TABLE IF NOT EXISTS audit_log (
      id BIGSERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id UUID,
      action TEXT NOT NULL,
      changed_by TEXT DEFAULT 'Glen',
      changes JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_time ON audit_log(created_at DESC);

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Sessions
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);

  // Insert default settings
  await db.query(`
    INSERT INTO settings (key, value) VALUES ('hourlyRate', '150')
    ON CONFLICT (key) DO NOTHING
  `);

  // Insert default clients
  const defaultClients = [
    'Couch Heroes', 'Lighthouse Studios', 'Sarge Universe',
    'Goals Studio', 'Playsage', 'NBI Operations'
  ];
  for (const name of defaultClients) {
    await db.query(`INSERT INTO clients (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name]);
  }

  // Seed default users
  const defaultPassword = await bcrypt.hash('nbi2026', 10);
  const defaultUsers = [
    { username: 'glen', display_name: 'Glen Pryer', email: 'glen@nbigaming.com', role: 'admin' },
    { username: 'magnus', display_name: 'Magnus Pryer', email: 'magnus@nbigaming.com', role: 'member' },
    { username: 'tom', display_name: 'Tom Rieger', email: 'tom@nbigaming.com', role: 'member' },
    { username: 'devin', display_name: 'Devin Rieger', email: 'devin@nbigaming.com', role: 'member' },
    { username: 'jeff', display_name: 'Jeff Day', email: 'jeff@nbigaming.com', role: 'member' },
    { username: 'amir', display_name: 'Amir Didar', email: 'amir@nbigaming.com', role: 'member' },
  ];
  for (const u of defaultUsers) {
    await db.query(
      `INSERT INTO users (username, display_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO NOTHING`,
      [u.username, u.display_name, u.email, defaultPassword, u.role]
    );
  }

  console.log('Schema created successfully');
  console.log('Default clients inserted');
  console.log('Default users seeded (password: nbi2026)');

  // Show table summary
  const tables = await db.query(`
    SELECT table_name, (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as col_count
    FROM information_schema.tables t WHERE table_schema = 'public' ORDER BY table_name
  `);
  tables.rows.forEach(r => console.log(`  ${r.table_name}: ${r.col_count} columns`));

  await db.end();
  console.log('\nDone. Connection string:');
  console.log(`  ${DB_URL}`);
}

run().catch(e => { console.error(e); process.exit(1); });
