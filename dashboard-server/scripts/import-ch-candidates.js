#!/usr/bin/env node
// Import Couch Heroes candidate tracker data into the ATS
// Source: "Couch Heroes Candidate Tracker.xlsx" Master Overview sheet
// Usage: node scripts/import-ch-candidates.js

require('dotenv').config();
const { Pool } = require('pg');
const ExcelJS = require('exceljs');
const path = require('path');

const XLSX_PATH = 'C:\\Users\\gpbea\\Downloads\\Couch Heroes Candidate Tracker.xlsx';

// Map spreadsheet stages to ATS stages
const STAGE_MAP = {
  'screening': 'sourcing',
  '1st interview': 'interviews',
  '2nd interview': 'interviews',
  '3rd interview': 'interviews',
  'offer': 'offer',
  'rejected': 'sourcing', // will be archived with rejection
};

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // 1. Find Couch Heroes client
  const { rows: clients } = await pool.query(
    "SELECT id, name FROM clients WHERE name ILIKE '%couch hero%'"
  );
  if (clients.length === 0) { console.error('Couch Heroes client not found'); process.exit(1); }
  const clientId = clients[0].id;
  console.log('Client:', clients[0].name, clientId);

  // 2. Get existing positions for matching
  const { rows: positions } = await pool.query(
    'SELECT id, title FROM hiring_positions WHERE client_id = $1',
    [clientId]
  );
  console.log('Existing positions:', positions.length);

  // 3. Get existing candidates to avoid duplicates
  const { rows: existingCandidates } = await pool.query(
    'SELECT id, name, role FROM candidates WHERE client_id = $1',
    [clientId]
  );
  const existingNames = new Set(existingCandidates.map(c => (c.name || '').toLowerCase().trim()));
  console.log('Existing candidates:', existingCandidates.length);

  // 4. Read spreadsheet
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);

  // Read Master Overview for candidates
  const ws = wb.getWorksheet('Master Overview');
  const candidates = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = row.getCell(1).value;
    if (!name || !String(name).trim()) continue;
    const loc = row.getCell(4).value;
    const notes = row.getCell(7).value;
    candidates.push({
      name: String(name).trim().replace(/\n/g, ''),
      role: String(row.getCell(2).value || '').trim(),
      stage: String(row.getCell(3).value || '').trim().toLowerCase(),
      location: typeof loc === 'object' && loc && loc.text ? loc.text : String(loc || '').trim(),
      interviewer: String(row.getCell(5).value || '').trim(),
      score: row.getCell(6).value,
      notes: typeof notes === 'object' && notes ? notes.text : String(notes || '').trim(),
      interviewDate: row.getCell(8).value,
      salaryExp: String(row.getCell(9).value || '').trim(),
    });
  }
  console.log('Candidates in spreadsheet:', candidates.length);

  // Read per-role sheets for detailed interview rounds
  const roleSheets = {};
  for (const wsName of wb.worksheets.map(s => s.name)) {
    if (['Master Overview', 'Hiring Plan', 'Salaries'].includes(wsName)) continue;
    const rws = wb.getWorksheet(wsName);
    if (!rws || rws.rowCount < 2) continue;
    const header = [];
    const hrow = rws.getRow(1);
    for (let c = 1; c <= rws.columnCount; c++) header.push(String(hrow.getCell(c).value || '').trim());

    const rows = [];
    for (let r = 2; r <= rws.rowCount; r++) {
      const row = rws.getRow(r);
      const applicant = row.getCell(1).value;
      if (!applicant || !String(applicant).trim()) continue;
      const entry = { name: String(applicant).trim().replace(/\n/g, '') };
      // Extract interview rounds from columns
      // Cols: Applicant, Stage, Location, Interviewer, Score, Notes, Interview Date, Salary Expectation,
      //       1st Round, Score 2, Notes 2, 2nd Round, Score 3, Notes 3, Final Round, Score 4, Final Notes
      entry.rounds = [];

      // Screening round (cols 4-7)
      const scrInterviewer = String(row.getCell(4).value || '').trim();
      const scrScore = row.getCell(5).value;
      const scrDate = row.getCell(7).value;
      if (scrInterviewer) {
        entry.rounds.push({
          title: 'Phone Screen',
          interviewer: scrInterviewer,
          score: typeof scrScore === 'number' ? scrScore : null,
          date: scrDate instanceof Date ? scrDate : (typeof scrDate === 'string' && scrDate.includes('/') ? parseDate(scrDate) : null),
        });
      }

      // 1st Round (cols 9-11)
      const r1Interviewer = String(row.getCell(9).value || '').trim();
      const r1Score = row.getCell(10).value;
      if (r1Interviewer) {
        entry.rounds.push({
          title: 'Technical',
          interviewer: r1Interviewer,
          score: typeof r1Score === 'number' ? r1Score : null,
          date: null,
        });
      }

      // 2nd Round (cols 12-14)
      const r2Interviewer = String(row.getCell(12).value || '').trim();
      const r2Score = row.getCell(13).value;
      if (r2Interviewer) {
        entry.rounds.push({
          title: 'Cultural',
          interviewer: r2Interviewer,
          score: typeof r2Score === 'number' && r2Score > 0 ? r2Score : null,
          date: null,
        });
      }

      // Final Round (cols 15-17)
      const r3Interviewer = String(row.getCell(15).value || '').trim();
      const r3Score = row.getCell(16).value;
      if (r3Interviewer) {
        entry.rounds.push({
          title: 'Final',
          interviewer: r3Interviewer,
          score: typeof r3Score === 'number' && r3Score > 0 ? r3Score : null,
          date: null,
        });
      }

      rows.push(entry);
    }
    roleSheets[wsName] = rows;
  }

  // 5. Match roles to positions (fuzzy)
  function findPosition(role) {
    const roleLower = role.toLowerCase();
    // Direct match
    let match = positions.find(p => p.title.toLowerCase() === roleLower);
    if (match) return match.id;
    // Partial match
    match = positions.find(p => p.title.toLowerCase().includes(roleLower) || roleLower.includes(p.title.toLowerCase()));
    if (match) return match.id;
    // Key word match
    const words = roleLower.split(/\s+/).filter(w => w.length > 3);
    match = positions.find(p => {
      const pt = p.title.toLowerCase();
      return words.filter(w => pt.includes(w)).length >= 2;
    });
    return match ? match.id : null;
  }

  // 6. Import candidates
  let created = 0, skipped = 0, roundsCreated = 0;

  for (const c of candidates) {
    if (existingNames.has(c.name.toLowerCase())) {
      console.log('  SKIP (exists):', c.name);
      skipped++;
      continue;
    }

    const atsStage = STAGE_MAP[c.stage] || 'sourcing';
    const positionId = findPosition(c.role);
    const isRejected = c.stage === 'rejected';

    const { rows: [created_row] } = await pool.query(
      `INSERT INTO candidates (name, role, client_id, position_id, stage, source, source_detail, notes, stage_changed_at, archived_at, rejection_category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10) RETURNING id`,
      [
        c.name,
        c.role,
        clientId,
        positionId,
        isRejected ? 'sourcing' : atsStage,
        'agency',
        c.interviewer ? 'Screened by ' + c.interviewer : null,
        [c.notes, c.salaryExp ? 'Salary: ' + c.salaryExp : '', c.location ? 'Location: ' + c.location : ''].filter(Boolean).join(' | '),
        isRejected ? new Date().toISOString() : null,
        isRejected ? 'other' : null,
      ]
    );
    const candidateId = created_row.id;
    existingNames.add(c.name.toLowerCase());
    created++;

    if (positionId) {
      console.log('  CREATE:', c.name, '→', c.role, '(pos:', positionId, ') stage:', atsStage, isRejected ? '[REJECTED]' : '');
    } else {
      console.log('  CREATE:', c.name, '→', c.role, '(no position match) stage:', atsStage, isRejected ? '[REJECTED]' : '');
    }

    // Import interview rounds from per-role sheets
    const sheetName = Object.keys(roleSheets).find(s => {
      const sLower = s.toLowerCase();
      const roleLower = c.role.toLowerCase();
      return sLower.includes(roleLower.split(' ').slice(-2).join(' ')) || roleLower.includes(sLower.replace(/ /g, ' '));
    });

    if (sheetName) {
      const detail = roleSheets[sheetName].find(r => r.name.toLowerCase() === c.name.toLowerCase());
      if (detail && detail.rounds.length > 0) {
        for (let i = 0; i < detail.rounds.length; i++) {
          const round = detail.rounds[i];
          if (!round.interviewer) continue;
          const { rows: [ir] } = await pool.query(
            `INSERT INTO interview_rounds (candidate_id, round_number, title, scheduled_at, duration_minutes, status, outcome)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [
              candidateId,
              i + 1,
              round.title,
              round.date || null,
              60,
              'completed',
              isRejected ? 'failed' : (c.stage === 'offer' ? 'passed' : 'pending'),
            ]
          );
          // Add scorecard with interviewer
          await pool.query(
            `INSERT INTO interview_scorecards (round_id, interviewer_name, overall_rating)
             VALUES ($1, $2, $3)`,
            [ir.id, round.interviewer, (round.score && round.score > 0) ? round.score : null]
          );
          roundsCreated++;
        }
      }
    }

    // Add salary expectation as a comment if present
    if (c.salaryExp) {
      await pool.query(
        `INSERT INTO candidate_comments (candidate_id, author, body, internal)
         VALUES ($1, 'System Migration', $2, true)`,
        [candidateId, 'Salary expectation: ' + c.salaryExp + (c.location ? ' | Location: ' + c.location : '')]
      );
    }
  }

  console.log('\n--- Summary ---');
  console.log('Created:', created);
  console.log('Skipped (already exist):', skipped);
  console.log('Interview rounds created:', roundsCreated);

  await pool.end();
}

function parseDate(str) {
  if (!str) return null;
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  return null;
}

main().catch(e => { console.error(e); process.exit(1); });
