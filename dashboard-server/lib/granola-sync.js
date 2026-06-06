'use strict';

const { generateItemId } = require('./meetings-intelligence');
const { fetchCalendarEvents } = require('./graph-calendar');

const GRANOLA_BASE = 'https://public-api.granola.ai/v1';
const RATE_DELAY_MS = 250;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Client matching ---

function matchWorkstream(title, clients) {
  const titleLower = title.toLowerCase();
  let best = null;
  for (const client of clients) {
    const nameLower = client.name.toLowerCase();
    if (titleLower.includes(nameLower)) {
      if (!best || nameLower.length > best.length) {
        best = { length: nameLower.length, workstream: client.name };
      }
    }
  }
  return best ? best.workstream : null;
}

// --- Calendar matching ---

const TITLE_STOP_WORDS = new Set(['meeting', 'call', 'weekly', 'sync', 'check', 'in', 'with', 'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'on', 'at']);

function titleWords(title) {
  return title.toLowerCase().split(/[\s\-:,./()]+/).filter(w => w.length > 1 && !TITLE_STOP_WORDS.has(w));
}

function titleOverlapScore(a, b) {
  const wordsA = new Set(titleWords(a));
  const wordsB = titleWords(b);
  let score = 0;
  for (const w of wordsB) {
    if (wordsA.has(w)) score++;
  }
  return score;
}

function matchCalendarEvent(noteCreatedAt, noteTitle, calendarEvents) {
  if (!calendarEvents || calendarEvents.length === 0) return [];

  const noteTime = new Date(noteCreatedAt).getTime();
  const PAD_MS = 15 * 60 * 1000;

  const candidates = calendarEvents.filter(ev => {
    const evStart = new Date(ev.start).getTime();
    const evEnd = new Date(ev.end).getTime();
    return noteTime >= (evStart - PAD_MS) && noteTime <= (evEnd + PAD_MS);
  });

  if (candidates.length === 0) return [];
  if (candidates.length === 1) return candidates[0].attendees || [];

  let best = candidates[0];
  let bestScore = titleOverlapScore(noteTitle, best.title);
  for (let i = 1; i < candidates.length; i++) {
    const score = titleOverlapScore(noteTitle, candidates[i].title);
    if (score > bestScore) {
      bestScore = score;
      best = candidates[i];
    }
  }
  return best.attendees || [];
}

// --- Transform ---

function transformNote(note, clients, calendarEvents) {
  const title = (note.title || '').trim();
  const createdAt = note.created_at || new Date().toISOString();
  const date = createdAt.slice(0, 10);
  const summary = note.summary_markdown || note.summary_text || note.summary || '';
  const owner = note.owner || {};

  // Use API-provided attendees if available, fall back to calendar cross-reference
  let attendees;
  if (Array.isArray(note.attendees) && note.attendees.length > 0) {
    attendees = note.attendees.map(a => a.name || a.email || '').filter(Boolean);
  } else {
    attendees = matchCalendarEvent(createdAt, title, calendarEvents);
  }

  const workstream = matchWorkstream(title, clients);

  // Extract web_url for direct link to Granola note
  const webUrl = note.web_url || null;

  const data = {
    date,
    title,
    attendees,
    topics: [],
    summary,
    decisions_text: '',
    context: '',
    source_id: note.id,
    source_path: webUrl || `granola://meetings/${note.id}`,
    workstream,
    owner_name: owner.name || '',
    owner_email: owner.email || '',
  };

  const item_id = generateItemId('meetings', data);

  return { item_id, data };
}

// --- Granola API helpers ---

async function fetchWithRetry(url, headers, opts = {}) {
  const { maxRetries = 3, baseDelayMs = 5000 } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) await sleep(baseDelayMs * Math.pow(2, attempt - 1));
    const resp = await fetch(url, { headers });
    if (resp.ok) return resp.json();
    if (resp.status === 404) return null;
    if (resp.status === 401 || resp.status === 403) {
      throw new Error(`Granola API ${resp.status}: invalid or expired GRANOLA_API_KEY`);
    }
    if (resp.status === 429 && attempt < maxRetries) {
      const retryAfter = parseInt(resp.headers.get('Retry-After') || '0', 10);
      if (retryAfter > 0) await sleep(retryAfter * 1000);
      continue;
    }
    lastErr = new Error(`Granola API ${resp.status}`);
  }
  throw lastErr;
}

