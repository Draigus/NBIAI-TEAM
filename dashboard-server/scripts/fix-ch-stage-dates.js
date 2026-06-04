#!/usr/bin/env node
// Fix stage_changed_at for imported CH candidates using interview dates from spreadsheet
require('dotenv').config();
const { Pool } = require('pg');
const ExcelJS = require('exceljs');

const XLSX_PATH = 'C:\\Users\\gpbea\\Downloads\\Couch Heroes Candidate Tracker.xlsx';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const ws = wb.getWorksheet('Master Overview');

  let updated = 0;
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = row.getCell(1).value;
    if (!name || !String(name).trim()) continue;
    const cleanName = String(name).trim().replace(/\n/g, '');
    const interviewDate = row.getCell(8).value;

    if (interviewDate && interviewDate instanceof Date) {
      const { rowCount } = await pool.query(
        "UPDATE candidates SET stage_changed_at = $1 WHERE name = $2 AND client_id = (SELECT id FROM clients WHERE name ILIKE '%couch hero%' LIMIT 1)",
        [interviewDate, cleanName]
      );
      if (rowCount > 0) {
        console.log(cleanName, '→', interviewDate.toISOString().slice(0, 10));
        updated++;
      }
    }
  }

  // For candidates without interview dates, use a reasonable date (e.g. 2 weeks ago for active, 4 weeks for rejected)
  const { rowCount: backfilled } = await pool.query(`
    UPDATE candidates SET stage_changed_at = created_at - INTERVAL '14 days'
    WHERE client_id = (SELECT id FROM clients WHERE name ILIKE '%couch hero%' LIMIT 1)
      AND stage_changed_at >= NOW() - INTERVAL '1 hour'
      AND archived_at IS NULL
  `);
  console.log('Backfilled (active, no date):', backfilled);

  const { rowCount: backfilledArchived } = await pool.query(`
    UPDATE candidates SET stage_changed_at = created_at - INTERVAL '30 days'
    WHERE client_id = (SELECT id FROM clients WHERE name ILIKE '%couch hero%' LIMIT 1)
      AND stage_changed_at >= NOW() - INTERVAL '1 hour'
      AND archived_at IS NOT NULL
  `);
  console.log('Backfilled (archived, no date):', backfilledArchived);

  console.log('Updated from spreadsheet dates:', updated);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
