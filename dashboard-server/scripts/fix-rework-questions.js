require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SQL_DIR = 'd:/tmp';

async function main() {
  const files = fs.readdirSync(SQL_DIR)
    .filter(f => f.startsWith('rework_sql_') && f.endsWith('.sql'))
    .sort();

  let totalParsed = 0;
  let applied = 0;
  let alreadyCorrect = 0;
  let failed = 0;
  let notFound = 0;
  const failures = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(SQL_DIR, file), 'utf8');
    const blocks = extractUpdateBlocks(content);
    console.log(`\n${file}: ${blocks.length} UPDATE blocks found`);
    totalParsed += blocks.length;

    for (const block of blocks) {
      try {
        // Resolve truncated UUID to full UUID
        let fullId = block.id;
        if (block.id.length < 36) {
          const lookup = await pool.query(
            "SELECT id FROM interview_question_bank WHERE id::text LIKE $1 LIMIT 1",
            [block.id + '%']
          );
          if (lookup.rows.length === 0) {
            notFound++;
            failures.push({ file, id: block.id, reason: 'UUID prefix not found' });
            continue;
          }
          fullId = lookup.rows[0].id;
        }

        // Check current text
        const current = await pool.query(
          'SELECT substring(question_text, 1, 80) as preview FROM interview_question_bank WHERE id = $1',
          [fullId]
        );
        if (current.rows.length === 0) {
          notFound++;
          failures.push({ file, id: block.id, reason: 'Full UUID not found' });
          continue;
        }

        // Unescape SQL single quotes to get the actual intended text
        const intendedText = block.questionText.replace(/''/g, "'");
        const currentPreview = current.rows[0].preview;
        const intendedPreview = intendedText.substring(0, 80);

        // Check if already applied
        if (currentPreview === intendedPreview) {
          alreadyCorrect++;
          continue;
        }

        // Apply via parameterised query
        const result = await pool.query(
          'UPDATE interview_question_bank SET question_text = $1, updated_at = NOW() WHERE id = $2',
          [intendedText, fullId]
        );

        if (result.rowCount === 1) {
          applied++;
          console.log(`  APPLIED: ${block.id} (${file})`);
        } else {
          failed++;
          failures.push({ file, id: block.id, reason: 'UPDATE returned 0 rows' });
        }
      } catch (err) {
        failed++;
        failures.push({ file, id: block.id, reason: err.message });
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Total blocks parsed:', totalParsed);
  console.log('Already correct:', alreadyCorrect);
  console.log('Newly applied:', applied);
  console.log('Not found:', notFound);
  console.log('Failed:', failed);

  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  ${f.file} | ${f.id} | ${f.reason}`));
  }

  await pool.end();
}

function extractUpdateBlocks(sql) {
  const blocks = [];
  const lines = sql.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // Match both formats:
    // 1. Single-line: UPDATE interview_question_bank SET question_text = '...' WHERE id = '...';
    // 2. Multi-line: UPDATE interview_question_bank\nSET question_text = '...\n...' WHERE id = '...';
    if (!lines[i].startsWith('UPDATE interview_question_bank')) continue;

    // Collect the full statement (may span multiple lines until we hit a semicolon)
    let stmt = '';
    for (let j = i; j < lines.length; j++) {
      stmt += lines[j] + '\n';
      if (lines[j].trimEnd().endsWith(';')) break;
    }

    // Extract UUID from WHERE clause
    const whereMatch = stmt.match(/WHERE id = '([0-9a-f-]+)'\s*;/);
    if (!whereMatch) continue;
    const id = whereMatch[1];

    // Extract question text between SET question_text = ' and the closing ' before WHERE
    const setMarker = "SET question_text = '";
    const setIdx = stmt.indexOf(setMarker);
    if (setIdx === -1) continue;
    const textStart = setIdx + setMarker.length;

    const whereIdx = stmt.indexOf("WHERE id = '" + id + "'");
    // Walk backwards from WHERE to find the closing quote
    let textEnd = whereIdx - 1;
    while (textEnd > textStart && /[\s]/.test(stmt[textEnd])) textEnd--;
    if (stmt[textEnd] !== "'") {
      const lastQ = stmt.lastIndexOf("'", whereIdx - 1);
      if (lastQ > textStart) textEnd = lastQ;
      else continue;
    }

    const questionText = stmt.substring(textStart, textEnd);
    blocks.push({ id, questionText });
  }

  return blocks;
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
