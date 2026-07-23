#!/usr/bin/env node
// dashboard-server/scripts/backfill-hiring-plan.js
//
// Backfill the structured hiring plan columns (migration 084) from legacy
// planning lines embedded in hiring_positions.description, using the pure
// parser in lib/hiring-legacy-parser.js.
//
// Usage:
//   node scripts/backfill-hiring-plan.js [--apply] [--output <path>]
//
//   Default mode is DRY RUN: no rows are updated, only the report is written.
//   --apply       perform the updates (requires DATABASE_URL; the target
//                 host and database are printed for confirmation).
//   --output      report path. A bare filename is placed in tests/.tmp/
//                 (git-ignored) so the report never dirties tracked paths.
//                 Default: hiring-plan-backfill-report.json.
//
// Guarantees:
//   - The original description column is never touched. The parser's
//     cleanDescription appears in the report as a review aid only; it is
//     NEVER written to the database.
//   - Only NULL structured columns are populated; existing values are never
//     overwritten. Parsed values that collide with existing non-null values
//     are reported as skipped.
//   - Writes are wrapped in a single transaction with per-field IS NULL
//     guards, so a concurrent write cannot be clobbered.
//   - planning_version is incremented only on rows that actually change.

'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { parseLegacyHiringDescription } = require('../lib/hiring-legacy-parser.js');

// Structured columns the backfill may populate, in a stable order.
// employment_type (added by migration 046 with DEFAULT 'permanent') remains
// nullable: migration 084 promotes NULLs to 'fte' and adds a CHECK but only
// approval_status gets SET NOT NULL. In practice the default means new rows
// arrive non-null, so a parsed value usually agrees with or conflicts with
// the existing one; a genuinely NULL column is still backfilled.
const BACKFILL_FIELDS = [
  'budgeted_compensation',
  'compensation_currency',
  'compensation_basis',
  'target_start_month',
  'priority',
  'employment_type',
];

function parseArgs(argv) {
  const args = { apply: false, output: 'hiring-plan-backfill-report.json', yearOneStart: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--apply') {
      args.apply = true;
    } else if (argv[i] === '--output') {
      if (!argv[i + 1]) {
        console.error('--output requires a path argument');
        process.exit(1);
      }
      args.output = argv[++i];
    } else if (argv[i] === '--year-one-start') {
      if (!argv[i + 1] || !/^\d{4}$/.test(argv[i + 1])) {
        console.error('--year-one-start requires a 4-digit year (e.g. 2026)');
        process.exit(1);
      }
      args.yearOneStart = Number(argv[++i]);
    } else {
      console.error(`Unknown argument: ${argv[i]}`);
      console.error('Usage: node scripts/backfill-hiring-plan.js [--apply] [--output <path>] [--year-one-start <year>]');
      process.exit(1);
    }
  }
  return args;
}

function resolveOutputPath(output) {
  // A bare filename lands in tests/.tmp/ (git-ignored per the repo
  // .gitignore) so the report never shows up in git status. An explicit
  // directory path is honoured as given.
  const hasDir = output !== path.basename(output);
  if (hasDir) return path.resolve(output);
  return path.resolve(__dirname, '../tests/.tmp', output);
}

function describeDatabase(connectionString) {
  // Print host and database only - never credentials.
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname || '(unknown host)',
      database: url.pathname.replace(/^\//, '') || '(unknown database)',
    };
  } catch (e) {
    return { host: '(unparseable connection string)', database: '(unparseable connection string)' };
  }
}

// Deterministic legacy-to-canonical employment type mapping, exactly as
// migration 084 normalises it. Used for COMPARISON ONLY so a legacy
// spelling already in the column ('contract') is not reported as a
// conflict with the parser's canonical value ('contractor'). The backfill
// itself only ever writes canonical values into NULL columns.
const EMPLOYMENT_TYPE_CANONICAL = {
  permanent: 'fte',
  contract: 'contractor',
  freelance: 'psc',
};

