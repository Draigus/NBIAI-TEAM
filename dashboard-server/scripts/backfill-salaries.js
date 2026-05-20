#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');
const ExcelJS = require('exceljs');
const path = require('path');

const EXCEL_PATH = path.resolve(__dirname, '../../Clients/Couch Heroes/hr_hiring/Merged_Hiring_Plan_final_v2.xlsx');

function normalise(title) {
  return title
    .toLowerCase()
    .replace(/\s*\(hired\)\s*/gi, '')
    .replace(/\s*\(new\)\s*/gi, '')
    .replace(/\benviro\b/g, 'environment')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const ws = wb.worksheets[0];

  const excelData = [];
  for (let i = 5; i <= 50; i++) {
    const row = ws.getRow(i);
    const title = row.getCell(4).value;
    const annualSalary = row.getCell(5).value;
    if (title && typeof title === 'string' && title.trim()) {
      excelData.push({
        title: title.trim(),
        annualSalary: typeof annualSalary === 'number' ? annualSalary : null,
      });
    }
  }
  console.log(`Read ${excelData.length} positions from Excel`);

  const { rows: dbPositions } = await pool.query(
    'SELECT id, title, salary_range FROM hiring_positions ORDER BY title'
  );
  console.log(`Found ${dbPositions.length} positions in DB`);

  let matched = 0, skipped = 0;
  for (const dbPos of dbPositions) {
    const dbNorm = normalise(dbPos.title);
    const excelMatch = excelData.find(e => {
      const eNorm = normalise(e.title);
      // Exact match or "new role" suffix stripped
      if (eNorm === dbNorm) return true;
      if (dbNorm.replace('(new role)', '').trim() === eNorm) return true;
      // Word-boundary substring: only match if the shorter is a complete word sequence in the longer
      const shorter = eNorm.length <= dbNorm.length ? eNorm : dbNorm;
      const longer  = eNorm.length <= dbNorm.length ? dbNorm : eNorm;
      // Require whole-word containment using word boundaries
      const escaped = shorter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`);
      return re.test(longer);
    });

    if (!excelMatch) {
      console.log(`  MISS: ${dbPos.title}`);
      skipped++;
      continue;
    }

    const salary = excelMatch.annualSalary;
    if (!salary || salary === 0) {
      console.log(`  SKIP (no salary): ${dbPos.title} <- ${excelMatch.title}`);
      skipped++;
      continue;
    }

    const formatted = '£' + Math.round(salary).toLocaleString('en-GB');
    console.log(`  MATCH: ${dbPos.title} <- ${excelMatch.title} -> ${formatted}`);

    if (!dryRun) {
      await pool.query(
        'UPDATE hiring_positions SET salary_range = $1, updated_at = NOW() WHERE id = $2',
        [formatted, dbPos.id]
      );
    }
    matched++;
  }

  console.log(`\nDone: ${matched} matched, ${skipped} skipped${dryRun ? ' (DRY RUN)' : ''}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
