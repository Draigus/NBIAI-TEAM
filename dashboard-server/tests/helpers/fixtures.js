// dashboard-server/tests/helpers/fixtures.js
//
// Factory functions for creating test data. Each factory inserts a
// row into the test DB and returns it. Sane defaults for unspecified
// fields. No shared global state — every test creates its own data.
//
// Add new factories here as feature plans need them. Keep field lists
// in sync with the server-side validation in server.js.

const bcrypt = require('bcrypt');
const { pool } = require('./db');

let _seq = 0;
function uniq(prefix) {
  _seq++;
  return `${prefix}_${Date.now()}_${_seq}`;
}

/**
 * Create a user. Returns { id, username, display_name, email, role, client_id, client_role, must_change_password, raw_password }.
 * raw_password is included so the test can use it for login flows.
 */
async function createTestUser(opts = {}) {
  const username = opts.username || uniq('testuser');
  const display_name = opts.display_name || `Test User ${_seq}`;
  const email = 'email' in opts ? opts.email : `${username}@example.invalid`;
  const role = opts.role || 'admin';
  const raw_password = opts.password || 'test_password_123';
  const password_hash = await bcrypt.hash(raw_password, 4);
  const client_id = opts.client_id || null;
  const client_role = opts.client_role || null;
  const must_change_password = opts.must_change_password || false;
  // docs_* permissions default to true (matching migration 035)
  const docs_view = 'docs_view' in opts ? opts.docs_view : true;
  const docs_edit = 'docs_edit' in opts ? opts.docs_edit : true;
  const docs_create = 'docs_create' in opts ? opts.docs_create : true;
  const docs_upload = 'docs_upload' in opts ? opts.docs_upload : true;

  const { rows } = await pool.query(
    `INSERT INTO users (username, display_name, email, role, password_hash, is_active, client_id, client_role, must_change_password, docs_view, docs_edit, docs_create, docs_upload)
     VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, username, display_name, email, role, client_id, client_role, must_change_password, docs_view, docs_edit, docs_create, docs_upload`,
    [username, display_name, email, role, password_hash, client_id, client_role, must_change_password, docs_view, docs_edit, docs_create, docs_upload]
  );
  return { ...rows[0], raw_password };
}

/**
 * Create a client.
 */
async function createTestClient(opts = {}) {
  const name = opts.name || uniq('TestClient');
  const { rows } = await pool.query(
    `INSERT INTO clients (name, description, sector)
     VALUES ($1, $2, $3) RETURNING *`,
    [name, opts.description || '', opts.sector || null]
  );
  return rows[0];
}

/**
 * Create a task. Requires no parent — creates a top-level project by default.
 */
async function createTestTask(opts = {}) {
  const title = opts.title || uniq('TestTask');
  const item_type = opts.item_type || 'project';
  const status = opts.status || 'Not started';
  const due_date = opts.due_date || '';
  const assignees = opts.assignees || [];
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, parent_id, client_id, item_type, status, priority, description, due_date, assignees)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      title,
      opts.parent_id || null,
      opts.client_id || null,
      item_type,
      status,
      opts.priority || '',
      opts.description || '',
      due_date,
      assignees
    ]
  );
  return rows[0];
}

/**
 * Create a bug report. Requires user_id (the reporter).
 */
async function createTestBugReport(opts) {
  if (!opts || !opts.user_id) throw new Error('createTestBugReport: user_id required');
  const title = opts.title || uniq('TestBug');
  const type = opts.type || 'bug';
  const status = opts.status || 'open';
  const { rows } = await pool.query(
    `INSERT INTO bug_reports (user_id, type, title, description, status, priority)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [opts.user_id, type, title, opts.description || '', status, opts.priority || null]
  );
  return rows[0];
}

/**
 * Create a candidate row. Stage defaults to 'sourcing' (matches schema default).
 */
async function createTestCandidate(opts = {}) {
  const name = opts.name || uniq('TestCandidate');
  const stage = opts.stage || 'sourcing';
  const { rows } = await pool.query(
    `INSERT INTO candidates (client_id, position_id, name, role, linkedin_url, due_date, stage, notes, email, source, source_detail, tags, consent_given, consent_date, retention_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
    [
      opts.client_id || null,
      opts.position_id || null,
      name,
      opts.role || null,
      opts.linkedin_url || null,
      opts.due_date || null,
      stage,
      opts.notes || null,
      opts.email || null,
      opts.source || null,
      opts.source_detail || null,
      opts.tags ? JSON.stringify(opts.tags) : '[]',
      opts.consent_given || false,
      opts.consent_date || null,
      opts.retention_expires_at || null,
    ]
  );
  return rows[0];
}

/**
 * Create a lead row. stage_id is required (FK to lead_pipeline_stages.id).
 */
async function createTestLead(opts = {}) {
  if (!opts.stage_id) throw new Error('createTestLead: stage_id required');
  const title = opts.title || uniq('TestLead');
  const { rows } = await pool.query(
    `INSERT INTO leads (client_id, title, work_type, service_line, stage_id, priority, currency, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      opts.client_id || null,
      title,
      opts.work_type || null,
      opts.service_line || null,
      opts.stage_id,
      opts.priority || null,
      opts.currency || 'GBP',
      opts.created_by || 'test',
    ]
  );
  return rows[0];
}

/**
 * Create a lead_pipeline_stages row. Note: lead_pipeline_stages is NOT in
 * the truncate list (system-of-record). Tests that create a stage should
 * delete it themselves at the end of the test (use try/finally).
 */
async function createTestLeadStage(opts = {}) {
  const name = opts.name || uniq('TestStage');
  const sort_order = opts.sort_order || 0;
  const colour = opts.colour || '#666666';
  const { rows } = await pool.query(
    `INSERT INTO lead_pipeline_stages (name, sort_order, colour, is_closed, is_won)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, sort_order, colour, !!opts.is_closed, !!opts.is_won]
  );
  return rows[0];
}

