import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { matchWorkstream, matchCalendarEvent, transformNote, fetchWithRetry, fetchGranolaNotes, fetchNoteDetail, syncGranolaMeetings } = require('../../lib/granola-sync');

// --- Fixtures ---

const CLIENTS = [
  { id: '1', name: 'Couch Heroes' },
  { id: '2', name: 'Lighthouse' },
  { id: '3', name: 'NBI' },
  { id: '4', name: 'NBI Analytics' },
];

const BASE_NOTE = {
  id: '03a27e7d-bf68-4838-a8ba-fde37a8c4f3a',
  title: 'HR- Weekly meeting',
  created_at: '2026-06-04T12:00:00.000Z',
  owner: { name: 'Glen Pryer', email: 'gpryer@nbi-consulting.com' },
  summary: '### New ATS Tool Introduction\n\n- Introducing custom-built ATS system\n- Replaces current Google Docs workflow\n\n### Current Recruiting Pipeline Status\n\n- Ellis in offer stage for HR Ops role',
};

const CAL_EVENTS = [
  { title: 'HR Weekly Meeting', start: '2026-06-04T12:00:00', end: '2026-06-04T13:00:00', attendees: ['Glen Pryer', 'Lorenza Menna'] },
  { title: '1:1 with Dino', start: '2026-06-04T10:00:00', end: '2026-06-04T11:00:00', attendees: ['Glen Pryer', 'Dino Kandiloros'] },
  { title: 'GCP Migration Discussion', start: '2026-06-04T09:00:00', end: '2026-06-04T10:00:00', attendees: ['Glen Pryer', 'Justin Logan'] },
];

// --- matchWorkstream ---

describe('matchWorkstream', () => {
  it('matches exact client name in title', () => {
    expect(matchWorkstream('Couch Heroes, Art Producer - Fred Dossola', CLIENTS)).toBe('Couch Heroes');
  });

  it('longest match wins', () => {
    expect(matchWorkstream('NBI Analytics meeting', CLIENTS)).toBe('NBI Analytics');
  });

  it('returns null when no match', () => {
    expect(matchWorkstream('HR Weekly Meeting', CLIENTS)).toBeNull();
  });

  it('case insensitive', () => {
    expect(matchWorkstream('couch heroes weekly sync', CLIENTS)).toBe('Couch Heroes');
  });

  it('matches partial title containing client', () => {
    expect(matchWorkstream('check in with Lighthouse team', CLIENTS)).toBe('Lighthouse');
  });
});

// --- matchCalendarEvent ---

describe('matchCalendarEvent', () => {
  it('matches event within time window', () => {
    const result = matchCalendarEvent('2026-06-04T12:30:00', 'HR- Weekly meeting', CAL_EVENTS);
    expect(result).toEqual(['Glen Pryer', 'Lorenza Menna']);
  });

  it('returns empty array when no time overlap', () => {
    const result = matchCalendarEvent('2026-06-04T16:00:00', 'Random Meeting', CAL_EVENTS);
    expect(result).toEqual([]);
  });

  it('picks best title match when multiple events overlap', () => {
    const overlapping = [
      { title: 'HR Weekly Meeting', start: '2026-06-04T12:00:00', end: '2026-06-04T13:30:00', attendees: ['Glen', 'Lorenza'] },
      { title: 'GCP Migration Planning', start: '2026-06-04T12:00:00', end: '2026-06-04T13:30:00', attendees: ['Glen', 'Justin'] },
    ];
    const result = matchCalendarEvent('2026-06-04T12:30:00', 'GCP migration timeline and infrastructure costs', overlapping);
    expect(result).toEqual(['Glen', 'Justin']);
  });

  it('matches within 15min pad before event start', () => {
    const result = matchCalendarEvent('2026-06-04T09:50:00', '1:1 with Dino', CAL_EVENTS);
    expect(result).toEqual(['Glen Pryer', 'Dino Kandiloros']);
  });

  it('returns empty array when events list is empty', () => {
    const result = matchCalendarEvent('2026-06-04T12:30:00', 'Something', []);
    expect(result).toEqual([]);
  });
});

// --- transformNote ---

