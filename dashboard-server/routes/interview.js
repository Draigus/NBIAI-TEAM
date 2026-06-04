'use strict';

// routes/interview.js
// Interview Tool: question bank, configs, sessions, scoring, results & decisions.
// Tables: interview_question_bank, interview_configs, interview_config_questions,
//         interview_sessions, interview_scores, interview_decisions (migration 058).

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, requireAdmin, requireNBI, isValidUuid, auditLog } = ctx;

  // Email utilities and helpers — imported directly so server.js ctx does not need updating.
  const emailLib = require('../lib/email');
  const { escHtml } = require('../lib/helpers');
  const { buildEmailHtml, sendEmailAsync, APP_URL } = emailLib;

  let Anthropic;
  try { Anthropic = require('@anthropic-ai/sdk'); } catch (e) { /* optional: AI question generation disabled */ }
  const { buildGenerationPrompt } = require('../lib/interview-questions-prompt');

  const INTERVIEW_CATEGORIES = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
  const INTERVIEW_SOURCES = ['ai_generated', 'custom', 'curated'];
  const INTERVIEW_DEPTH_TYPES = ['code', 'art_style', 'narrative'];
  const INTERVIEW_CONFIG_STATUSES = ['draft', 'active', 'completed'];
  const INTERVIEW_DECISIONS = ['advance', 'reject', 'hold'];

  // ---------- Group 1: Question Bank CRUD ----------

  /** GET /api/interview-questions — List questions with optional filters */
  router.get('/api/interview-questions', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { client_id, discipline, category, position_title } = req.query;
    const where = [];
    const vals = [];
    let i = 1;
    if (client_id) {
      if (!isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
      where.push(`q.client_id = $${i++}`); vals.push(client_id);
    }
    if (discipline) {
      where.push(`q.discipline = $${i++}`); vals.push(discipline);
    }
    if (category) {
      if (!INTERVIEW_CATEGORIES.includes(category)) return res.status(400).json({ error: `Invalid category. Must be one of: ${INTERVIEW_CATEGORIES.join(', ')}` });
      where.push(`q.category = $${i++}`); vals.push(category);
    }
    if (position_title) {
      where.push(`q.position_titles @> ARRAY[$${i++}]`); vals.push(position_title);
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    try {
      const { rows } = await pool.query(`
        SELECT q.*, c.name AS client_name, u.display_name AS created_by_name
        FROM interview_question_bank q
        LEFT JOIN clients c ON q.client_id = c.id
        LEFT JOIN users u ON q.created_by = u.id
        ${whereClause}
        ORDER BY q.created_at DESC
      `, vals);
      res.json(rows);
    } catch (e) {
      log('error', 'Interview', 'Failed to list questions', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // ---------- Group 1b: Position Question Templates ----------

  /** GET /api/positions/:id/question-template — List template questions for a position */
  router.get('/api/positions/:id/question-template', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid position ID' });
    try {
      const { rows } = await pool.query(`
        SELECT q.question_text, q.category, q.discipline, q.source, q.depth_type,
               t.sort_order, t.position_id, t.question_id, t.added_at
        FROM position_question_templates t
        JOIN interview_question_bank q ON t.question_id = q.id
        WHERE t.position_id = $1
        ORDER BY t.sort_order ASC
      `, [req.params.id]);
      res.json(rows);
    } catch (e) {
      log('error', 'Interview', 'Failed to list position question template', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** POST /api/positions/:id/question-template/questions — Add a question to a position template */
  router.post('/api/positions/:id/question-template/questions', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid position ID' });
    const { question_id } = req.body || {};
    if (!question_id || !isValidUuid(question_id)) return res.status(400).json({ error: 'Valid question_id is required' });
    try {
      const { rows: sortRows } = await pool.query(
        `SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM position_question_templates WHERE position_id = $1`,
        [req.params.id]
      );
      const nextSort = sortRows[0].max_sort + 1;
      const { rows } = await pool.query(
        `INSERT INTO position_question_templates (position_id, question_id, sort_order, added_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [req.params.id, question_id, nextSort, req.user.id]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'Question already in template' });
      if (e.code === '23503') return res.status(404).json({ error: 'Position or question not found' });
      log('error', 'Interview', 'Failed to add question to template', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** DELETE /api/positions/:id/question-template/questions/:questionId — Remove a question from a position template */
  router.delete('/api/positions/:id/question-template/questions/:questionId', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid position ID' });
    if (!isValidUuid(req.params.questionId)) return res.status(400).json({ error: 'Invalid question ID' });
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM position_question_templates WHERE position_id = $1 AND question_id = $2`,
        [req.params.id, req.params.questionId]
      );
      if (rowCount === 0) return res.status(404).json({ error: 'Template entry not found' });
      res.json({ deleted: true });
    } catch (e) {
      log('error', 'Interview', 'Failed to remove question from template', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** POST /api/interview-questions/generate — AI-generate questions from JD */
  router.post('/api/interview-questions/generate', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!Anthropic || !process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI question generation not configured — set ANTHROPIC_API_KEY' });
    }
    const { position_id, client_id, discipline, seniority } = req.body || {};
    if (!discipline) return res.status(400).json({ error: 'discipline required' });

    try {
      let jdText = '';
      let clientName = '';
      if (position_id && isValidUuid(position_id)) {
        const { rows } = await pool.query(
          `SELECT hp.description, hp.title, c.name AS client_name
           FROM hiring_positions hp LEFT JOIN clients c ON hp.client_id = c.id
           WHERE hp.id = $1`, [position_id]
        );
        if (rows.length) {
          jdText = rows[0].description || '';
          clientName = rows[0].client_name || '';
        }
      }
      if (client_id && isValidUuid(client_id) && !clientName) {
        const { rows } = await pool.query('SELECT name FROM clients WHERE id = $1', [client_id]);
        if (rows.length) clientName = rows[0].name;
      }

      const prompt = buildGenerationPrompt({ jdText, clientName, discipline, seniority });
      const anthropicClient = new Anthropic.default();
      const message = await anthropicClient.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      });

      const text = message.content[0]?.text || '[]';
      let questions;
      try {
        questions = JSON.parse(text);
      } catch (parseErr) {
        const match = text.match(/\[[\s\S]*\]/);
        questions = match ? JSON.parse(match[0]) : [];
      }

      if (!Array.isArray(questions)) return res.status(500).json({ error: 'AI returned invalid format' });

      const inserted = [];
      for (const q of questions) {
        if (!q.question_text || !q.category) continue;
        const cat = q.category.toLowerCase();
        if (!INTERVIEW_CATEGORIES.includes(cat)) continue;
        const { rows } = await pool.query(
          `INSERT INTO interview_question_bank (client_id, discipline, category, question_text, depth_type, source, created_by)
           VALUES ($1, $2, $3, $4, $5, 'ai_generated', $6) RETURNING *`,
          [client_id || null, discipline, cat, q.question_text.trim(), q.depth_type || null, req.user.id]
        );
        inserted.push(rows[0]);
      }

      log('info', 'Interview', `AI generated ${inserted.length} questions for ${discipline} at ${clientName}`, {});
      res.status(201).json(inserted);
    } catch (e) {
      log('error', 'Interview', 'Failed to generate questions', { error: e.message });
      res.status(500).json({ error: 'Question generation failed: ' + e.message });
    }
  });

  /** POST /api/interview-questions — Create a question */
  router.post('/api/interview-questions', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { question_text, discipline, category, depth_type, source, client_id } = req.body;
    if (!question_text || !question_text.trim()) return res.status(400).json({ error: 'question_text is required' });
    if (!discipline || !discipline.trim()) return res.status(400).json({ error: 'discipline is required' });
    if (!category) return res.status(400).json({ error: 'category is required' });
    if (!INTERVIEW_CATEGORIES.includes(category)) return res.status(400).json({ error: `Invalid category. Must be one of: ${INTERVIEW_CATEGORIES.join(', ')}` });
    if (depth_type && !INTERVIEW_DEPTH_TYPES.includes(depth_type)) return res.status(400).json({ error: `Invalid depth_type. Must be one of: ${INTERVIEW_DEPTH_TYPES.join(', ')}` });
    if (source && !INTERVIEW_SOURCES.includes(source)) return res.status(400).json({ error: `Invalid source. Must be one of: ${INTERVIEW_SOURCES.join(', ')}` });
    if (client_id && !isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
    try {
      const { rows } = await pool.query(
        `INSERT INTO interview_question_bank (client_id, discipline, category, question_text, depth_type, source, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [client_id || null, discipline.trim(), category, question_text.trim(), depth_type || null, source || 'custom', req.user.id]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      log('error', 'Interview', 'Failed to create question', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** PATCH /api/interview-questions/:id — Update a question */
  router.patch('/api/interview-questions/:id', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid question ID' });
    const allowed = ['question_text', 'category', 'discipline', 'depth_type'];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'category' && !INTERVIEW_CATEGORIES.includes(req.body[key])) {
          return res.status(400).json({ error: `Invalid category. Must be one of: ${INTERVIEW_CATEGORIES.join(', ')}` });
        }
        if (key === 'depth_type' && req.body[key] && !INTERVIEW_DEPTH_TYPES.includes(req.body[key])) {
          return res.status(400).json({ error: `Invalid depth_type. Must be one of: ${INTERVIEW_DEPTH_TYPES.join(', ')}` });
        }
        sets.push(`${key} = $${i++}`);
        vals.push(key === 'depth_type' && !req.body[key] ? null : req.body[key]);
      }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    sets.push(`updated_at = NOW()`);
    vals.push(req.params.id);
    try {
      const { rows } = await pool.query(
        `UPDATE interview_question_bank SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        vals
      );
      if (!rows[0]) return res.status(404).json({ error: 'Question not found' });
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Interview', 'Failed to update question', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** DELETE /api/interview-questions/:id — Hard delete (admin only) */
  router.delete('/api/interview-questions/:id', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid question ID' });
    try {
      const { rowCount } = await pool.query('DELETE FROM interview_question_bank WHERE id = $1', [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Question not found' });
      res.json({ deleted: true });
    } catch (e) {
      log('error', 'Interview', 'Failed to delete question', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // ---------- Group 2: Interview Configs ----------

  /** GET /api/interview-configs — List configs with optional candidate_id filter and progress */
  router.get('/api/interview-configs', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { candidate_id } = req.query;
    const includeProgress = req.query.include === 'progress';
    const where = [];
    const vals = [];
    let i = 1;
    if (candidate_id) {
      if (!isValidUuid(candidate_id)) return res.status(400).json({ error: 'Invalid candidate_id' });
      where.push(`ic.candidate_id = $${i++}`); vals.push(candidate_id);
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    try {
      const { rows } = await pool.query(`
        SELECT ic.*, ca.name AS candidate_name, ca.role AS candidate_role,
               hp.title AS position_title, hp.client_id AS position_client_id,
               hp.discipline AS position_discipline,
               cl.name AS client_name, u.display_name AS created_by_name,
               (SELECT COUNT(*)::int FROM interview_config_questions cq WHERE cq.config_id = ic.id) AS question_count,
               (SELECT COUNT(*)::int FROM interview_sessions s WHERE s.config_id = ic.id) AS session_count
        FROM interview_configs ic
        LEFT JOIN candidates ca ON ic.candidate_id = ca.id
        LEFT JOIN hiring_positions hp ON ic.position_id = hp.id
        LEFT JOIN clients cl ON hp.client_id = cl.id
        LEFT JOIN users u ON ic.created_by = u.id
        ${whereClause}
        ORDER BY ic.round_number ASC NULLS LAST, ic.created_at ASC
      `, vals);

      if (includeProgress && rows.length > 0) {
        const configIds = rows.map(r => r.id);
        const { rows: sessRows } = await pool.query(`
          SELECT s.config_id, s.id AS session_id, s.status, s.interviewer_id,
                 u.display_name AS interviewer_name,
                 (SELECT COUNT(*)::int FROM interview_scores sc WHERE sc.session_id = s.id) AS scored_count
          FROM interview_sessions s
          LEFT JOIN users u ON s.interviewer_id = u.id
          WHERE s.config_id = ANY($1)
          ORDER BY s.config_id, s.id
        `, [configIds]);

        const { rows: scoreRows } = await pool.query(`
          SELECT s.config_id, AVG(sc.score)::numeric(3,1) AS avg_score
          FROM interview_scores sc
          JOIN interview_sessions s ON sc.session_id = s.id
          WHERE s.config_id = ANY($1)
          GROUP BY s.config_id
        `, [configIds]);

        const sessMap = {};
        for (const s of sessRows) {
          if (!sessMap[s.config_id]) sessMap[s.config_id] = [];
          sessMap[s.config_id].push(s);
        }
        const scoreMap = {};
        for (const s of scoreRows) scoreMap[s.config_id] = parseFloat(s.avg_score);

        for (const row of rows) {
          row.sessions = sessMap[row.id] || [];
          row.aggregate_score = scoreMap[row.id] || null;
        }
      }

      res.json(rows);
    } catch (e) {
      log('error', 'Interview', 'Failed to list configs', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  const ROUND_TYPES = ['Phone Screen', 'Technical', 'Cultural', 'Final', 'Other'];

  /** POST /api/interview-configs — Create a round (config + optional questions + sessions) */
  router.post('/api/interview-configs', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { candidate_id, position_id, question_ids, interviewer_ids, round_type, round_type_custom,
            scheduled_at, duration_minutes, location, interviewer_name } = req.body;

    if (!candidate_id || !isValidUuid(candidate_id)) return res.status(400).json({ error: 'Valid candidate_id is required' });
    if (position_id && !isValidUuid(position_id)) return res.status(400).json({ error: 'Invalid position_id' });

    const rt = round_type || 'Technical';
    if (!ROUND_TYPES.includes(rt)) return res.status(400).json({ error: `round_type must be one of: ${ROUND_TYPES.join(', ')}` });
    if (rt === 'Other' && (!round_type_custom || !round_type_custom.trim())) return res.status(400).json({ error: 'round_type_custom is required when round_type is Other' });
    if (rt === 'Other' && round_type_custom.trim().length > 40) return res.status(400).json({ error: 'round_type_custom must be 40 characters or fewer' });

    const isPhoneScreen = rt === 'Phone Screen';

    if (isPhoneScreen && interviewer_ids && interviewer_ids.length > 0) {
      return res.status(400).json({ error: 'Phone Screen does not support scored interviewers. Use interviewer_name instead.' });
    }

    if (!isPhoneScreen) {
      if (question_ids && !Array.isArray(question_ids)) return res.status(400).json({ error: 'question_ids must be an array' });
      if (interviewer_ids && !Array.isArray(interviewer_ids)) return res.status(400).json({ error: 'interviewer_ids must be an array' });
      if (question_ids) { for (const qid of question_ids) { if (!isValidUuid(qid)) return res.status(400).json({ error: `Invalid question_id: ${qid}` }); } }
      if (interviewer_ids) { for (const iid of interviewer_ids) { if (!isValidUuid(iid)) return res.status(400).json({ error: `Invalid interviewer_id: ${iid}` }); } }
    }

    if (duration_minutes !== undefined) {
      const dur = parseInt(duration_minutes);
      if (isNaN(dur) || dur < 5 || dur > 480) return res.status(400).json({ error: 'duration_minutes must be between 5 and 480' });
    }

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');

      await conn.query('SELECT id FROM candidates WHERE id = $1 FOR UPDATE', [candidate_id]);

      const { rows: rnRows } = await conn.query(
        'SELECT COALESCE(MAX(round_number), 0) AS max_rn FROM interview_configs WHERE candidate_id = $1',
        [candidate_id]
      );
      const nextRoundNumber = rnRows[0].max_rn + 1;

      let resolvedPositionId = position_id || null;
      if (!resolvedPositionId) {
        const { rows: candRows } = await conn.query('SELECT position_id FROM candidates WHERE id = $1', [candidate_id]);
        resolvedPositionId = candRows[0]?.position_id || null;
      }

      const configStatus = isPhoneScreen ? 'completed' : 'draft';

      const { rows: configRows } = await conn.query(
        `INSERT INTO interview_configs (candidate_id, position_id, created_by, status,
         round_type, round_type_custom, round_number, scheduled_at, duration_minutes, location, interviewer_name, outcome)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending') RETURNING *`,
        [candidate_id, resolvedPositionId, req.user.id, configStatus,
         rt, rt === 'Other' ? round_type_custom.trim() : null, nextRoundNumber,
         scheduled_at || null, duration_minutes || 60, location || null, interviewer_name || null]
      );
      const config = configRows[0];

      const questions = [];
      if (!isPhoneScreen && question_ids) {
        for (let idx = 0; idx < question_ids.length; idx++) {
          const { rows } = await conn.query(
            `INSERT INTO interview_config_questions (config_id, question_id, sort_order) VALUES ($1, $2, $3) RETURNING *`,
            [config.id, question_ids[idx], idx]
          );
          questions.push(rows[0]);
        }
      }

      const sessions = [];
      if (!isPhoneScreen && interviewer_ids) {
        for (const iid of interviewer_ids) {
          const { rows } = await conn.query(
            `INSERT INTO interview_sessions (config_id, interviewer_id, status) VALUES ($1, $2, 'assigned') RETURNING *`,
            [config.id, iid]
          );
          sessions.push(rows[0]);
        }
      }

      await conn.query('COMMIT');
      res.status(201).json({ config, questions, sessions });
    } catch (e) {
      await conn.query('ROLLBACK');
      log('error', 'Interview', 'Failed to create config', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    } finally {
      conn.release();
    }
  });

  /** POST /api/interview-configs/:id/activate — Activate config and notify interviewers */
  router.post('/api/interview-configs/:id/activate', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid config ID' });
    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      // Verify config exists and is draft
      const { rows: configRows } = await conn.query(
        `SELECT ic.*, ca.name AS candidate_name, ca.role AS candidate_role,
                hp.title AS position_title, cl.name AS client_name
         FROM interview_configs ic
         LEFT JOIN candidates ca ON ic.candidate_id = ca.id
         LEFT JOIN hiring_positions hp ON ic.position_id = hp.id
         LEFT JOIN clients cl ON hp.client_id = cl.id
         WHERE ic.id = $1`,
        [req.params.id]
      );
      if (!configRows[0]) { await conn.query('ROLLBACK'); return res.status(404).json({ error: 'Config not found' }); }
      const config = configRows[0];
      if (config.status !== 'draft') { await conn.query('ROLLBACK'); return res.status(400).json({ error: 'Config is not in draft status' }); }
      // Activate
      await conn.query(
        `UPDATE interview_configs SET status = 'active', updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );
      // Get question count
      const { rows: qCountRows } = await conn.query(
        `SELECT COUNT(*)::int AS count FROM interview_config_questions WHERE config_id = $1`,
        [req.params.id]
      );
      const questionCount = qCountRows[0].count;
      // Set notified_at on sessions and get interviewer details
      const { rows: sessions } = await conn.query(
        `UPDATE interview_sessions SET notified_at = NOW()
         WHERE config_id = $1 RETURNING *`,
        [req.params.id]
      );
      // Get interviewer details for emails
      const interviewerIds = sessions.map(s => s.interviewer_id);
      let interviewers = [];
      if (interviewerIds.length > 0) {
        const { rows } = await conn.query(
          `SELECT id, email, display_name FROM users WHERE id = ANY($1)`,
          [interviewerIds]
        );
        interviewers = rows;
      }
      // Get HM name (the creator)
      const { rows: hmRows } = await conn.query(
        `SELECT display_name FROM users WHERE id = $1`,
        [config.created_by]
      );
      const hmName = hmRows[0]?.display_name || 'Hiring Manager';
      await conn.query('COMMIT');
      // Send notification emails (fire and forget)
      for (const session of sessions) {
        const interviewer = interviewers.find(u => u.id === session.interviewer_id);
        if (!interviewer || !interviewer.email) continue;
        const link = `${APP_URL}/nbi_project_dashboard.html#interview/${session.id}`;
        const bodyHtml = `
          <p>Hi ${escHtml(interviewer.display_name || 'there')},</p>
          <p>You have been assigned to interview <strong>${escHtml(config.candidate_name || 'a candidate')}</strong>
          for the <strong>${escHtml(config.position_title || config.candidate_role || 'open role')}</strong>
          position${config.client_name ? ' at <strong>' + escHtml(config.client_name) + '</strong>' : ''}.</p>
          <p>There ${questionCount === 1 ? 'is <strong>1</strong> question' : 'are <strong>' + questionCount + '</strong> questions'} to score.</p>
          <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Open Scorecard</a></p>
          <p style="color:#64748b;font-size:13px">Assigned by ${escHtml(hmName)}.</p>
        `;
        sendEmailAsync({
          to: interviewer.email,
          subject: `Interview scorecard: ${config.candidate_name || 'Candidate'} — ${config.position_title || 'Role'}`,
          html: buildEmailHtml('Interview Assignment', bodyHtml),
        });
      }
      res.json({ activated: true, sessions_notified: sessions.length });
    } catch (e) {
      await conn.query('ROLLBACK');
      log('error', 'Interview', 'Failed to activate config', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    } finally {
      conn.release();
    }
  });

  /** POST /api/interview-configs/:id/clone — Clone question selection to a new candidate */
  router.post('/api/interview-configs/:id/clone', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid config ID' });
    const { candidate_id } = req.body;
    if (!candidate_id || !isValidUuid(candidate_id)) return res.status(400).json({ error: 'Valid candidate_id is required' });
    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      // Get original config
      const { rows: origRows } = await conn.query(
        `SELECT * FROM interview_configs WHERE id = $1`, [req.params.id]
      );
      if (!origRows[0]) { await conn.query('ROLLBACK'); return res.status(404).json({ error: 'Config not found' }); }
      const orig = origRows[0];
      // Auto-increment round_number for the target candidate
      const { rows: rnRows } = await conn.query(
        'SELECT COALESCE(MAX(round_number), 0) AS max_rn FROM interview_configs WHERE candidate_id = $1',
        [candidate_id]
      );
      // Create new config with round fields from original
      const { rows: newRows } = await conn.query(
        `INSERT INTO interview_configs (candidate_id, position_id, created_by, status,
         round_type, round_type_custom, round_number, duration_minutes)
         VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7) RETURNING *`,
        [candidate_id, orig.position_id, req.user.id,
         orig.round_type || 'Technical', orig.round_type_custom, rnRows[0].max_rn + 1,
         orig.duration_minutes || 60]
      );
      const newConfig = newRows[0];
      // Clone questions
      const { rows: origQs } = await conn.query(
        `SELECT question_id, sort_order FROM interview_config_questions WHERE config_id = $1 ORDER BY sort_order`,
        [req.params.id]
      );
      const questions = [];
      for (const oq of origQs) {
        const { rows } = await conn.query(
          `INSERT INTO interview_config_questions (config_id, question_id, sort_order)
           VALUES ($1, $2, $3) RETURNING *`,
          [newConfig.id, oq.question_id, oq.sort_order]
        );
        questions.push(rows[0]);
      }
      // Clone interviewer sessions
      const { rows: origSessions } = await conn.query(
        'SELECT interviewer_id FROM interview_sessions WHERE config_id = $1',
        [req.params.id]
      );
      const sessions = [];
      for (const os of origSessions) {
        const { rows } = await conn.query(
          `INSERT INTO interview_sessions (config_id, interviewer_id, status) VALUES ($1, $2, 'assigned') RETURNING *`,
          [newConfig.id, os.interviewer_id]
        );
        sessions.push(rows[0]);
      }
      await conn.query('COMMIT');
      res.status(201).json({ config: newConfig, questions, sessions });
    } catch (e) {
      await conn.query('ROLLBACK');
      log('error', 'Interview', 'Failed to clone config', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    } finally {
      conn.release();
    }
  });

  const ROUND_OUTCOMES = ['pending', 'passed', 'failed', 'rescheduled', 'no_show', 'cancelled'];

  /** PATCH /api/interview-configs/:id — Edit round schedule/outcome */
  router.patch('/api/interview-configs/:id', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid config ID' });

    const allowed = ['scheduled_at', 'duration_minutes', 'location', 'outcome', 'outcome_notes', 'interviewer_name'];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'outcome' && !ROUND_OUTCOMES.includes(req.body[key])) {
          return res.status(400).json({ error: `outcome must be one of: ${ROUND_OUTCOMES.join(', ')}` });
        }
        if (key === 'duration_minutes') {
          const dur = parseInt(req.body[key]);
          if (isNaN(dur) || dur < 5 || dur > 480) return res.status(400).json({ error: 'duration_minutes must be between 5 and 480' });
        }
        sets.push(`${key} = $${i++}`);
        vals.push(req.body[key]);
      }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    sets.push('updated_at = NOW()');

    const ifMatch = req.headers['if-match'];
    let concurrencyClause = '';
    if (ifMatch) {
      vals.push(ifMatch);
      concurrencyClause = ` AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $${i++}::timestamptz)`;
    }

    vals.push(req.params.id);
    try {
      const { rows } = await pool.query(
        `UPDATE interview_configs SET ${sets.join(', ')} WHERE id = $${i}${concurrencyClause} RETURNING *`,
        vals
      );
      if (!rows[0]) {
        if (ifMatch) return res.status(409).json({ error: 'Conflict — the round was modified since you loaded it. Please refresh and try again.' });
        return res.status(404).json({ error: 'Config not found' });
      }
      await auditLog('interview_config', req.params.id, 'update', req.user.displayName || 'unknown',
        { fields: Object.keys(req.body).filter(k => allowed.includes(k)) });
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Interview', 'Failed to update config', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** DELETE /api/interview-configs/:id — Admin only, cascading delete */
  router.delete('/api/interview-configs/:id', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid config ID' });
    try {
      const { rows: scoreCount } = await pool.query(
        `SELECT COUNT(*)::int AS count FROM interview_scores
         WHERE session_id IN (SELECT id FROM interview_sessions WHERE config_id = $1)`,
        [req.params.id]
      );
      const scoresRemoved = scoreCount[0].count;

      const { rowCount } = await pool.query('DELETE FROM interview_configs WHERE id = $1', [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Config not found' });

      await auditLog('interview_config', req.params.id, 'delete', req.user.displayName || 'unknown',
        { scores_removed: scoresRemoved });
      res.json({ deleted: true, scores_removed: scoresRemoved });
    } catch (e) {
      log('error', 'Interview', 'Failed to delete config', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // ---------- Group 3: Sessions ----------

  /** GET /api/interview-sessions/mine — List sessions for the current user */
  router.get('/api/interview-sessions/mine', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    try {
      const { rows } = await pool.query(`
        SELECT s.*, ic.status AS config_status,
               ca.name AS candidate_name, ca.role AS candidate_role,
               hp.title AS position_title, cl.name AS client_name,
               (SELECT COUNT(*)::int FROM interview_config_questions cq WHERE cq.config_id = s.config_id) AS question_count,
               (SELECT COUNT(*)::int FROM interview_scores sc WHERE sc.session_id = s.id) AS scored_count
        FROM interview_sessions s
        JOIN interview_configs ic ON s.config_id = ic.id
        LEFT JOIN candidates ca ON ic.candidate_id = ca.id
        LEFT JOIN hiring_positions hp ON ic.position_id = hp.id
        LEFT JOIN clients cl ON hp.client_id = cl.id
        WHERE s.interviewer_id = $1
        ORDER BY s.notified_at DESC NULLS LAST, s.id
      `, [req.user.id]);
      res.json(rows);
    } catch (e) {
      log('error', 'Interview', 'Failed to list my sessions', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/interview-sessions/:id — Session detail with questions and scores */
  router.get('/api/interview-sessions/:id', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid session ID' });
    try {
      // Get session
      const { rows: sessionRows } = await pool.query(
        `SELECT s.*, ic.status AS config_status, ic.candidate_id, ic.position_id,
                ca.name AS candidate_name, ca.role AS candidate_role,
                hp.title AS position_title, cl.name AS client_name
         FROM interview_sessions s
         JOIN interview_configs ic ON s.config_id = ic.id
         LEFT JOIN candidates ca ON ic.candidate_id = ca.id
         LEFT JOIN hiring_positions hp ON ic.position_id = hp.id
         LEFT JOIN clients cl ON hp.client_id = cl.id
         WHERE s.id = $1`,
        [req.params.id]
      );
      if (!sessionRows[0]) return res.status(404).json({ error: 'Session not found' });
      const session = sessionRows[0];
      // Access control: only the assigned interviewer or admin
      if (session.interviewer_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You are not assigned to this session' });
      }
      // Get questions with scores
      const { rows: questions } = await pool.query(`
        SELECT cq.sort_order, q.id AS question_id, q.question_text, q.category, q.discipline, q.depth_type,
               sc.score, sc.notes AS score_notes, sc.scored_at
        FROM interview_config_questions cq
        JOIN interview_question_bank q ON cq.question_id = q.id
        LEFT JOIN interview_scores sc ON sc.session_id = $1 AND sc.question_id = q.id
        WHERE cq.config_id = $2
        ORDER BY cq.sort_order
      `, [req.params.id, session.config_id]);
      res.json({ session, questions });
    } catch (e) {
      log('error', 'Interview', 'Failed to fetch session', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // ---------- Group 4: Scoring ----------

  /** PUT /api/interview-scores/:session_id/:question_id — Upsert a score */
  router.put('/api/interview-scores/:session_id/:question_id', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.session_id)) return res.status(400).json({ error: 'Invalid session_id' });
    if (!isValidUuid(req.params.question_id)) return res.status(400).json({ error: 'Invalid question_id' });
    const { score, notes } = req.body;
    if (score === undefined || score === null) return res.status(400).json({ error: 'score is required' });
    const scoreNum = Number(score);
    if (!Number.isInteger(scoreNum) || scoreNum < 1 || scoreNum > 5) return res.status(400).json({ error: 'score must be an integer between 1 and 5' });
    try {
      // Verify session exists and belongs to the user
      const { rows: sessionRows } = await pool.query(
        `SELECT * FROM interview_sessions WHERE id = $1`, [req.params.session_id]
      );
      if (!sessionRows[0]) return res.status(404).json({ error: 'Session not found' });
      const session = sessionRows[0];
      if (session.interviewer_id !== req.user.id) return res.status(403).json({ error: 'You are not assigned to this session' });
      if (session.status === 'submitted') return res.status(400).json({ error: 'Cannot score a submitted session' });
      // Upsert score with audit timestamps
      const { rows } = await pool.query(
        `INSERT INTO interview_scores (session_id, question_id, score, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (session_id, question_id) DO UPDATE SET score = $3, notes = $4, scored_at = NOW(), updated_at = NOW()
         RETURNING *`,
        [req.params.session_id, req.params.question_id, scoreNum, notes || null]
      );
      // Advance session from 'assigned' to 'in_progress' on first score
      if (session.status === 'assigned') {
        await pool.query(
          `UPDATE interview_sessions SET status = 'in_progress', started_at = NOW() WHERE id = $1`,
          [req.params.session_id]
        );
      }
      await auditLog('interview_score', rows[0].id, 'upsert', req.user.displayName || 'unknown',
        { session_id: req.params.session_id, question_id: req.params.question_id, score: scoreNum });
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Interview', 'Failed to upsert score', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/interview-scores/:session_id — List all scores for a session */
  router.get('/api/interview-scores/:session_id', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.session_id)) return res.status(400).json({ error: 'Invalid session_id' });
    try {
      const { rows } = await pool.query(
        `SELECT sc.*, q.question_text, q.category, q.discipline
         FROM interview_scores sc
         JOIN interview_question_bank q ON sc.question_id = q.id
         WHERE sc.session_id = $1
         ORDER BY sc.scored_at`,
        [req.params.session_id]
      );
      res.json(rows);
    } catch (e) {
      log('error', 'Interview', 'Failed to list scores', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // ---------- Group 5: Session Submit ----------

  /** POST /api/interview-sessions/:id/submit — Submit a completed scorecard */
  router.post('/api/interview-sessions/:id/submit', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid session ID' });
    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      // Get session
      const { rows: sessionRows } = await conn.query(
        `SELECT s.*, ic.candidate_id, ic.created_by AS hm_id
         FROM interview_sessions s
         JOIN interview_configs ic ON s.config_id = ic.id
         WHERE s.id = $1`,
        [req.params.id]
      );
      if (!sessionRows[0]) { await conn.query('ROLLBACK'); return res.status(404).json({ error: 'Session not found' }); }
      const session = sessionRows[0];
      if (session.interviewer_id !== req.user.id) { await conn.query('ROLLBACK'); return res.status(403).json({ error: 'You are not assigned to this session' }); }
      if (session.status === 'submitted') { await conn.query('ROLLBACK'); return res.status(400).json({ error: 'Session already submitted' }); }
      // Count questions vs scores
      const { rows: qCount } = await conn.query(
        `SELECT COUNT(*)::int AS count FROM interview_config_questions WHERE config_id = $1`,
        [session.config_id]
      );
      const { rows: sCount } = await conn.query(
        `SELECT COUNT(*)::int AS count FROM interview_scores WHERE session_id = $1`,
        [req.params.id]
      );
      if (sCount[0].count < qCount[0].count) {
        await conn.query('ROLLBACK');
        return res.status(400).json({ error: `All questions must be scored. ${sCount[0].count} of ${qCount[0].count} scored.` });
      }
      // Submit
      await conn.query(
        `UPDATE interview_sessions SET status = 'submitted', submitted_at = NOW() WHERE id = $1`,
        [req.params.id]
      );
      // Check if all sessions for this config are now submitted
      const { rows: pendingRows } = await conn.query(
        `SELECT COUNT(*)::int AS count FROM interview_sessions WHERE config_id = $1 AND status NOT IN ('submitted', 'declined')`,
        [session.config_id]
      );
      const allSubmitted = pendingRows[0].count === 0;
      // Get details for emails
      const { rows: hmRows } = await conn.query(
        `SELECT email, display_name FROM users WHERE id = $1`, [session.hm_id]
      );
      const hm = hmRows[0];
      const { rows: candidateRows } = await conn.query(
        `SELECT name, role FROM candidates WHERE id = $1`, [session.candidate_id]
      );
      const candidate = candidateRows[0];
      const { rows: interviewerRows } = await conn.query(
        `SELECT display_name FROM users WHERE id = $1`, [req.user.id]
      );
      const interviewerName = interviewerRows[0]?.display_name || 'An interviewer';
      await conn.query('COMMIT');
      // Send email to HM
      if (hm && hm.email) {
        if (allSubmitted) {
          const bodyHtml = `
            <p>All scorecards are in for <strong>${escHtml(candidate?.name || 'candidate')}</strong>
            (${escHtml(candidate?.role || 'role')}).</p>
            <p>You can now review the aggregated results and record a decision.</p>
            <p><a href="${APP_URL}/nbi_project_dashboard.html#hiring" style="display:inline-block;padding:10px 20px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Review Results</a></p>
          `;
          sendEmailAsync({
            to: hm.email,
            subject: `All scorecards in: ${candidate?.name || 'Candidate'}`,
            html: buildEmailHtml('All Scorecards Submitted', bodyHtml),
          });
        } else {
          const bodyHtml = `
            <p><strong>${escHtml(interviewerName)}</strong> has submitted their scorecard for
            <strong>${escHtml(candidate?.name || 'candidate')}</strong>
            (${escHtml(candidate?.role || 'role')}).</p>
            <p style="color:#64748b;font-size:13px">Other scorecards are still pending.</p>
          `;
          sendEmailAsync({
            to: hm.email,
            subject: `Scorecard submitted: ${candidate?.name || 'Candidate'} — by ${interviewerName}`,
            html: buildEmailHtml('Scorecard Submitted', bodyHtml),
          });
        }
      }
      res.json({ submitted: true, all_submitted: allSubmitted });
    } catch (e) {
      await conn.query('ROLLBACK');
      log('error', 'Interview', 'Failed to submit session', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    } finally {
      conn.release();
    }
  });

  /** POST /api/interview-sessions/:id/decline — Interviewer declines assignment */
  router.post('/api/interview-sessions/:id/decline', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid session ID' });
    try {
      const { rows } = await pool.query(
        `UPDATE interview_sessions SET status = 'declined' WHERE id = $1 AND interviewer_id = $2 AND status = 'assigned' RETURNING *`,
        [req.params.id, req.user.id]
      );
      if (!rows[0]) return res.status(400).json({ error: 'Session not found or cannot be declined (must be assigned to you)' });
      await auditLog('interview_session', req.params.id, 'decline', req.user.displayName || 'unknown', {});
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Interview', 'Failed to decline session', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // ---------- Group 6: Results & Decisions ----------

  /** GET /api/interview-results/:config_id — Aggregated results (blind scoring enforced for interviewers) */
  router.get('/api/interview-results/:config_id', requireNBI, async (req, res) => {
    if (!isValidUuid(req.params.config_id)) return res.status(400).json({ error: 'Invalid config_id' });
    try {
      // Blind scoring: non-admin interviewers must submit their own scorecard first
      if (req.user.role !== 'admin') {
        const { rows: mySession } = await pool.query(
          'SELECT status FROM interview_sessions WHERE config_id = $1 AND interviewer_id = $2',
          [req.params.config_id, req.user.id]
        );
        if (mySession.length > 0 && mySession[0].status !== 'submitted') {
          return res.status(403).json({ error: 'Please submit your scorecard before viewing results.' });
        }
      }
      // Config with candidate and position
      const { rows: configRows } = await pool.query(`
        SELECT ic.*, ca.name AS candidate_name, ca.role AS candidate_role,
               hp.title AS position_title, cl.name AS client_name,
               u.display_name AS created_by_name
        FROM interview_configs ic
        LEFT JOIN candidates ca ON ic.candidate_id = ca.id
        LEFT JOIN hiring_positions hp ON ic.position_id = hp.id
        LEFT JOIN clients cl ON hp.client_id = cl.id
        LEFT JOIN users u ON ic.created_by = u.id
        WHERE ic.id = $1
      `, [req.params.config_id]);
      if (!configRows[0]) return res.status(404).json({ error: 'Config not found' });
      const config = configRows[0];
      // Questions
      const { rows: questions } = await pool.query(`
        SELECT cq.sort_order, q.id AS question_id, q.question_text, q.category, q.discipline, q.depth_type
        FROM interview_config_questions cq
        JOIN interview_question_bank q ON cq.question_id = q.id
        WHERE cq.config_id = $1
        ORDER BY cq.sort_order
      `, [req.params.config_id]);
      // Sessions with interviewer names
      const { rows: sessions } = await pool.query(`
        SELECT s.*, u.display_name AS interviewer_name, u.email AS interviewer_email
        FROM interview_sessions s
        LEFT JOIN users u ON s.interviewer_id = u.id
        WHERE s.config_id = $1
        ORDER BY s.notified_at
      `, [req.params.config_id]);
      // All scores across all sessions
      const { rows: scores } = await pool.query(`
        SELECT sc.*
        FROM interview_scores sc
        JOIN interview_sessions s ON sc.session_id = s.id
        WHERE s.config_id = $1
      `, [req.params.config_id]);
      // Decision (if any)
      const { rows: decisionRows } = await pool.query(
        `SELECT d.*, u.display_name AS decided_by_name
         FROM interview_decisions d
         LEFT JOIN users u ON d.decided_by = u.id
         WHERE d.config_id = $1`,
        [req.params.config_id]
      );
      const decision = decisionRows[0] || null;
      // Compute summary
      const allScoreValues = scores.map(s => s.score);
      const overall_avg = allScoreValues.length > 0
        ? Math.round((allScoreValues.reduce((a, b) => a + b, 0) / allScoreValues.length) * 100) / 100
        : null;
      // Category averages
      const questionMap = {};
      for (const q of questions) { questionMap[q.question_id] = q.category; }
      const categoryBuckets = {};
      for (const sc of scores) {
        const cat = questionMap[sc.question_id];
        if (!cat) continue;
        if (!categoryBuckets[cat]) categoryBuckets[cat] = [];
        categoryBuckets[cat].push(sc.score);
      }
      const category_avgs = {};
      for (const [cat, vals] of Object.entries(categoryBuckets)) {
        category_avgs[cat] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
      }
      res.json({
        config,
        questions,
        sessions,
        scores,
        decision,
        summary: { overall_avg, category_avgs },
      });
    } catch (e) {
      log('error', 'Interview', 'Failed to fetch results', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** POST /api/interview-decisions — Record a decision (admin only) */
  router.post('/api/interview-decisions', requireNBI, requireAdmin, async (req, res) => {
    const { config_id, decision, notes } = req.body;
    if (!config_id || !isValidUuid(config_id)) return res.status(400).json({ error: 'Valid config_id is required' });
    if (!decision || !INTERVIEW_DECISIONS.includes(decision)) return res.status(400).json({ error: `Invalid decision. Must be one of: ${INTERVIEW_DECISIONS.join(', ')}` });
    if (!notes || !notes.trim()) return res.status(400).json({ error: 'notes are required' });
    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      // Verify config exists
      const { rows: configRows } = await conn.query(
        `SELECT * FROM interview_configs WHERE id = $1`, [config_id]
      );
      if (!configRows[0]) { await conn.query('ROLLBACK'); return res.status(404).json({ error: 'Config not found' }); }
      const config = configRows[0];
      // Insert decision
      const { rows: decisionRows } = await conn.query(
        `INSERT INTO interview_decisions (config_id, decision, decided_by, notes)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [config_id, decision, req.user.id, notes.trim()]
      );
      // Set config to completed
      await conn.query(
        `UPDATE interview_configs SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [config_id]
      );
      // Update candidate based on decision
      if (config.candidate_id) {
        if (decision === 'advance') {
          await conn.query(
            `UPDATE candidates SET stage = 'offer', updated_at = NOW() WHERE id = $1`,
            [config.candidate_id]
          );
        } else if (decision === 'reject') {
          await conn.query(
            `UPDATE candidates SET archived_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [config.candidate_id]
          );
        }
        // 'hold' — no candidate change
      }
      await conn.query('COMMIT');
      await auditLog('interview_config', config_id, 'decision', req.user.displayName || 'unknown', { decision, notes: notes.trim() });
      res.status(201).json(decisionRows[0]);
    } catch (e) {
      await conn.query('ROLLBACK');
      log('error', 'Interview', 'Failed to record decision', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    } finally {
      conn.release();
    }
  });

  // ---------- Group 7: Hiring Decisions (candidate-level) ----------

  const REJECTION_CATEGORIES = [
    'skills-mismatch', 'culture-fit', 'experience-level', 'salary-expectations',
    'better-candidate', 'position-filled', 'candidate-withdrew', 'other'
  ];

  /** POST /api/hiring-decisions — Record a candidate-level decision */
  router.post('/api/hiring-decisions', requireNBI, requireAdmin, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { candidate_id, decision, rejection_category, notes } = req.body;
    if (!candidate_id || !isValidUuid(candidate_id)) return res.status(400).json({ error: 'Valid candidate_id is required' });
    if (!['advance', 'hold', 'reject'].includes(decision)) return res.status(400).json({ error: 'decision must be advance, hold, or reject' });
    if (!notes || !notes.trim()) return res.status(400).json({ error: 'notes are required' });
    if (decision === 'reject' && !rejection_category) return res.status(400).json({ error: 'rejection_category is required for reject decisions' });

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      const { rows: candRows } = await conn.query('SELECT * FROM candidates WHERE id = $1', [candidate_id]);
      if (!candRows[0]) { await conn.query('ROLLBACK'); return res.status(404).json({ error: 'Candidate not found' }); }
      const cand = candRows[0];

      const { rows: decRows } = await conn.query(
        `INSERT INTO hiring_decisions (candidate_id, decision, rejection_category, decided_by, notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [candidate_id, decision, rejection_category || null, req.user.id, notes.trim()]
      );

      if (decision === 'advance' && cand.stage === 'interviews') {
        await conn.query(`UPDATE candidates SET stage = 'offer', updated_at = NOW() WHERE id = $1`, [candidate_id]);
        await conn.query(
          `INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by)
           VALUES ($1, $2, 'offer', $3)`,
          [candidate_id, cand.stage, req.user.id]
        );
      } else if (decision === 'reject') {
        await conn.query(
          `UPDATE candidates SET archived_at = NOW(), rejection_category = $2, updated_at = NOW() WHERE id = $1`,
          [candidate_id, rejection_category]
        );
        await conn.query(
          `INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by)
           VALUES ($1, $2, 'rejected', $3)`,
          [candidate_id, cand.stage, req.user.id]
        );
      }

      await conn.query('COMMIT');
      await auditLog('hiring_decision', decRows[0].id, 'create', req.user.displayName || 'unknown', { decision, candidate_id });
      res.status(201).json(decRows[0]);
    } catch (e) {
      await conn.query('ROLLBACK');
      log('error', 'Interview', 'Failed to create hiring decision', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    } finally {
      conn.release();
    }
  });

  /** GET /api/hiring-decisions — List decisions for a candidate */
  router.get('/api/hiring-decisions', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { candidate_id } = req.query;
    if (!candidate_id || !isValidUuid(candidate_id)) return res.status(400).json({ error: 'candidate_id is required' });
    try {
      const { rows } = await pool.query(
        `SELECT hd.*, u.display_name AS decided_by_name
         FROM hiring_decisions hd
         LEFT JOIN users u ON hd.decided_by = u.id
         WHERE hd.candidate_id = $1
         ORDER BY hd.decided_at DESC`,
        [candidate_id]
      );
      res.json(rows);
    } catch (e) {
      log('error', 'Interview', 'Failed to list hiring decisions', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
