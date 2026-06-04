#!/usr/bin/env node
// Verify CH candidate import: compare DB state against spreadsheet source
require('dotenv').config();
const { Pool } = require('pg');
const ExcelJS = require('exceljs');

const XLSX_PATH = 'C:\\Users\\gpbea\\Downloads\\Couch Heroes Candidate Tracker.xlsx';
const STAGE_MAP = {
  'screening': 'sourcing',
  '1st interview': 'interviews',
  '2nd interview': 'interviews',
  '3rd interview': 'interviews',
  'offer': 'offer',
  'rejected': 'sourcing',
};

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const ws = wb.getWorksheet('Master Overview');

  // Load all CH candidates from DB
  const { rows: dbCandidates } = await pool.query(`
    SELECT c.id, c.name, c.role, c.stage, c.source, c.source_detail, c.notes,
           c.archived_at IS NOT NULL as is_archived, c.rejection_category,
           c.position_id, hp.title as position_title,
           (SELECT COUNT(*) FROM interview_rounds ir WHERE ir.candidate_id = c.id) as round_count,
           (SELECT json_agg(json_build_object(
             'title', ir.title, 'status', ir.status, 'outcome', ir.outcome, 'round_number', ir.round_number,
             'scorecards', (SELECT json_agg(json_build_object('interviewer', isc.interviewer_name, 'rating', isc.overall_rating))
                           FROM interview_scorecards isc WHERE isc.round_id = ir.id)
           ) ORDER BY ir.round_number) FROM interview_rounds ir WHERE ir.candidate_id = c.id) as rounds,
           (SELECT json_agg(json_build_object('body', cc.body, 'internal', cc.internal))
            FROM candidate_comments cc WHERE cc.candidate_id = c.id) as comments
    FROM candidates c
    LEFT JOIN hiring_positions hp ON hp.id = c.position_id
    WHERE c.client_id = (SELECT id FROM clients WHERE name ILIKE '%couch hero%' LIMIT 1)
    ORDER BY c.name
  `);

  // Build spreadsheet lookup
  const xlCandidates = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = row.getCell(1).value;
    if (!name || !String(name).trim()) continue;
    const loc = row.getCell(4).value;
    const notes = row.getCell(7).value;
    xlCandidates.push({
      name: String(name).trim().replace(/\n/g, ''),
      role: String(row.getCell(2).value || '').trim(),
      stage: String(row.getCell(3).value || '').trim().toLowerCase(),
      location: typeof loc === 'object' && loc && loc.text ? loc.text : String(loc || '').trim(),
      interviewer: String(row.getCell(5).value || '').trim(),
      score: row.getCell(6).value,
      interviewDate: row.getCell(8).value,
      salary: String(row.getCell(9).value || '').trim(),
      notes: typeof notes === 'object' && notes ? notes.text : String(notes || '').trim(),
    });
  }

  // Also load per-role sheets for interview round verification
  const roleSheetData = {};
  for (const wsObj of wb.worksheets) {
    if (['Master Overview', 'Hiring Plan', 'Salaries'].includes(wsObj.name)) continue;
    const rows = [];
    for (let r = 2; r <= wsObj.rowCount; r++) {
      const row = wsObj.getRow(r);
      const applicant = row.getCell(1).value;
      if (!applicant || !String(applicant).trim()) continue;
      const entry = { name: String(applicant).trim().replace(/\n/g, '') };
      entry.screenInterviewer = String(row.getCell(4).value || '').trim();
      entry.screenScore = row.getCell(5).value;
      entry.r1Interviewer = String(row.getCell(9).value || '').trim();
      entry.r1Score = row.getCell(10).value;
      entry.r2Interviewer = String(row.getCell(12).value || '').trim();
      entry.r2Score = row.getCell(13).value;
      entry.r3Interviewer = String(row.getCell(15).value || '').trim();
      entry.r3Score = row.getCell(16).value;
      rows.push(entry);
    }
    roleSheetData[wsObj.name] = rows;
  }

  let issues = [];
  let checked = 0;

  console.log('=== FIELD-BY-FIELD VERIFICATION ===\n');

  for (const xl of xlCandidates) {
    const db = dbCandidates.find(d => d.name.toLowerCase() === xl.name.toLowerCase());
    if (!db) { issues.push(`MISSING IN DB: ${xl.name}`); continue; }
    checked++;

    const expectedStage = STAGE_MAP[xl.stage] || 'sourcing';
    const isRejected = xl.stage === 'rejected';

    // 1. Role
    if (db.role !== xl.role) issues.push(`${xl.name}: ROLE mismatch — DB="${db.role}" XL="${xl.role}"`);

    // 2. Stage
    if (isRejected) {
      if (!db.is_archived) issues.push(`${xl.name}: should be ARCHIVED (rejected) but isn't`);
      if (db.rejection_category !== 'other') issues.push(`${xl.name}: rejection_category should be "other", got "${db.rejection_category}"`);
    } else {
      if (db.stage !== expectedStage) issues.push(`${xl.name}: STAGE mismatch — DB="${db.stage}" expected="${expectedStage}" (XL="${xl.stage}")`);
      if (db.is_archived) issues.push(`${xl.name}: should NOT be archived but is`);
    }

    // 3. Position linked
    if (!db.position_id) issues.push(`${xl.name}: NO POSITION linked (role="${xl.role}")`);

    // 4. Salary in notes or comments
    if (xl.salary) {
      const hasSalaryInNotes = db.notes && db.notes.includes(xl.salary);
      const hasSalaryInComments = db.comments && db.comments.some(c => c.body && c.body.includes(xl.salary));
      if (!hasSalaryInNotes && !hasSalaryInComments) {
        issues.push(`${xl.name}: SALARY "${xl.salary}" not found in notes or comments`);
      }
    }

    // 5. Location in notes
    if (xl.location) {
      const hasLocation = db.notes && db.notes.includes(xl.location);
      const hasLocationInComments = db.comments && db.comments.some(c => c.body && c.body.includes(xl.location));
      if (!hasLocation && !hasLocationInComments) {
        issues.push(`${xl.name}: LOCATION "${xl.location}" not found in notes or comments`);
      }
    }

    // 6. Interview rounds from per-role sheet
    const sheetName = Object.keys(roleSheetData).find(s => {
      const sWords = s.toLowerCase().split(/\s+/);
      const roleWords = xl.role.toLowerCase().split(/\s+/);
      return sWords.filter(w => roleWords.includes(w)).length >= 2;
    });
    if (sheetName) {
      const detail = roleSheetData[sheetName].find(r => r.name.toLowerCase() === xl.name.toLowerCase());
      if (detail) {
        // Count expected rounds (non-empty interviewers)
        let expectedRounds = 0;
        if (detail.screenInterviewer) expectedRounds++;
        if (detail.r1Interviewer) expectedRounds++;
        if (detail.r2Interviewer) expectedRounds++;
        if (detail.r3Interviewer) expectedRounds++;

        if (parseInt(db.round_count) !== expectedRounds) {
          issues.push(`${xl.name}: ROUND COUNT mismatch — DB=${db.round_count} expected=${expectedRounds} (screen="${detail.screenInterviewer}", r1="${detail.r1Interviewer}", r2="${detail.r2Interviewer}", r3="${detail.r3Interviewer}")`);
        }

        // Verify interviewer names and scores in rounds
        if (db.rounds) {
          const dbRounds = db.rounds;
          // Round 1 should be Phone Screen with screen interviewer
          if (detail.screenInterviewer && dbRounds[0]) {
            const sc = dbRounds[0].scorecards;
            if (sc && sc[0]) {
              if (sc[0].interviewer !== detail.screenInterviewer) {
                issues.push(`${xl.name}: Round 1 INTERVIEWER mismatch — DB="${sc[0].interviewer}" XL="${detail.screenInterviewer}"`);
              }
              const expectedScore = (detail.screenScore && detail.screenScore > 0) ? detail.screenScore : null;
              if (sc[0].rating !== expectedScore) {
                issues.push(`${xl.name}: Round 1 SCORE mismatch — DB=${sc[0].rating} XL=${expectedScore}`);
              }
            }
          }
          // Round 2 should be Technical with r1 interviewer
          if (detail.r1Interviewer && dbRounds[1]) {
            const sc = dbRounds[1].scorecards;
            if (sc && sc[0]) {
              if (sc[0].interviewer !== detail.r1Interviewer) {
                issues.push(`${xl.name}: Round 2 INTERVIEWER mismatch — DB="${sc[0].interviewer}" XL="${detail.r1Interviewer}"`);
              }
            }
          }
        }
      }
    }
  }

  // Check for DB candidates not in spreadsheet (except Lili Zhao who was pre-existing)
  for (const db of dbCandidates) {
    if (db.name === 'Lili Zhao') continue;
    const xl = xlCandidates.find(x => x.name.toLowerCase() === db.name.toLowerCase());
    if (!xl) issues.push(`EXTRA IN DB (not in spreadsheet): ${db.name}`);
  }

  console.log(`Checked ${checked} of ${xlCandidates.length} spreadsheet candidates against ${dbCandidates.length} DB records\n`);

  if (issues.length === 0) {
    console.log('✅ ALL FIELDS VERIFIED — no mismatches found');
  } else {
    console.log(`❌ ${issues.length} ISSUES FOUND:\n`);
    issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