async function createTestTeam(opts = {}) {
  const name = opts.name || uniq('TestTeam');
  const { rows } = await pool.query(
    `INSERT INTO teams (name, description, client_id, colour)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, opts.description || '', opts.client_id || null, opts.colour || '#3b82f6']
  );
  return rows[0];
}

async function createTestTeamMember(opts) {
  const { rows } = await pool.query(
    `INSERT INTO team_members (team_id, user_id, role)
     VALUES ($1, $2, $3) RETURNING *`,
    [opts.team_id, opts.user_id, opts.role || 'member']
  );
  return rows[0];
}

async function createTestAuditEntry(opts) {
  if (opts.created_at) {
    const { rows } = await pool.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, changed_by, changes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        opts.entity_type || 'task',
        opts.entity_id,
        opts.action || 'update',
        opts.changed_by || 'test',
        opts.changes ? JSON.stringify(opts.changes) : null,
        opts.created_at
      ]
    );
    return rows[0];
  }
  const { rows } = await pool.query(
    `INSERT INTO audit_log (entity_type, entity_id, action, changed_by, changes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      opts.entity_type || 'task',
      opts.entity_id,
      opts.action || 'update',
      opts.changed_by || 'test',
      opts.changes ? JSON.stringify(opts.changes) : null
    ]
  );
  return rows[0];
}

/**
 * Create a contact. Optionally linked to a client.
 */