describe('transformNote', () => {
  it('transforms standard meeting note', () => {
    const result = transformNote(BASE_NOTE, [], []);
    expect(result.data.date).toBe('2026-06-04');
    expect(result.data.title).toBe('HR- Weekly meeting');
    expect(result.data.summary).toBe(BASE_NOTE.summary);
    expect(result.data.source_id).toBe('03a27e7d-bf68-4838-a8ba-fde37a8c4f3a');
    expect(result.data.source_path).toBe('granola://meetings/03a27e7d-bf68-4838-a8ba-fde37a8c4f3a');
    expect(result.data.owner_name).toBe('Glen Pryer');
    expect(result.data.owner_email).toBe('gpryer@nbi-consulting.com');
    expect(result.data.attendees).toEqual([]);
    expect(result.data.topics).toEqual([]);
    expect(result.data.decisions_text).toBe('');
    expect(result.data.context).toBe('');
    expect(result.data.workstream).toBeNull();
    expect(result.item_id).toMatch(/^mtg_20260604_/);
  });

  it('does not truncate summary', () => {
    const longSummary = '### Topic\n\n' + 'x'.repeat(5000);
    const note = { ...BASE_NOTE, summary: longSummary };
    const result = transformNote(note, [], []);
    expect(result.data.summary).toBe(longSummary);
    expect(result.data.summary.length).toBe(5011);
  });

  it('trims title whitespace', () => {
    const note = { ...BASE_NOTE, title: '  HR- Weekly meeting  ' };
    const result = transformNote(note, [], []);
    expect(result.data.title).toBe('HR- Weekly meeting');
  });

  it('empty summary becomes empty string', () => {
    const note = { ...BASE_NOTE, summary: null };
    const result = transformNote(note, [], []);
    expect(result.data.summary).toBe('');
  });

  it('matches workstream from client list', () => {
    const clients = [{ id: '1', name: 'Couch Heroes' }];
    const note = { ...BASE_NOTE, title: 'Couch Heroes, Art Producer interview' };
    const result = transformNote(note, clients, []);
    expect(result.data.workstream).toBe('Couch Heroes');
  });

  it('populates attendees from calendar match', () => {
    const calEvents = [
      { title: 'HR Weekly Meeting', start: '2026-06-04T11:45:00', end: '2026-06-04T13:00:00', attendees: ['Glen Pryer', 'Lorenza Menna'] },
    ];
    const result = transformNote(BASE_NOTE, [], calEvents);
    expect(result.data.attendees).toEqual(['Glen Pryer', 'Lorenza Menna']);
  });

  it('handles missing owner gracefully', () => {
    const note = { ...BASE_NOTE, owner: undefined };
    const result = transformNote(note, [], []);
    expect(result.data.owner_name).toBe('');
    expect(result.data.owner_email).toBe('');
  });
});

// --- fetchWithRetry ---

describe('fetchWithRetry', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('returns parsed JSON on 200', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: 'ok' }) }));
    const result = await fetchWithRetry('https://example.com/test', { Authorization: 'Bearer grn_test' });
    expect(result).toEqual({ data: 'ok' });
  });

  it('retries on 429 up to 3 times then throws', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 429, headers: { get: () => null } }));
    await expect(fetchWithRetry('https://example.com/test', { Authorization: 'Bearer grn_test' }, { maxRetries: 3, baseDelayMs: 1 }))
      .rejects.toThrow('429');
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('throws on 401 without retry', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 401 }));
    await expect(fetchWithRetry('https://example.com/test', { Authorization: 'Bearer grn_bad' }, { maxRetries: 3, baseDelayMs: 1 }))
      .rejects.toThrow('401');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns null on 404', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
    const result = await fetchWithRetry('https://example.com/test', { Authorization: 'Bearer grn_test' });
    expect(result).toBeNull();
  });
});

// --- fetchGranolaNotes ---

describe('fetchGranolaNotes', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('collects notes across paginated responses', async () => {
    const page1 = { notes: [{ id: 'a', title: 'A' }], hasMore: true, cursor: 'cur1' };
    const page2 = { notes: [{ id: 'b', title: 'B' }], hasMore: false, cursor: null };
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) });

    const notes = await fetchGranolaNotes('grn_test', '2026-06-01T00:00:00Z');
    expect(notes).toEqual([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][0]).toContain('cursor=cur1');
  });

  it('returns empty array when no notes', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ notes: [], hasMore: false }) }));
    const notes = await fetchGranolaNotes('grn_test', '2026-06-01T00:00:00Z');
    expect(notes).toEqual([]);
  });
});

// --- fetchNoteDetail ---

describe('fetchNoteDetail', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('returns note object on success', async () => {
    const note = { id: 'abc', title: 'Test', summary: 'Sum' };
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(note) }));
    const result = await fetchNoteDetail('grn_test', 'abc');
    expect(result).toEqual(note);
  });

  it('returns null on 404', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
    const result = await fetchNoteDetail('grn_test', 'missing');
    expect(result).toBeNull();
  });
});

// --- syncGranolaMeetings ---

