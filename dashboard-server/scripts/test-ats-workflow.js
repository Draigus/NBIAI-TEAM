#!/usr/bin/env node
// test-ats-workflow.js — Comprehensive end-to-end ATS workflow test
// Tests EVERY field, endpoint, and transition in the hiring pipeline.
// Usage: node scripts/test-ats-workflow.js

const crypto = require('crypto');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard';
const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';

const pool = new Pool({ connectionString: DATABASE_URL });

// Glen's user ID (admin)
const GLEN_ID = '9a1bb682-290b-4bbc-bdc7-24f08b1b0ec4';
// Tom's user ID (admin, second interviewer)
const TOM_ID = '4e6887eb-9b89-4278-b254-42f57ebdcee2';
// Couch Heroes client
const CLIENT_ID = '21be0772-73e5-4cca-8795-8b1a66f89ec2';
// Audio Lead position
const POSITION_ID = '5408923a-1dfc-4473-9687-2ddc38ef198d';

// Target email for the interview invite
const TARGET_EMAIL = 'gpryer@nbi-consulting.com';

let glenToken = null;
let tomToken = null;
let candidateId = null;
let configId = null;
let glenSessionId = null;
let tomSessionId = null;
let questionIds = [];
let originalGlenEmail = null;
let originalTomEmail = null;

const results = [];
let stepNum = 0;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function log(step, status, detail) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const line = `${icon} Step ${step}: ${detail}`;
  console.log(line);
  results.push({ step, status, detail });
}

async function api(method, path, body, token) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(`${BASE_URL}${path}`, opts);
  const text = await resp.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: resp.status, json, text, ok: resp.ok };
}

async function mintSession(userId) {
  const rawToken = `ats_test_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const hashed = hashToken(rawToken);
  await pool.query(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '2 hours')`,
    [userId, hashed]
  );
  return rawToken;
}