async function createTestContact(opts = {}) {
  const name = opts.name || uniq('TestContact');
  const { rows } = await pool.query(
    `INSERT INTO contacts (client_id, name, email, phone, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [opts.client_id || null, name, opts.email || `${name}@example.invalid`, opts.phone || null, opts.role || null]
  );
  return rows[0];
}

/**
 * Create an expense. Requires user_id (the submitter).
 */
async function createTestExpense(opts = {}) {
  const description = opts.description || uniq('TestExpense');
  const { rows } = await pool.query(
    `INSERT INTO expenses (user_id, description, amount, currency, category, date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [opts.user_id, description, opts.amount || 100, opts.currency || 'GBP', opts.category || 'Travel', opts.date || '2026-01-15']
  );
  return rows[0];
}

/**
 * Create a statement of work. Optionally linked to a client.
 */
async function createTestSow(opts = {}) {
  const title = opts.title || uniq('TestSoW');
  const { rows } = await pool.query(
    `INSERT INTO sows (client_id, title, status)
     VALUES ($1, $2, $3) RETURNING *`,
    [opts.client_id || null, title, opts.status || 'draft']
  );
  return rows[0];
}

/**
 * Create a client note. Requires client_id.
 */
async function createTestClientNote(opts = {}) {
  if (!opts.client_id) throw new Error('createTestClientNote: client_id required');
  const { rows } = await pool.query(
    `INSERT INTO client_notes (client_id, title, content, author)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [opts.client_id, opts.title || 'Test Note', opts.content || 'Test note content', opts.author || 'test']
  );
  return rows[0];
}

/**
 * Create a milestone. Requires client_id.
 */
async function createTestMilestone(opts = {}) {
  if (!opts.client_id) throw new Error('createTestMilestone: client_id required');
  const title = opts.title || uniq('TestMilestone');
  const { rows } = await pool.query(
    `INSERT INTO milestones (client_id, title, description, target_date)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [opts.client_id, title, opts.description || '', opts.target_date || '2026-12-31']
  );
  return rows[0];
}

/**
 * Create a hiring position row.
 */
async function createTestHiringPosition(opts = {}) {
  const title = opts.title || uniq('TestPosition');
  const { rows } = await pool.query(
    `INSERT INTO hiring_positions (client_id, sow_id, title, description, seniority, status, salary_range, employment_type, location, interview_panel)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      opts.client_id || null,
      opts.sow_id || null,
      title,
      opts.description || null,
      opts.seniority || null,
      opts.status || 'open',
      opts.salary_range || null,
      opts.employment_type || 'permanent',
      opts.location || null,
      opts.interview_panel ? JSON.stringify(opts.interview_panel) : '[]',
    ]
  );
  return rows[0];
}

async function createTestInterviewRound(opts = {}) {
  if (!opts.candidate_id) throw new Error('createTestInterviewRound: candidate_id required');
  const { rows } = await pool.query(
    `INSERT INTO interview_rounds (candidate_id, round_number, title, scheduled_at, duration_minutes, location, status, outcome, outcome_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      opts.candidate_id,
      opts.round_number || 1,
      opts.title || 'Phone Screen',
      opts.scheduled_at || null,
      opts.duration_minutes || null,
      opts.location || null,
      opts.status || 'scheduled',
      opts.outcome || null,
      opts.outcome_notes || null,
    ]
  );
  return rows[0];
}

async function createTestScorecard(opts = {}) {
  if (!opts.round_id) throw new Error('createTestScorecard: round_id required');
  if (!opts.interviewer_user_id) throw new Error('createTestScorecard: interviewer_user_id required');
  const { rows } = await pool.query(
    `INSERT INTO interview_scorecards (round_id, interviewer_name, interviewer_user_id, overall_rating, recommendation, strengths, concerns, criteria, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      opts.round_id,
      opts.interviewer_name || 'Test Interviewer',
      opts.interviewer_user_id,
      opts.overall_rating || null,
      opts.recommendation || null,
      opts.strengths || null,
      opts.concerns || null,
      opts.criteria ? JSON.stringify(opts.criteria) : '[]',
      opts.submitted_at || null,
    ]
  );
  return rows[0];
}

/**
 * Create an interview_question_bank row.
 */
async function createTestInterviewQuestion(opts = {}) {
  const { rows } = await pool.query(
    `INSERT INTO interview_question_bank (client_id, discipline, category, question_text, depth_type, source, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      opts.client_id || null,
      opts.discipline || 'Engineering',
      opts.category || 'technical',
      opts.question_text || uniq('Test interview question'),
      opts.depth_type || null,
      opts.source || 'custom',
      opts.created_by || null,
    ]
  );
  return rows[0];
}

/**
 * Create an interview_configs row with optional questions and sessions.
 * Returns { config, questions: [...], sessions: [...] }.
 */
async function createTestInterviewConfig(opts = {}) {
  if (!opts.candidate_id) throw new Error('createTestInterviewConfig: candidate_id required');

  const { rows: configRows } = await pool.query(
    `INSERT INTO interview_configs (candidate_id, position_id, created_by, status)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [opts.candidate_id, opts.position_id || null, opts.created_by || null, opts.status || 'draft']
  );
  const config = configRows[0];

  const questions = [];
  if (opts.question_ids && opts.question_ids.length > 0) {
    for (let i = 0; i < opts.question_ids.length; i++) {
      const { rows } = await pool.query(
        `INSERT INTO interview_config_questions (config_id, question_id, sort_order)
         VALUES ($1, $2, $3) RETURNING *`,
        [config.id, opts.question_ids[i], i]
      );
      questions.push(rows[0]);
    }
  }

  const sessions = [];
  if (opts.interviewer_ids && opts.interviewer_ids.length > 0) {
    for (const iid of opts.interviewer_ids) {
      const { rows } = await pool.query(
        `INSERT INTO interview_sessions (config_id, interviewer_id, status)
         VALUES ($1, $2, $3) RETURNING *`,
        [config.id, iid, 'assigned']
      );
      sessions.push(rows[0]);
    }
  }

  return { config, questions, sessions };
}

module.exports = {
  uniq,
  createTestUser,
  createTestClient,
  createTestTask,
  createTestBugReport,
  createTestCandidate,
  createTestLead,
  createTestLeadStage,
  createTestTeam,
  createTestTeamMember,
  createTestAuditEntry,
  createTestContact,
  createTestExpense,
  createTestSow,
  createTestClientNote,
  createTestMilestone,
  createTestHiringPosition,
  createTestInterviewRound,
  createTestScorecard,
  createTestEmailTemplate,
  createTestOnboardingItem,
  createTestInterviewQuestion,
  createTestInterviewConfig,
};

async function createTestEmailTemplate(opts = {}) {
  const { rows } = await pool.query(
    `INSERT INTO hiring_email_templates (client_id, name, subject, body, trigger_stage)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      opts.client_id || null,
      opts.name || 'Test Template',
      opts.subject || 'Test Subject',
      opts.body || 'Hello {{candidate_name}}',
      opts.trigger_stage || null,
    ]
  );
  return rows[0];
}

async function createTestOnboardingItem(opts = {}) {
  if (!opts.candidate_id) throw new Error('createTestOnboardingItem: candidate_id required');
  const { rows } = await pool.query(
    `INSERT INTO onboarding_checklist_items (candidate_id, title, completed, completed_at, completed_by, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      opts.candidate_id,
      opts.title || 'Test item',
      opts.completed || false,
      opts.completed_at || null,
      opts.completed_by || null,
      opts.sort_order || 0,
    ]
  );
  return rows[0];
}