// Canonicalise a decimal string: strip thousands-irrelevant leading zeros
// and trailing fractional zeros so NUMERIC(14,4) output ('96000.0000')
// compares equal to the parser's '96000'. String arithmetic only - no
// floats anywhere near NUMERIC values.
function canonicalDecimal(text) {
  const s = String(text);
  if (!/^\d+(\.\d+)?$/.test(s)) return s;
  let [whole, frac = ''] = s.split('.');
  whole = whole.replace(/^0+(?=\d)/, '');
  frac = frac.replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

// Normalise a value for comparison against the parser's output.
// - DATE columns come back from pg as JS Dates at LOCAL midnight, so use
//   local date components (toISOString would shift the day in non-UTC zones).
// - employment_type maps legacy spellings to canonical for comparison only.
// - budgeted_compensation compares as canonical decimal strings.
function normaliseComparable(field, value) {
  if (value === null || value === undefined) return null;
  if (field === 'target_start_month' && value instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  if (field === 'employment_type') {
    return EMPLOYMENT_TYPE_CANONICAL[value] || String(value);
  }
  if (field === 'budgeted_compensation') {
    return canonicalDecimal(value);
  }
  return String(value);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.apply ? 'apply' : 'dry-run';

  if (!process.env.DATABASE_URL) {
    console.error(
      args.apply
        ? 'REFUSING --apply: DATABASE_URL is not defined.'
        : 'DATABASE_URL is not defined; the dry run needs it to read hiring_positions.'
    );
    process.exit(1);
  }

  const db = describeDatabase(process.env.DATABASE_URL);
  const parserOpts = args.yearOneStart ? { yearOneStart: args.yearOneStart } : undefined;

  console.log(`backfill-hiring-plan: mode=${mode}`);
  console.log(`backfill-hiring-plan: target host=${db.host} database=${db.database}`);
  if (args.yearOneStart) console.log(`backfill-hiring-plan: yearOneStart=${args.yearOneStart}`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const counts = {
    total: 0,
    noLegacyData: 0,
    parsedClean: 0,
    partiallyParsed: 0,
    withExceptions: 0,
    updated: 0,
    skippedNotNull: 0,
  };
  const reportPositions = [];

  try {
    const { rows } = await pool.query(
      `SELECT id, title, description,
              budgeted_compensation, compensation_currency, compensation_basis,
              target_start_month, priority, employment_type, planning_version
         FROM hiring_positions
        ORDER BY created_at, id`
    );
    counts.total = rows.length;

    const client = await pool.connect();
    try {
      if (args.apply) await client.query('BEGIN');

      for (const row of rows) {
        const parsed = parseLegacyHiringDescription(row.description, parserOpts);
        const hasRecognised = parsed.recognisedLines.length > 0;
        const hasExceptions = parsed.exceptions.length > 0;

        if (!hasRecognised && !hasExceptions) {
          counts.noLegacyData++;
          continue;
        }
        if (hasExceptions) {
          counts.withExceptions++;
          if (hasRecognised) counts.partiallyParsed++;
        } else {
          counts.parsedClean++;
        }

        // Split parsed values into writes (column currently NULL) and skips
        // (column already holds a value). Identical existing values are
        // agreements, not conflicts.
        const writes = {};
        const skips = [];
        for (const field of BACKFILL_FIELDS) {
          if (!(field in parsed.values)) continue;
          const existing = normaliseComparable(field, row[field]);
          const parsedValue = normaliseComparable(field, parsed.values[field]);
          if (existing === null) {
            writes[field] = parsed.values[field];
          } else if (existing !== parsedValue) {
            counts.skippedNotNull++;
            skips.push({ field, existing, parsed: parsedValue });
          }
        }

        let rowUpdated = false;
        if (args.apply && Object.keys(writes).length > 0) {
          const fields = Object.keys(writes);
          const setSql = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
          // Per-field IS NULL guards: if a concurrent write filled a column
          // since the read, the row is left alone and reported.
          const guardSql = fields.map((f) => `${f} IS NULL`).join(' AND ');
          const result = await client.query(
            `UPDATE hiring_positions
                SET ${setSql},
                    planning_version = planning_version + 1,
                    updated_at = NOW()
              WHERE id = $1 AND ${guardSql}`,
            [row.id, ...fields.map((f) => writes[f])]
          );
          if (result.rowCount === 1) {
            counts.updated++;
            rowUpdated = true;
          } else {
            // Keep the summary counter aligned with the per-row detail.
            counts.skippedNotNull++;
            skips.push({ field: '(row)', existing: '(changed concurrently)', parsed: '(update skipped)' });
          }
        }

        // Report every position that has legacy data. cleanDescription is a
        // review aid only - it is never written to the database.
        reportPositions.push({
          id: row.id,
          title: row.title,
          parsedValues: parsed.values,
          recognisedLines: parsed.recognisedLines.map((r) => ({ label: r.label, value: r.value })),
          exceptions: parsed.exceptions,
          skippedNotNull: skips,
          wouldWrite: !args.apply ? writes : undefined,
          updated: args.apply ? rowUpdated : undefined,
          cleanDescription: parsed.cleanDescription,
        });
      }

      if (args.apply) await client.query('COMMIT');
    } catch (e) {
      if (args.apply) await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode,
    database: db,
    counts,
    positions: reportPositions,
  };

  const outputPath = resolveOutputPath(args.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`backfill-hiring-plan: mode: ${mode}`);
  console.log(`backfill-hiring-plan: counts: ${JSON.stringify(counts)}`);
  console.log(`backfill-hiring-plan: report written to ${outputPath}`);
  if (!args.apply) {
    console.log('backfill-hiring-plan: DRY RUN - no rows were updated. Re-run with --apply to write.');
  }
}

main().catch((e) => {
  console.error('backfill-hiring-plan: FAILED:', e.message);
  process.exit(1);
});