function makeMockPool(queryResults = {}) {
  return {
    query: vi.fn(async (sql) => {
      if (sql.includes('granola_last_sync') && sql.startsWith('SELECT')) {
        return queryResults.hwm || { rows: [] };
      }
      if (sql.includes("MAX(data->>'date')")) {
        return queryResults.maxDate || { rows: [{ max: '2026-05-22' }] };
      }
      if (sql.includes('SELECT id, name FROM clients')) {
        return queryResults.clients || { rows: [{ id: '1', name: 'Couch Heroes' }] };
      }
      if (sql.includes('INSERT INTO meeting_items')) {
        return queryResults.insert || { rowCount: 1 };
      }
      if (sql.includes('UPDATE meeting_metadata')) {
        return { rowCount: 1 };
      }
      if (sql.includes('INSERT INTO settings')) {
        return { rowCount: 1 };
      }
      if (sql.includes("role = 'admin'")) {
        return queryResults.admins || { rows: [{ username: 'glen' }] };
      }
      return { rows: [], rowCount: 0 };
    }),
  };
}

function makeGranolaNote(id, title, date) {
  return {
    id, title,
    created_at: `${date}T12:00:00.000Z`,
    owner: { name: 'Glen Pryer', email: 'gpryer@nbi-consulting.com' },
    summary: `### ${title}\n\nSummary content for ${title}`,
  };
}

describe('syncGranolaMeetings', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.GRANOLA_API_KEY;
  afterEach(() => { global.fetch = originalFetch; process.env.GRANOLA_API_KEY = originalEnv; });

  it('skips when GRANOLA_API_KEY not set', async () => {
    delete process.env.GRANOLA_API_KEY;
    const pool = makeMockPool();
    const log = vi.fn();
    const result = await syncGranolaMeetings({ pool, log, createNotification: vi.fn(), _msalClient: null, _retryOpts: { maxRetries: 3, baseDelayMs: 1 } });
    expect(result.skipped).toBe(true);
    expect(log).toHaveBeenCalledWith('info', 'GranolaSync', expect.stringContaining('not set'), expect.anything());
  });

  it('imports new notes on first run (no HWM)', async () => {
    process.env.GRANOLA_API_KEY = 'grn_test';
    const note1 = makeGranolaNote('aaa', 'Couch Heroes Weekly', '2026-06-03');
    const note2 = makeGranolaNote('bbb', 'HR Meeting', '2026-06-04');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ notes: [{ id: 'aaa' }, { id: 'bbb' }], hasMore: false }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(note1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(note2) });

    const pool = makeMockPool();
    const log = vi.fn();
    const createNotification = vi.fn();
    const result = await syncGranolaMeetings({ pool, log, createNotification, _msalClient: null });

    expect(result.imported).toBe(2);
    expect(result.failed).toBe(0);
    const inserts = pool.query.mock.calls.filter(c => c[0].includes('INSERT INTO meeting_items'));
    expect(inserts.length).toBe(2);
    expect(createNotification).toHaveBeenCalledWith('glen', 'info', expect.stringContaining('2 new meeting'), expect.anything(), '#command-centre/meetings', expect.anything());
  });

  it('uses existing HWM on subsequent runs', async () => {
    process.env.GRANOLA_API_KEY = 'grn_test';
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ notes: [], hasMore: false }) });

    const pool = makeMockPool({ hwm: { rows: [{ value: '2026-06-05T07:00:00.000Z' }] } });
    const log = vi.fn();
    const result = await syncGranolaMeetings({ pool, log, createNotification: vi.fn(), _msalClient: null, _retryOpts: { maxRetries: 3, baseDelayMs: 1 } });

    expect(result.imported).toBe(0);
    const fetchUrl = global.fetch.mock.calls[0][0];
    expect(fetchUrl).toContain('created_after=2026-06-05T07%3A00%3A00.000Z');
  });

  it('does not advance HWM on partial failure', async () => {
    process.env.GRANOLA_API_KEY = 'grn_test';
    const note1 = makeGranolaNote('aaa', 'Good Meeting', '2026-06-03');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ notes: [{ id: 'aaa' }, { id: 'bbb' }], hasMore: false }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(note1) })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const pool = makeMockPool();
    const log = vi.fn();
    const result = await syncGranolaMeetings({ pool, log, createNotification: vi.fn(), _msalClient: null, _retryOpts: { maxRetries: 3, baseDelayMs: 1 } });

    expect(result.imported).toBe(1);
    expect(result.failed).toBe(1);
    const hwmWrites = pool.query.mock.calls.filter(c => c[0].includes('INSERT INTO settings'));
    expect(hwmWrites.length).toBe(0);
  });

  it('does not overwrite compiled source records', async () => {
    process.env.GRANOLA_API_KEY = 'grn_test';
    const note1 = makeGranolaNote('aaa', 'Existing Compiled Meeting', '2026-06-03');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ notes: [{ id: 'aaa' }], hasMore: false }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(note1) });

    const pool = makeMockPool();
    const log = vi.fn();
    await syncGranolaMeetings({ pool, log, createNotification: vi.fn(), _msalClient: null });

    const insertCall = pool.query.mock.calls.find(c => c[0].includes('INSERT INTO meeting_items'));
    expect(insertCall[0]).toContain("WHERE meeting_items.source = 'granola_api'");
  });
});