async function fetchGranolaNotes(apiKey, createdAfter) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  const allNotes = [];
  let cursor = null;

  do {
    let url = `${GRANOLA_BASE}/notes?created_after=${encodeURIComponent(createdAfter)}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    const data = await fetchWithRetry(url, headers);
    if (!data) break;
    allNotes.push(...(data.notes || []));
    cursor = data.hasMore ? data.cursor : null;
  } while (cursor);

  return allNotes;
}

async function fetchNoteDetail(apiKey, noteId, retryOpts) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  await sleep(RATE_DELAY_MS);
  return fetchWithRetry(`${GRANOLA_BASE}/notes/${noteId}`, headers, retryOpts);
}

// --- Orchestrator ---

async function syncGranolaMeetings(ctx) {
  const { pool, log, createNotification, _msalClient, _retryOpts } = ctx;
  const retryOpts = _retryOpts || {};
  const apiKey = process.env.GRANOLA_API_KEY;

  if (!apiKey) {
    log('info', 'GranolaSync', 'GRANOLA_API_KEY not set, skipping', {});
    return { skipped: true };
  }

  const syncStartedAt = new Date().toISOString();
  const startTime = Date.now();

  const { rows: hwmRows } = await pool.query("SELECT value FROM settings WHERE key = 'granola_last_sync'");
  let hwm;
  let isFirstRun = false;
  if (hwmRows.length > 0 && hwmRows[0].value) {
    hwm = hwmRows[0].value;
  } else {
    isFirstRun = true;
    const { rows: maxRows } = await pool.query("SELECT MAX(data->>'date') as max FROM meeting_items WHERE section = 'meetings'");
    const maxDate = maxRows[0]?.max || '2026-01-01';
    hwm = `${maxDate}T00:00:00.000Z`;
  }

  log('info', 'GranolaSync', 'Starting', { hwm, isFirstRun });

  let noteStubs;
  try {
    noteStubs = await fetchGranolaNotes(apiKey, hwm);
  } catch (e) {
    log('error', 'GranolaSync', 'Failed to poll notes', { error: e.message });
    try {
      const { rows: admins } = await pool.query("SELECT username FROM users WHERE role = 'admin' AND is_active = true");
      for (const admin of admins) {
        await createNotification(admin.username, 'warning', 'Granola sync failed', e.message, '#command-centre/meetings', false);
      }
    } catch (_) {}
    return { imported: 0, failed: 0, error: e.message };
  }

  if (noteStubs.length === 0) {
    log('info', 'GranolaSync', 'No new notes', { hwm });
    await pool.query("INSERT INTO settings (key, value) VALUES ('granola_last_sync', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [JSON.stringify(syncStartedAt)]);
    return { imported: 0, failed: 0, skipped: 0, durationMs: Date.now() - startTime };
  }

  const notes = [];
  const failedNotes = [];
  for (const stub of noteStubs) {
    try {
      const detail = await fetchNoteDetail(apiKey, stub.id, retryOpts);
      if (detail) notes.push(detail);
    } catch (e) {
      log('warn', 'GranolaSync', 'Failed to fetch note detail', { noteId: stub.id, error: e.message });
      failedNotes.push(stub.id);
    }
  }

  let calendarEvents = [];
  if (_msalClient && notes.length > 0) {
    try {
      const dates = notes.map(n => new Date(n.created_at)).sort((a, b) => a - b);
      const padStart = new Date(dates[0].getTime() - 60 * 60 * 1000);
      const padEnd = new Date(dates[dates.length - 1].getTime() + 3 * 60 * 60 * 1000);
      const calResult = await fetchCalendarEvents(_msalClient, padStart, padEnd);
      calendarEvents = calResult.events || [];
      if (calResult.error) log('warn', 'GranolaSync', 'Calendar fetch issue', { error: calResult.error });
    } catch (e) {
      log('warn', 'GranolaSync', 'Calendar cross-reference failed', { error: e.message });
    }
  } else if (!_msalClient) {
    log('info', 'GranolaSync', 'MSAL not configured, skipping attendee enrichment', {});
  }

  const { rows: clients } = await pool.query('SELECT id, name FROM clients');

  let imported = 0;
  const failedInserts = [];
  for (const note of notes) {
    try {
      const { item_id, data } = transformNote(note, clients, calendarEvents);
      await pool.query(
        `INSERT INTO meeting_items (item_id, section, data, source)
         VALUES ($1, 'meetings', $2, 'granola_api')
         ON CONFLICT (item_id) DO UPDATE SET
           data = EXCLUDED.data,
           source = EXCLUDED.source,
           updated_at = now()
         WHERE meeting_items.source = 'granola_api'`,
        [item_id, JSON.stringify(data)]
      );
      imported++;
      log('info', 'GranolaSync', 'Imported', { title: data.title, date: data.date, workstream: data.workstream, hasAttendees: data.attendees.length > 0 });
    } catch (e) {
      log('error', 'GranolaSync', 'DB insert failed', { noteId: note.id, error: e.message });
      failedInserts.push(note.id);
    }
  }

  try {
    await pool.query(`UPDATE meeting_metadata SET
      meeting_count = (SELECT COUNT(*) FROM meeting_items WHERE section = 'meetings'),
      date_range_end = (SELECT MAX(data->>'date') FROM meeting_items WHERE section = 'meetings'),
      updated_at = now()
    WHERE id = 1`);
  } catch (e) {
    log('warn', 'GranolaSync', 'Failed to update meeting_metadata', { error: e.message });
  }

  if (failedInserts.length === 0 && failedNotes.length === 0) {
    await pool.query("INSERT INTO settings (key, value) VALUES ('granola_last_sync', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [JSON.stringify(syncStartedAt)]);
  }

  // Metrics
  try {
    const promClient = require('prom-client');
    const importedCtr = promClient.register.getSingleMetric('nbi_granola_sync_imported_total');
    const lastSuccess = promClient.register.getSingleMetric('nbi_granola_sync_last_success');
    const errorsCtr = promClient.register.getSingleMetric('nbi_granola_sync_errors_total');
    if (importedCtr) importedCtr.inc(imported);
    if (errorsCtr && (failedNotes.length + failedInserts.length) > 0) errorsCtr.inc(failedNotes.length + failedInserts.length);
    if (lastSuccess && failedInserts.length === 0 && failedNotes.length === 0) lastSuccess.set(Date.now() / 1000);
  } catch (_) {}

  const durationMs = Date.now() - startTime;

  try {
    const { rows: admins } = await pool.query("SELECT username FROM users WHERE role = 'admin' AND is_active = true");
    if (imported > 0 && failedNotes.length === 0 && failedInserts.length === 0) {
      for (const admin of admins) {
        await createNotification(admin.username, 'info', `Granola sync: ${imported} new meeting(s) imported`, '', '#command-centre/meetings', false);
      }
    } else if (failedNotes.length > 0 || failedInserts.length > 0) {
      const totalFailed = failedNotes.length + failedInserts.length;
      for (const admin of admins) {
        await createNotification(admin.username, 'warning', `Granola sync: ${imported} imported, ${totalFailed} failed -- check server logs`, '', '#command-centre/meetings', false);
      }
    }
  } catch (e) {
    log('warn', 'GranolaSync', 'Failed to create notification', { error: e.message });
  }

  log('info', 'GranolaSync', 'Complete', { imported, skipped: noteStubs.length - notes.length - failedNotes.length, failed: failedNotes.length + failedInserts.length, durationMs });

  return { imported, failed: failedNotes.length + failedInserts.length, durationMs };
}

module.exports = { matchWorkstream, matchCalendarEvent, transformNote, fetchWithRetry, fetchGranolaNotes, fetchNoteDetail, syncGranolaMeetings };