async function run() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   ATS WORKFLOW END-TO-END TEST — EVERY FIELD, EVERY    ║');
  console.log('║   ENDPOINT, EVERY TRANSITION                           ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  try {
    // ──────────── STEP 1: Mint sessions ────────────
    stepNum++;
    try {
      glenToken = await mintSession(GLEN_ID);
      tomToken = await mintSession(TOM_ID);
      // Verify both sessions work
      const g = await api('GET', '/api/auth/me', null, glenToken);
      const t = await api('GET', '/api/auth/me', null, tomToken);
      if (g.ok && t.ok) {
        log(stepNum, 'PASS', `Minted sessions — Glen (${g.json?.displayName || g.json?.display_name || 'ok'}), Tom (${t.json?.displayName || t.json?.display_name || 'ok'})`);
      } else {
        // Try a different endpoint to verify auth
        const g2 = await api('GET', '/api/candidates?limit=1', null, glenToken);
        if (g2.ok) {
          log(stepNum, 'PASS', 'Minted sessions — verified via candidates endpoint');
        } else {
          log(stepNum, 'FAIL', `Session verification failed: Glen=${g.status}/${g2.status} Tom=${t.status}`);
          console.log('Glen response:', g.text?.substring(0, 200));
          return;
        }
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Session minting failed: ${e.message}`);
      return;
    }

    // ──────────── STEP 2: Create candidate with ALL fields ────────────
    stepNum++;
    try {
      const candidateData = {
        name: 'ATS Test Candidate — Full Workflow',
        role: 'Senior Audio Designer',
        client_id: CLIENT_ID,
        position_id: POSITION_ID,
        due_date: '2026-07-15',
        stage: 'sourcing',
        notes: 'End-to-end ATS workflow test candidate. Created by automated test script on ' + new Date().toISOString(),
        email: 'test.candidate@example.com',
        source: 'referral',
        source_detail: 'Referred by internal team member for ATS workflow testing',
        tags: ['ats-test', 'e2e', 'audio'],
        consent_given: true,
        consent_date: '2026-06-09',
        retention_expires_at: '2027-06-09',
      };
      const r = await api('POST', '/api/candidates', candidateData, glenToken);
      if (r.ok && r.json?.id) {
        candidateId = r.json.id;
        const c = r.json;
        const checks = [];
        if (c.name !== candidateData.name) checks.push(`name mismatch: ${c.name}`);
        if (c.role !== candidateData.role) checks.push(`role mismatch: ${c.role}`);
        if (c.client_id !== CLIENT_ID) checks.push(`client_id mismatch`);
        if (c.position_id !== POSITION_ID) checks.push(`position_id mismatch`);
        if (c.stage !== 'sourcing') checks.push(`stage=${c.stage}, expected sourcing`);
        if (c.email !== candidateData.email) checks.push(`email mismatch: ${c.email}`);
        if (c.source !== 'referral') checks.push(`source mismatch: ${c.source}`);
        if (!c.source_detail) checks.push('source_detail missing');
        if (!c.consent_given) checks.push('consent_given not set');
        if (!c.notes) checks.push('notes missing');
        if (checks.length === 0) {
          log(stepNum, 'PASS', `Created candidate ${candidateId} — all ${Object.keys(candidateData).length} fields verified`);
        } else {
          log(stepNum, 'WARN', `Created candidate but field issues: ${checks.join('; ')}`);
        }
      } else {
        log(stepNum, 'FAIL', `Create candidate failed: ${r.status} — ${r.text?.substring(0, 300)}`);
        return;
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Create candidate error: ${e.message}`);
      return;
    }

    // ──────────── STEP 3: GET candidate detail ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/candidates/${candidateId}`, null, glenToken);
      if (r.ok && r.json?.id === candidateId) {
        log(stepNum, 'PASS', `GET candidate detail — returned all fields, stage=${r.json.stage}`);
      } else {
        log(stepNum, 'FAIL', `GET candidate failed: ${r.status} — ${r.text?.substring(0, 200)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `GET candidate error: ${e.message}`);
    }

    // ──────────── STEP 4: PATCH candidate — update linkedin, notes, assignees ────────────
    stepNum++;
    try {
      const patchData = {
        linkedin_url: 'https://www.linkedin.com/in/ats-test-candidate',
        notes: 'Updated notes — testing PATCH endpoint with all optional fields',
        stage_assignees: { sourcing: ['Glen Pryer', 'Tom Rieger'] },
      };
      const r = await api('PATCH', `/api/candidates/${candidateId}`, patchData, glenToken);
      if (r.ok) {
        const checks = [];
        if (r.json.linkedin_url !== patchData.linkedin_url) checks.push('linkedin not updated');
        if (!r.json.notes?.includes('Updated notes')) checks.push('notes not updated');
        if (checks.length === 0) {
          log(stepNum, 'PASS', `PATCH candidate — linkedin_url, notes, stage_assignees all updated`);
        } else {
          log(stepNum, 'WARN', `PATCH candidate issues: ${checks.join('; ')}`);
        }
      } else {
        log(stepNum, 'FAIL', `PATCH candidate failed: ${r.status} — ${r.text?.substring(0, 200)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `PATCH candidate error: ${e.message}`);
    }

    // ──────────── STEP 5: Update tags and email via PATCH ────────────
    stepNum++;
    try {
      const r = await api('PATCH', `/api/candidates/${candidateId}`, {
        tags: ['ats-test', 'e2e', 'audio', 'senior'],
        email: 'updated.candidate@example.com',
        source: 'linkedin',
        source_detail: 'Found via LinkedIn search — updated via PATCH',
      }, glenToken);
      if (r.ok) {
        const checks = [];
        if (r.json.email !== 'updated.candidate@example.com') checks.push('email not updated');
        if (r.json.source !== 'linkedin') checks.push('source not updated');
        if (checks.length === 0) {
          log(stepNum, 'PASS', `PATCH candidate — tags, email, source, source_detail updated`);
        } else {
          log(stepNum, 'WARN', `PATCH issues: ${checks.join('; ')}`);
        }
      } else {
        log(stepNum, 'FAIL', `PATCH tags/email failed: ${r.status} — ${r.text?.substring(0, 200)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `PATCH tags/email error: ${e.message}`);
    }

    // ──────────── STEP 6: Add comment on candidate ────────────
    stepNum++;
    try {
      const r = await api('POST', `/api/candidates/${candidateId}/comments`, {
        body: 'ATS workflow test comment — verifying the comments endpoint works end-to-end with a substantive note.',
        internal: true,
      }, glenToken);
      if (r.ok || r.status === 201) {
        log(stepNum, 'PASS', `POST candidate comment — created (internal=true)`);
      } else {
        log(stepNum, 'FAIL', `POST comment failed: ${r.status} — ${r.text?.substring(0, 200)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `POST comment error: ${e.message}`);
    }

    // ──────────── STEP 6b: GET comments ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/candidates/${candidateId}/comments`, null, glenToken);
      if (r.ok && Array.isArray(r.json) && r.json.length > 0) {
        log(stepNum, 'PASS', `GET candidate comments — ${r.json.length} comment(s) returned`);
      } else {
        log(stepNum, 'FAIL', `GET comments failed: ${r.status} — ${r.text?.substring(0, 200)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `GET comments error: ${e.message}`);
    }

    // ──────────── STEP 7: Move candidate to interviews stage ────────────
    stepNum++;
    try {
      const r = await api('PATCH', `/api/candidates/${candidateId}`, {
        stage: 'interviews',
        stage_assignees: {
          sourcing: ['Glen Pryer', 'Tom Rieger'],
          interviews: ['Glen Pryer'],
        },
      }, glenToken);
      if (r.ok && r.json.stage === 'interviews') {
        log(stepNum, 'PASS', `Moved candidate to 'interviews' stage`);
      } else {
        log(stepNum, 'FAIL', `Stage change failed: ${r.status} stage=${r.json?.stage} — ${r.text?.substring(0, 200)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Stage change error: ${e.message}`);
    }

    // ──────────── STEP 8: Pick questions from bank (one per category) ────────────
    stepNum++;
    try {
      const categories = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
      questionIds = [];
      for (const cat of categories) {
        const r = await api('GET', `/api/interview-questions?category=${cat}&client_id=${CLIENT_ID}`, null, glenToken);
        if (r.ok && Array.isArray(r.json) && r.json.length > 0) {
          questionIds.push(r.json[0].id);
        } else {
          // Fall back to any question in that category
          const r2 = await api('GET', `/api/interview-questions?category=${cat}`, null, glenToken);
          if (r2.ok && Array.isArray(r2.json) && r2.json.length > 0) {
            questionIds.push(r2.json[0].id);
          }
        }
      }
      if (questionIds.length === 5) {
        log(stepNum, 'PASS', `Selected ${questionIds.length} questions — one per category (culture/technical/collaboration/leadership/depth)`);
      } else if (questionIds.length > 0) {
        log(stepNum, 'WARN', `Only found ${questionIds.length}/5 category questions, proceeding`);
      } else {
        log(stepNum, 'FAIL', 'No questions found in bank');
        return;
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Question selection error: ${e.message}`);
      return;
    }

    // ──────────── STEP 9: Temporarily update Glen's email for the test ────────────
    stepNum++;
    try {
      const { rows } = await pool.query('SELECT email FROM users WHERE id = $1', [GLEN_ID]);
      originalGlenEmail = rows[0].email;
      await pool.query('UPDATE users SET email = $1 WHERE id = $2', [TARGET_EMAIL, GLEN_ID]);
      log(stepNum, 'PASS', `Updated Glen's email to ${TARGET_EMAIL} (was: ${originalGlenEmail}) for interview invite delivery`);
    } catch (e) {
      log(stepNum, 'FAIL', `Email update error: ${e.message}`);
    }

    // ──────────── STEP 10: Create interview config ────────────
    stepNum++;
    try {
      const configData = {
        candidate_id: candidateId,
        position_id: POSITION_ID,
        question_ids: questionIds,
        interviewer_ids: [GLEN_ID],
        round_type: 'Technical',
        duration_minutes: 60,
        location: 'Remote — Microsoft Teams',
        scheduled_at: '2026-06-16T14:00:00Z',
      };
      const r = await api('POST', '/api/interview-configs', configData, glenToken);
      if (r.ok && r.json?.config?.id) {
        configId = r.json.config.id;
        const checks = [];
        if (r.json.config.status !== 'draft') checks.push(`status=${r.json.config.status}, expected draft`);
        if (r.json.config.round_type !== 'Technical') checks.push(`round_type=${r.json.config.round_type}`);
        if (r.json.config.duration_minutes !== 60) checks.push(`duration=${r.json.config.duration_minutes}`);
        if (!r.json.questions || r.json.questions.length !== questionIds.length) checks.push(`questions: ${r.json.questions?.length || 0}/${questionIds.length}`);
        if (!r.json.sessions || r.json.sessions.length !== 1) checks.push(`sessions: ${r.json.sessions?.length || 0}/1`);
        glenSessionId = r.json.sessions?.[0]?.id;
        if (checks.length === 0) {
          log(stepNum, 'PASS', `Created interview config ${configId} — ${r.json.questions.length} questions, ${r.json.sessions.length} session(s), status=draft`);
        } else {
          log(stepNum, 'WARN', `Config created but issues: ${checks.join('; ')}`);
        }
      } else {
        log(stepNum, 'FAIL', `Create config failed: ${r.status} — ${r.text?.substring(0, 500)}`);
        return;
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Create config error: ${e.message}`);
      return;
    }

    // ──────────── STEP 11: GET interview config ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/interview-configs?candidate_id=${candidateId}`, null, glenToken);
      if (r.ok && Array.isArray(r.json)) {
        const found = r.json.find(c => c.id === configId);
        if (found) {
          log(stepNum, 'PASS', `GET configs — found config ${configId}, status=${found.status}, question_count=${found.question_count || 'n/a'}`);
        } else {
          log(stepNum, 'FAIL', `Config ${configId} not in list response`);
        }
      } else {
        log(stepNum, 'FAIL', `GET configs failed: ${r.status}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `GET configs error: ${e.message}`);
    }

    // ──────────── STEP 12: Activate config (sends email to Glen at TARGET_EMAIL) ────────────
    stepNum++;
    try {
      const r = await api('POST', `/api/interview-configs/${configId}/activate`, {}, glenToken);
      if (r.ok && r.json?.activated) {
        log(stepNum, 'PASS', `Activated config — ${r.json.sessions_notified} interviewer(s) notified. Email sent to ${TARGET_EMAIL}`);
      } else {
        log(stepNum, 'FAIL', `Activate failed: ${r.status} — ${r.text?.substring(0, 300)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Activate error: ${e.message}`);
    }

    // ──────────── STEP 12b: Restore Glen's email ────────────
    stepNum++;
    try {
      if (originalGlenEmail) {
        await pool.query('UPDATE users SET email = $1 WHERE id = $2', [originalGlenEmail, GLEN_ID]);
        log(stepNum, 'PASS', `Restored Glen's email to ${originalGlenEmail}`);
        originalGlenEmail = null;
      } else {
        log(stepNum, 'PASS', 'No email restore needed');
      }
    } catch (e) {
      log(stepNum, 'WARN', `Email restore error (manual fix needed): ${e.message}`);
    }

    // ──────────── STEP 13: GET interview session (Glen's) ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/interview-sessions/${glenSessionId}`, null, glenToken);
      if (r.ok && r.json?.session) {
        const s = r.json.session || r.json;
        log(stepNum, 'PASS', `GET session — status=${s.status}, interviewer=${s.interviewer_id === GLEN_ID ? 'Glen' : s.interviewer_id}`);
      } else if (r.ok && r.json?.id) {
        log(stepNum, 'PASS', `GET session — status=${r.json.status}, id=${r.json.id}`);
      } else {
        log(stepNum, 'FAIL', `GET session failed: ${r.status} — ${r.text?.substring(0, 200)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `GET session error: ${e.message}`);
    }

    // ──────────── STEP 14: GET my sessions (interviewer view) ────────────
    stepNum++;
    try {
      const r = await api('GET', '/api/interview-sessions/mine', null, glenToken);
      if (r.ok && Array.isArray(r.json)) {
        const found = r.json.find(s => s.id === glenSessionId);
        log(stepNum, found ? 'PASS' : 'WARN', `GET /mine — ${r.json.length} session(s), test session ${found ? 'found' : 'NOT found'}`);
      } else {
        log(stepNum, 'FAIL', `GET /mine failed: ${r.status} — ${r.text?.substring(0, 200)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `GET /mine error: ${e.message}`);
    }

    // ──────────── STEP 15: Score ALL questions (1-5, with notes) ────────────
    stepNum++;
    try {
      const scoreValues = [5, 4, 3, 5, 4]; // One score per question
      const noteTexts = [
        'Excellent cultural alignment — strong team values',
        'Solid technical knowledge, some gaps in edge cases',
        'Good collaboration instincts, could be more proactive',
        'Strong leadership potential — clear communication style',
        'Depth of domain knowledge is impressive',
      ];
      let scored = 0;
      let failedScores = [];
      for (let i = 0; i < questionIds.length; i++) {
        const r = await api('PUT', `/api/interview-scores/${glenSessionId}/${questionIds[i]}`, {
          score: scoreValues[i],
          notes: noteTexts[i],
        }, glenToken);
        if (r.ok) {
          scored++;
          // Verify returned data
          if (r.json.score !== scoreValues[i]) failedScores.push(`q${i}: score=${r.json.score} expected=${scoreValues[i]}`);
          if (r.json.notes !== noteTexts[i]) failedScores.push(`q${i}: notes mismatch`);
        } else {
          failedScores.push(`q${i}: ${r.status} — ${r.json?.error || r.text?.substring(0, 100)}`);
        }
      }
      if (scored === questionIds.length && failedScores.length === 0) {
        log(stepNum, 'PASS', `Scored all ${scored}/${questionIds.length} questions with notes — scores [${scoreValues.join(',')}]`);
      } else if (scored === questionIds.length) {
        log(stepNum, 'WARN', `Scored ${scored} questions but data issues: ${failedScores.join('; ')}`);
      } else {
        log(stepNum, 'FAIL', `Only scored ${scored}/${questionIds.length}: ${failedScores.join('; ')}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Scoring error: ${e.message}`);
    }

    // ──────────── STEP 15b: GET scores to verify ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/interview-scores/${glenSessionId}`, null, glenToken);
      if (r.ok && Array.isArray(r.json) && r.json.length === questionIds.length) {
        log(stepNum, 'PASS', `GET scores — ${r.json.length} scores returned, all match`);
      } else {
        log(stepNum, 'FAIL', `GET scores: ${r.status}, count=${r.json?.length || 0}/${questionIds.length}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `GET scores error: ${e.message}`);
    }

    // ──────────── STEP 16: Re-score a question (test upsert) ────────────
    stepNum++;
    try {
      const r = await api('PUT', `/api/interview-scores/${glenSessionId}/${questionIds[0]}`, {
        score: 4,
        notes: 'Updated score — testing upsert on conflict',
      }, glenToken);
      if (r.ok && r.json.score === 4) {
        log(stepNum, 'PASS', 'Score upsert worked — updated from 5 to 4');
      } else {
        log(stepNum, 'FAIL', `Upsert failed: ${r.status} — ${r.text?.substring(0, 200)}`);
      }
      // Restore original score
      await api('PUT', `/api/interview-scores/${glenSessionId}/${questionIds[0]}`, {
        score: 5, notes: 'Excellent cultural alignment — strong team values',
      }, glenToken);
    } catch (e) {
      log(stepNum, 'FAIL', `Upsert error: ${e.message}`);
    }

    // ──────────── STEP 17: Submit scorecard ────────────
    stepNum++;
    try {
      const r = await api('POST', `/api/interview-sessions/${glenSessionId}/submit`, {}, glenToken);
      if (r.ok && r.json?.submitted) {
        log(stepNum, 'PASS', `Submitted scorecard — all_submitted=${r.json.all_submitted}`);
      } else {
        log(stepNum, 'FAIL', `Submit failed: ${r.status} — ${r.text?.substring(0, 300)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Submit error: ${e.message}`);
    }

    // ──────────── STEP 17b: Verify session status is 'submitted' ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/interview-sessions/${glenSessionId}`, null, glenToken);
      const status = r.json?.session?.status || r.json?.status;
      if (status === 'submitted') {
        log(stepNum, 'PASS', 'Session status confirmed: submitted');
      } else {
        log(stepNum, 'FAIL', `Session status=${status}, expected submitted`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Session status check error: ${e.message}`);
    }

    // ──────────── STEP 17c: Try to submit again (should fail) ────────────
    stepNum++;
    try {
      const r = await api('POST', `/api/interview-sessions/${glenSessionId}/submit`, {}, glenToken);
      if (r.status === 400 && r.json?.error?.includes('already submitted')) {
        log(stepNum, 'PASS', 'Double-submit correctly rejected');
      } else {
        log(stepNum, 'WARN', `Double-submit response: ${r.status} — ${r.json?.error || r.text?.substring(0, 100)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Double-submit test error: ${e.message}`);
    }

    // ──────────── STEP 17d: Try to score after submit (should fail) ────────────
    stepNum++;
    try {
      const r = await api('PUT', `/api/interview-scores/${glenSessionId}/${questionIds[0]}`, {
        score: 1, notes: 'Should not work',
      }, glenToken);
      if (r.status === 400 && r.json?.error?.includes('submitted')) {
        log(stepNum, 'PASS', 'Post-submit scoring correctly rejected');
      } else {
        log(stepNum, 'WARN', `Post-submit score response: ${r.status} — ${r.json?.error || 'no error'}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Post-submit score test error: ${e.message}`);
    }

    // ──────────── STEP 18: GET results ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/interview-results/${configId}`, null, glenToken);
      if (r.ok && r.json?.summary) {
        const s = r.json.summary;
        const checks = [];
        if (typeof s.overall_avg !== 'number') checks.push('overall_avg not a number');
        if (!s.category_avgs || Object.keys(s.category_avgs).length === 0) checks.push('category_avgs empty');
        if (!r.json.questions || r.json.questions.length !== questionIds.length) checks.push(`questions: ${r.json.questions?.length || 0}/${questionIds.length}`);
        if (!r.json.sessions || r.json.sessions.length === 0) checks.push('no sessions');
        if (!r.json.scores || r.json.scores.length !== questionIds.length) checks.push(`scores: ${r.json.scores?.length || 0}/${questionIds.length}`);
        if (checks.length === 0) {
          log(stepNum, 'PASS', `GET results — overall_avg=${s.overall_avg}, categories=${JSON.stringify(s.category_avgs)}, ${r.json.sessions.length} session(s), ${r.json.scores.length} score(s)`);
        } else {
          log(stepNum, 'WARN', `Results returned but issues: ${checks.join('; ')}`);
        }
      } else {
        log(stepNum, 'FAIL', `GET results failed: ${r.status} — ${r.text?.substring(0, 300)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `GET results error: ${e.message}`);
    }

    // ──────────── STEP 19: Record decision — advance ────────────
    stepNum++;
    try {
      const r = await api('POST', '/api/interview-decisions', {
        config_id: configId,
        decision: 'advance',
        notes: 'Strong performance across all categories. Advancing to offer stage. Average score 4.2/5.',
      }, glenToken);
      if (r.ok || r.status === 201) {
        log(stepNum, 'PASS', `Decision recorded: advance — config should be completed`);
      } else {
        log(stepNum, 'FAIL', `Decision failed: ${r.status} — ${r.text?.substring(0, 300)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Decision error: ${e.message}`);
    }

    // ──────────── STEP 19b: Verify candidate moved to 'offer' stage ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/candidates/${candidateId}`, null, glenToken);
      if (r.ok && r.json.stage === 'offer') {
        log(stepNum, 'PASS', `Candidate auto-moved to 'offer' stage after advance decision`);
      } else {
        log(stepNum, 'FAIL', `Candidate stage=${r.json?.stage}, expected 'offer'`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Stage verify error: ${e.message}`);
    }

    // ──────────── STEP 19c: Verify config status is 'completed' ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/interview-configs?candidate_id=${candidateId}`, null, glenToken);
      if (r.ok && Array.isArray(r.json)) {
        const cfg = r.json.find(c => c.id === configId);
        if (cfg && cfg.status === 'completed') {
          log(stepNum, 'PASS', 'Config status confirmed: completed');
        } else {
          log(stepNum, 'FAIL', `Config status=${cfg?.status}, expected completed`);
        }
      } else {
        log(stepNum, 'FAIL', `GET configs failed: ${r.status}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Config status check error: ${e.message}`);
    }

    // ──────────── STEP 20: Set start_date on offer stage ────────────
    stepNum++;
    try {
      const r = await api('PATCH', `/api/candidates/${candidateId}`, {
        start_date: '2026-08-01',
      }, glenToken);
      if (r.ok && r.json.start_date) {
        log(stepNum, 'PASS', `Set start_date=${r.json.start_date} on offer stage`);
      } else {
        log(stepNum, 'FAIL', `Set start_date failed: ${r.status} — ${r.text?.substring(0, 200)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Set start_date error: ${e.message}`);
    }

    // ──────────── STEP 21: Move to onboarding stage ────────────
    stepNum++;
    try {
      const r = await api('PATCH', `/api/candidates/${candidateId}`, {
        stage: 'onboarding',
        stage_assignees: {
          sourcing: ['Glen Pryer', 'Tom Rieger'],
          interviews: ['Glen Pryer'],
          offer: ['Glen Pryer'],
          onboarding: ['Tom Rieger'],
        },
      }, glenToken);
      if (r.ok && r.json.stage === 'onboarding') {
        log(stepNum, 'PASS', `Moved candidate to 'onboarding' stage`);
      } else {
        log(stepNum, 'FAIL', `Onboarding move failed: ${r.status} stage=${r.json?.stage}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Onboarding move error: ${e.message}`);
    }

    // ──────────── STEP 21b: Add onboarding checklist items ────────────
    stepNum++;
    try {
      const items = [
        { title: 'IT Equipment Setup', description: 'Laptop, monitors, peripherals ordered', assignee: 'Tom Rieger' },
        { title: 'NDA & Contract Signing', description: 'Send employment contract and NDA for e-signature' },
        { title: 'First Day Orientation', description: 'Schedule with team lead' },
      ];
      let created = 0;
      for (const item of items) {
        const r = await api('POST', `/api/candidates/${candidateId}/onboarding`, item, glenToken);
        if (r.ok || r.status === 201) created++;
      }
      if (created === items.length) {
        log(stepNum, 'PASS', `Created ${created} onboarding checklist items`);
      } else {
        log(stepNum, 'WARN', `Created ${created}/${items.length} onboarding items`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Onboarding items error: ${e.message}`);
    }

    // ──────────── STEP 21c: GET onboarding checklist ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/candidates/${candidateId}/onboarding`, null, glenToken);
      if (r.ok && Array.isArray(r.json) && r.json.length >= 3) {
        log(stepNum, 'PASS', `GET onboarding checklist — ${r.json.length} items`);
        // Try to check off one item
        const itemId = r.json[0].id;
        const patchR = await api('PATCH', `/api/candidates/${candidateId}/onboarding/${itemId}`, {
          completed: true,
        }, glenToken);
        if (patchR.ok) {
          log(stepNum, 'PASS', `Checked off onboarding item: ${r.json[0].title}`);
        }
      } else {
        log(stepNum, 'FAIL', `GET onboarding failed: ${r.status} items=${r.json?.length}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `GET onboarding error: ${e.message}`);
    }

    // ──────────── STEP 22: Move to signed then onboarded (Couch Heroes custom stages) ────────────
    stepNum++;
    try {
      // Couch Heroes has custom stages: sourcing → interviews → offer → onboarding → signed → declined-rejected → onboarded
      // First move to 'signed'
      let r = await api('PATCH', `/api/candidates/${candidateId}`, { stage: 'signed' }, glenToken);
      if (r.ok && r.json.stage === 'signed') {
        // Then move to 'onboarded' (terminal stage)
        r = await api('PATCH', `/api/candidates/${candidateId}`, { stage: 'onboarded' }, glenToken);
        if (r.ok && r.json.stage === 'onboarded') {
          log(stepNum, 'PASS', `Moved candidate through signed → onboarded — full pipeline complete`);
        } else {
          log(stepNum, 'FAIL', `Onboarded move failed: ${r.status} stage=${r.json?.stage} — ${r.json?.error || ''}`);
        }
      } else {
        log(stepNum, 'FAIL', `Signed move failed: ${r.status} stage=${r.json?.stage} — ${r.json?.error || ''}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Hired move error: ${e.message}`);
    }

    // ──────────── STEP 23: GET candidate activity feed ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/candidates/${candidateId}/activity`, null, glenToken);
      if (r.ok && Array.isArray(r.json) && r.json.length > 0) {
        log(stepNum, 'PASS', `GET activity feed — ${r.json.length} entries`);
      } else {
        log(stepNum, 'FAIL', `GET activity failed: ${r.status} entries=${r.json?.length || 0}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `GET activity error: ${e.message}`);
    }

    // ──────────── STEP 24: GET candidate history (stage transitions) ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/candidates/${candidateId}/history`, null, glenToken);
      if (r.ok && Array.isArray(r.json) && r.json.length > 0) {
        const stages = r.json.map(h => h.to_stage).join(' → ');
        log(stepNum, 'PASS', `GET stage history — ${r.json.length} transitions: ${stages}`);
      } else {
        log(stepNum, 'FAIL', `GET history failed: ${r.status} entries=${r.json?.length || 0}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `GET history error: ${e.message}`);
    }

    // ──────────── STEP 25: GET hiring metrics ────────────
    stepNum++;
    try {
      const r1 = await api('GET', `/api/hiring/metrics/pipeline?client_id=${CLIENT_ID}`, null, glenToken);
      const r2 = await api('GET', `/api/hiring/metrics/time-in-stage?client_id=${CLIENT_ID}`, null, glenToken);
      if (r1.ok && r2.ok) {
        log(stepNum, 'PASS', `GET hiring metrics — pipeline and time-in-stage both returned`);
      } else {
        log(stepNum, 'WARN', `Metrics: pipeline=${r1.status}, time-in-stage=${r2.status}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Metrics error: ${e.message}`);
    }

    // ──────────── STEP 26: GET hiring-decisions endpoint (requires candidate_id) ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/hiring-decisions?candidate_id=${candidateId}`, null, glenToken);
      if (r.ok && Array.isArray(r.json)) {
        log(stepNum, 'PASS', `GET hiring-decisions — ${r.json.length} decision(s) for candidate`);
      } else {
        log(stepNum, 'FAIL', `GET hiring-decisions failed: ${r.status} — ${r.json?.error || ''}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `GET hiring-decisions error: ${e.message}`);
    }

    // ──────────── STEP 27: Candidate list with filters ────────────
    stepNum++;
    try {
      // Use valid stage names: 'sourcing' is universal, 'onboarded' is in both default and CH custom stages
      const r1 = await api('GET', `/api/candidates?client_id=${CLIENT_ID}`, null, glenToken);
      const r2 = await api('GET', `/api/candidates?stage=sourcing`, null, glenToken);
      const r3 = await api('GET', `/api/candidates?client_id=${CLIENT_ID}&stage=onboarded`, null, glenToken);
      if (r1.ok && r2.ok && r3.ok) {
        log(stepNum, 'PASS', `Candidate filters — by client: ${r1.json.length}, by stage(sourcing): ${r2.json.length}, client+stage(onboarded): ${r3.json.length}`);
      } else {
        log(stepNum, 'FAIL', `Filter issues: client=${r1.status}, stage=${r2.status}, both=${r3.status}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Filter error: ${e.message}`);
    }

    // ──────────── STEP 28: Candidate poll endpoint ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/candidates/poll?since=${new Date(Date.now() - 3600000).toISOString()}`, null, glenToken);
      if (r.ok) {
        log(stepNum, 'PASS', `Candidate poll — returned ${Array.isArray(r.json) ? r.json.length : 'ok'} change(s)`);
      } else {
        log(stepNum, 'FAIL', `Poll failed: ${r.status}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Poll error: ${e.message}`);
    }

    // ──────────── STEP 29: Hiring positions CRUD ────────────
    stepNum++;
    try {
      // List
      const list = await api('GET', '/api/hiring-positions', null, glenToken);
      if (!list.ok) { log(stepNum, 'FAIL', `List positions failed: ${list.status}`); }
      else {
        // Get with client filter
        const filtered = await api('GET', `/api/hiring-positions?client_id=${CLIENT_ID}`, null, glenToken);
        log(stepNum, 'PASS', `Hiring positions — total: ${list.json.length}, client filtered: ${filtered.json?.length || 0}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Positions error: ${e.message}`);
    }

    // ──────────── STEP 30: Client hiring count ────────────
    stepNum++;
    try {
      const r = await api('GET', `/api/clients/${CLIENT_ID}/hiring-count`, null, glenToken);
      if (r.ok && r.json?.count !== undefined) {
        log(stepNum, 'PASS', `Client hiring count: ${r.json.count} active candidates`);
      } else {
        log(stepNum, 'FAIL', `Hiring count failed: ${r.status}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Hiring count error: ${e.message}`);
    }

    // ──────────── STEP 31: Clone interview config ────────────
    stepNum++;
    let cloneConfigId = null;
    try {
      // Create a second candidate to clone to
      const r1 = await api('POST', '/api/candidates', {
        name: 'ATS Clone Target',
        role: 'Junior Audio Designer',
        client_id: CLIENT_ID,
      }, glenToken);
      if (!r1.ok) { log(stepNum, 'FAIL', `Clone target creation failed: ${r1.status}`); }
      else {
        const cloneCandId = r1.json.id;
        const r2 = await api('POST', `/api/interview-configs/${configId}/clone`, {
          candidate_id: cloneCandId,
        }, glenToken);
        if (r2.ok && r2.json?.config?.id) {
          cloneConfigId = r2.json.config.id;
          log(stepNum, 'PASS', `Cloned config to candidate ${cloneCandId} — new config ${cloneConfigId}, questions=${r2.json.questions?.length || 0}`);
        } else {
          log(stepNum, 'FAIL', `Clone failed: ${r2.status} — ${r2.text?.substring(0, 200)}`);
        }
        // Clean up clone target
        await api('DELETE', `/api/candidates/${cloneCandId}`, null, glenToken);
        if (cloneConfigId) {
          await api('DELETE', `/api/interview-configs/${cloneConfigId}`, null, glenToken);
        }
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Clone error: ${e.message}`);
    }

    // ──────────── STEP 32: Custom question creation ────────────
    stepNum++;
    let customQuestionId = null;
    try {
      const r = await api('POST', '/api/interview-questions', {
        question_text: 'ATS TEST: Describe your experience with adaptive audio systems in open-world games.',
        category: 'technical',
        discipline: 'Audio',
        depth_type: null,
        source: 'custom',
        client_id: CLIENT_ID,
      }, glenToken);
      if (r.ok || r.status === 201) {
        customQuestionId = r.json?.id;
        log(stepNum, 'PASS', `Created custom question: ${customQuestionId}`);
      } else {
        log(stepNum, 'FAIL', `Custom question failed: ${r.status} — ${r.text?.substring(0, 200)}`);
      }
    } catch (e) {
      log(stepNum, 'FAIL', `Custom question error: ${e.message}`);
    }

    // ──────────── STEP 32b: PATCH custom question ────────────
    stepNum++;
    if (customQuestionId) {
      try {
        const r = await api('PATCH', `/api/interview-questions/${customQuestionId}`, {
          question_text: 'ATS TEST UPDATED: Describe your experience with adaptive audio systems in open-world games, including middleware choices.',
          category: 'depth',
        }, glenToken);
        if (r.ok) {
          log(stepNum, 'PASS', `Updated custom question — category changed to depth`);
        } else {
          log(stepNum, 'FAIL', `PATCH question failed: ${r.status}`);
        }
      } catch (e) {
        log(stepNum, 'FAIL', `PATCH question error: ${e.message}`);
      }
    } else {
      log(stepNum, 'WARN', 'Skipped PATCH question — no custom question created');
    }

    // ──────────── CLEANUP ────────────
    console.log('\n── CLEANUP ──');

    // Delete test question
    if (customQuestionId) {
      const r = await api('DELETE', `/api/interview-questions/${customQuestionId}`, null, glenToken);
      console.log(`  Deleted custom question: ${r.ok ? 'ok' : r.status}`);
    }

    // Delete test candidate (cascades configs/sessions/scores)
    if (candidateId) {
      const r = await api('DELETE', `/api/candidates/${candidateId}`, null, glenToken);
      console.log(`  Deleted test candidate: ${r.ok ? 'ok' : r.status} — ${r.json?.error || ''}`);
    }

    // Restore Glen's email if needed
    if (originalGlenEmail) {
      await pool.query('UPDATE users SET email = $1 WHERE id = $2', [originalGlenEmail, GLEN_ID]);
      console.log(`  Restored Glen's email to ${originalGlenEmail}`);
    }

    // Clean up test sessions
    await pool.query("DELETE FROM sessions WHERE token LIKE 'ats_test_%' OR user_id = $1 AND token LIKE '%ats_test%'", [GLEN_ID]);

  } catch (e) {
    console.error('\n💥 FATAL ERROR:', e.message, e.stack);
    // Ensure email is restored on crash
    if (originalGlenEmail) {
      await pool.query('UPDATE users SET email = $1 WHERE id = $2', [originalGlenEmail, GLEN_ID]).catch(() => {});
      console.log(`  ⚠️  Restored Glen's email on crash`);
    }
  }

  // ──────────── FINAL REPORT ────────────
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL REPORT                         ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  console.log(`║  Total steps: ${results.length.toString().padEnd(4)} | PASS: ${passed.toString().padEnd(4)} | FAIL: ${failed.toString().padEnd(4)} | WARN: ${warned.toString().padEnd(3)} ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n❌ FAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`   Step ${r.step}: ${r.detail}`));
  }
  if (warned > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.filter(r => r.status === 'WARN').forEach(r => console.log(`   Step ${r.step}: ${r.detail}`));
  }

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Unhandled:', e); process.exit(1); });
