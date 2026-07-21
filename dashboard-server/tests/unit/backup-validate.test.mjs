import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
const require = createRequire(import.meta.url);
const { validateBackup, EXPECTED_TABLES } = require('../../backup-validate');

// Pool stub returning fixed row counts per table
function poolWithCounts(counts) {
  return {
    query: async (sql) => {
      const m = sql.match(/FROM (\w+)/);
      const table = m ? m[1] : null;
      if (!(table in counts)) throw new Error('relation does not exist');
      return { rows: [{ cnt: counts[table] }] };
    },
  };
}

let tmpDir;
beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bkv-')); });
afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

function writeTmp(name, content) {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, content);
  return p;
}

function jsonBackup(tables) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), version: 3, tables });
}

const FULL_COUNTS = Object.fromEntries(EXPECTED_TABLES.map(t => [t, 2]));
const FULL_TABLES = Object.fromEntries(EXPECTED_TABLES.map(t => [t, [{ a: 1 }, { a: 2 }]]));

describe('validateBackup — JSON backups', () => {
  it('valid when all tables present and counts match', async () => {
    const p = writeTmp('b.json', jsonBackup(FULL_TABLES));
    const result = await validateBackup(p, poolWithCounts(FULL_COUNTS));
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('reports missing tables', async () => {
    const tables = { ...FULL_TABLES };
    delete tables.leads;
    const p = writeTmp('b.json', jsonBackup(tables));
    const result = await validateBackup(p, poolWithCounts(FULL_COUNTS));
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Missing table: leads');
  });

  it('reports >10% row-count differences beyond 5 rows', async () => {
    const counts = { ...FULL_COUNTS, clients: 25 };
    const tables = { ...FULL_TABLES, clients: Array.from({ length: 45 }, (_, i) => ({ i })) };
    const p = writeTmp('b.json', jsonBackup(tables));
    const result = await validateBackup(p, poolWithCounts(counts));
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.startsWith('clients:'))).toBe(true);
  });

  it('invalid JSON is a validation failure, not a throw', async () => {
    const p = writeTmp('b.json', '{nope');
    const result = await validateBackup(p, null);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatch(/not valid JSON/);
  });
});

function sqlDump(tables) {
  // Minimal pg_dump-shaped plain dump: COPY blocks with rows terminated by \.
  let out = '--\n-- PostgreSQL database dump\n--\n\n';
  for (const [name, rows] of Object.entries(tables)) {
    out += `COPY public.${name} (id, title) FROM stdin;\n`;
    rows.forEach((r, i) => { out += `${i}\tRow with \\t escape and text\n`; });
    out += '\\.\n\n';
  }
  out += '-- PostgreSQL database dump complete\n';
  return out;
}

describe('validateBackup — SQL dumps', () => {
  it('valid when all tables present and counts match', async () => {
    const p = writeTmp('b.sql', sqlDump(FULL_TABLES));
    const result = await validateBackup(p, poolWithCounts(FULL_COUNTS));
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('reports missing tables in the dump', async () => {
    const tables = { ...FULL_TABLES };
    delete tables.audit_log;
    delete tables.documents;
    const p = writeTmp('b.sql', sqlDump(tables));
    const result = await validateBackup(p, poolWithCounts(FULL_COUNTS));
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Missing table: audit_log');
    expect(result.issues).toContain('Missing table: documents');
  });

  it('reports >10% row-count differences beyond 5 rows', async () => {
    const counts = { ...FULL_COUNTS, users: 23 };
    const tables = { ...FULL_TABLES, users: Array.from({ length: 12 }, (_, i) => ({ i })) };
    const p = writeTmp('b.sql', sqlDump(tables));
    const result = await validateBackup(p, poolWithCounts(counts));
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.startsWith('users:'))).toBe(true);
  });

  it('a dump with no COPY blocks at all is invalid', async () => {
    const p = writeTmp('b.sql', '-- empty dump, schema only\nCREATE TABLE x (id int);\n');
    const result = await validateBackup(p, null);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('does not confuse quoted or schema-qualified names', async () => {
    // COPY public."users" — quoted identifiers appear for reserved-ish names
    let out = 'COPY public."users" (id) FROM stdin;\n1\n2\n\\.\n';
    for (const t of EXPECTED_TABLES.filter(t => t !== 'users')) {
      out += `COPY public.${t} (id) FROM stdin;\n1\n2\n\\.\n`;
    }
    out += '-- PostgreSQL database dump complete\n';
    const p = writeTmp('b.sql', out);
    const result = await validateBackup(p, poolWithCounts(FULL_COUNTS));
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('rejects a dump truncated inside a COPY block even if counts match', async () => {
    // All expected tables present with matching counts, but the final COPY
    // block never terminates — the file was cut off mid-write. The old
    // parser would have counted the rows and passed it: the false-PASS case.
    let out = '';
    const tables = EXPECTED_TABLES.slice();
    const last = tables.pop();
    for (const t of tables) out += `COPY public.${t} (id) FROM stdin;\n1\n2\n\\.\n`;
    out += `COPY public.${last} (id) FROM stdin;\n1\n2\n`; // no \. and no completion marker
    const p = writeTmp('b.sql', out);
    const result = await validateBackup(p, poolWithCounts(FULL_COUNTS));
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatch(/truncated/i);
  });

  it('rejects a dump missing the completion marker', async () => {
    const p = writeTmp('b.sql', sqlDump(FULL_TABLES).replace('-- PostgreSQL database dump complete\n', ''));
    const result = await validateBackup(p, poolWithCounts(FULL_COUNTS));
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatch(/database dump complete/i);
  });
});
