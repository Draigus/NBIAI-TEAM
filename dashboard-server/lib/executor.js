'use strict';

const MAX_BATCH = 10;
const RECIPE_HANDLERS = {};

function getRecipeType(action) {
  return action?.execution_recipe?.type || 'unknown';
}

async function fetchPendingExecutions(pool, limit) {
  const { rows } = await pool.query(
    `SELECT * FROM aios_actions
     WHERE approval_state = 'approved' AND execution_state = 'pending'
       AND execution_recipe IS NOT NULL
     ORDER BY
       CASE risk_class WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       created_at ASC
     LIMIT $1`,
    [limit || MAX_BATCH]
  );
  return rows;
}

async function markExecutionState(pool, actionId, state, result) {
  await pool.query(
    `UPDATE aios_actions
     SET execution_state = $1, execution_result = $2, updated_at = NOW()
     WHERE id = $3`,
    [state, result ? JSON.stringify(result) : null, actionId]
  );
}

// Internal service path for WorkSage writes (audit fix 2026-07-05: /api/tasks is
// session-authed; the executor authenticates with the internal token instead).
async function postWorkItem(ctx, body) {
  const res = await ctx.fetch(`${ctx.baseUrl}/api/internal/aios/work-items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-nbi-internal-token': ctx.internalToken,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function resolveClientId(pool, clientSlug) {
  if (!clientSlug) return null;
  const name = String(clientSlug).replace(/_/g, ' ').toLowerCase();
  const { rows } = await pool.query(
    'SELECT id FROM clients WHERE lower(name) LIKE $1 ORDER BY name LIMIT 1',
    [`%${name}%`]
  );
  return rows.length > 0 ? rows[0].id : null;
}

// Bare commitments need a valid parent (root non-initiatives are rejected by
// hierarchy validation). Deterministic landing zone: an "AIOS Inbox" initiative
// per client (or global when no client resolves), find-or-create.
async function resolveInboxParentId(ctx, clientId) {
  const { rows } = await ctx.pool.query(
    `SELECT id FROM tasks
     WHERE item_type = 'initiative' AND title = 'AIOS Inbox'
       AND status NOT IN ('Done', 'Cancelled')
       AND ${clientId ? 'client_id = $1' : 'client_id IS NULL'}
     LIMIT 1`,
    clientId ? [clientId] : []
  );
  if (rows.length > 0) return rows[0].id;

  const inbox = await postWorkItem(ctx, {
    title: 'AIOS Inbox',
    item_type: 'initiative',
    client_id: clientId,
    description: 'Landing zone for AIOS-created tasks awaiting triage into the real hierarchy.',
    source: 'aios-executor',
  });
  return inbox.id;
}

async function executeTaskRecipe(action, ctx) {
  const recipe = action.execution_recipe || {};

  try {
    let parentId = recipe.parent_id;
    let clientId = recipe.client_id || null;
    if (!parentId) {
      if (!clientId) clientId = await resolveClientId(ctx.pool, recipe.client_slug);
      parentId = await resolveInboxParentId(ctx, clientId);
    }

    const data = await postWorkItem(ctx, {
      title: action.title,
      description: action.description || action.proposed_action || '',
      source: 'aios-executor',
      item_type: 'task',
      parent_id: parentId,
      client_id: clientId,
    });
    return { success: true, created_id: data.id, title: data.title, parent_id: parentId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function registerRecipe(type, handler) {
  RECIPE_HANDLERS[type] = handler;
}

async function executeAction(action, ctx) {
  const recipeType = getRecipeType(action);
  const handler = RECIPE_HANDLERS[recipeType];
  if (!handler) {
    return { success: false, error: `No recipe handler for type: ${recipeType}` };
  }
  return handler(action, ctx);
}

async function runExecutorCycle(pool, ctx) {
  const pending = await fetchPendingExecutions(pool);
  const results = { executed: 0, failed: 0, skipped: 0 };

  for (const action of pending) {
    await markExecutionState(pool, action.id, 'in_progress', null);

    try {
      const result = await executeAction(action, ctx);
      if (result.success) {
        await markExecutionState(pool, action.id, 'completed', result);
        results.executed++;
      } else {
        await markExecutionState(pool, action.id, 'failed', result);
        results.failed++;
      }
    } catch (err) {
      await markExecutionState(pool, action.id, 'failed', { error: err.message });
      results.failed++;
    }
  }

  return results;
}

function buildInitiativePrompt(action) {
  const recipe = action.execution_recipe || {};
  const rolePaths = (recipe.roles || []).map(r => `roles/${r}/AGENT.md`);
  const brainPaths = (recipe.brain_modules || []).map(m => `brain/${m}`);
  const taskTree = recipe.task_tree || {};

  const lines = [
    'You are the NBI AIOS Executor building a WorkSage initiative.',
    '',
    'CONTEXT: Read the following files for domain expertise:',
    ...rolePaths.map(p => `- ${p}`),
    ...brainPaths.map(p => `- ${p}`),
    '',
    `OBJECTIVE: Build the initiative "${taskTree.initiative || action.title}" in WorkSage.`,
    action.description ? `DESCRIPTION: ${action.description}` : '',
    '',
    'TASK TREE (create this exact hierarchy via the WorkSage API):',
    '',
    `Initiative: ${taskTree.initiative || action.title}`,
  ];

  if (taskTree.children) {
    for (const child of taskTree.children) {
      lines.push(`  ${child.type || 'feature'}: ${child.title}`);
      if (child.children) {
        for (const grandchild of child.children) {
          lines.push(`    ${grandchild.type || 'story'}: ${grandchild.title}`);
        }
      }
    }
  }

  lines.push('');
  lines.push('EXECUTION STEPS:');
  lines.push('1. Read the role AGENT.md files and brain modules listed above.');
  lines.push('2. Flesh out each task: write a concrete description, definition of done, and effort estimate.');
  lines.push('3. Create the initiative via the AIOS internal endpoint (the public /api/tasks route requires a browser session and will 401):');
  lines.push('   POST http://localhost:8888/api/internal/aios/work-items');
  lines.push('   Headers: Content-Type: application/json, x-nbi-internal-token: <AIOS_INTERNAL_TOKEN>');
  lines.push('   Read AIOS_INTERNAL_TOKEN from dashboard-server/.env via a node one-liner (dotenv), never echo it to output.');
  lines.push('   The root item must be item_type "initiative".');
  if (recipe.client_slug) {
    lines.push(`   Set client_id by querying: SELECT id FROM clients WHERE lower(name) LIKE '%${recipe.client_slug.replace(/_/g, ' ')}%' (clients has no slug column)`);
  }
  lines.push('4. Create each child under the initiative via the same endpoint using parent_id from the previous step.');
  lines.push('5. After creating all items, verify by querying: SELECT id, title, item_type, parent_id FROM tasks WHERE parent_id = <initiative_id>');
  lines.push('6. Output a JSON summary: { "initiative_id": "...", "created_count": N, "items": [...] }');
  lines.push('');
  lines.push('RULES:');
  lines.push('- British English only.');
  lines.push('- Every task must have: title, description (min 15 chars), definition of done.');
  lines.push('- Do NOT create tasks without concrete definitions of done.');
  lines.push('- If you cannot determine appropriate content for a task, flag it as needing Glen steer rather than inventing content.');
  lines.push('- Read NBI_Brain.md for business context.');

  return lines.filter(l => l !== undefined).join('\n');
}

function buildResearchPrompt(action) {
  const recipe = action.execution_recipe || {};
  const rolePaths = (recipe.roles || []).map(r => `roles/${r}/AGENT.md`);
  const dims = recipe.dimensions || [];

  const lines = [
    'You are the NBI AIOS Executor producing a research brief.',
    '',
    'CONTEXT: Read the following files for domain expertise:',
    ...rolePaths.map(p => `- ${p}`),
    '- NBI_Brain.md (business context)',
    '',
    `TOPIC: ${recipe.topic || action.title}`,
    '',
    'RESEARCH DIMENSIONS:',
    ...dims.map((d, i) => `${i + 1}. ${d}`),
    '',
    'EXECUTION STEPS:',
    '1. Read the role AGENT.md files listed above for domain grounding.',
    '2. For each dimension, conduct web research (use WebSearch). Find at least 3 independent sources per dimension.',
    '3. For each major claim, verify it against at least 2 sources. Label confidence: high/medium/low.',
    '4. Write the research brief with these sections:',
    '   - Executive Summary (3-5 sentences)',
    '   - Method (how you researched this)',
    '   - Findings per dimension (with citations)',
    '   - Comparison table (if applicable)',
    '   - Gaps and limitations (what you could NOT find)',
    '   - Recommendation (if the evidence supports one)',
    `5. Save the brief to: ${recipe.output_path || 'projects/'}${action.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`,
    '6. Output a JSON summary: { "document_path": "...", "finding_count": N, "source_count": N, "gaps": [...] }',
    '',
    'RULES:',
    '- British English only.',
    '- Never fabricate. Every claim must have a named source (URL, document, or meeting reference).',
    '- Unverified claims must be labelled "unverified" in the text.',
    '- "Insufficient evidence" is a valid finding. Do not pad with speculation.',
    '- The brief must be genuinely useful to a gaming industry CPO, not a generic overview.',
  ];

  return lines.join('\n');
}

async function executeInitiativeRecipe(action, ctx) {
  const { validateContract, requiresCodexReview } = require('./quality-gates');
  const dispatchFn = ctx.dispatch || require('./claude-dispatch').dispatch;

  const model = process.env.AIOS_DISPATCH_MODEL || 'claude-opus-4-6';
  const prompt = buildInitiativePrompt(action);

  let result;
  try {
    result = await dispatchFn({
      prompt,
      model,
      cwd: ctx.repoRoot || '.',
      timeoutMs: 300000,
    });
  } catch (err) {
    return { success: false, error: `Dispatch failed: ${err.message}` };
  }

  const parsed = parseJsonFromOutput(result.text);
  if (!parsed) {
    return { success: false, error: 'Could not parse structured output from initiative build', raw: result.text.slice(0, 500) };
  }

  const validation = validateContract('initiative_build', parsed);
  if (!validation.valid) {
    return { success: false, error: 'Contract validation failed', failures: validation.failures, below_bar: true };
  }

  // Post-execution verification: the headless agent self-reports what it
  // built; do not trust the summary. The initiative row must exist.
  if (!parsed.initiative_id) {
    return { success: false, error: 'Post-execution verification failed: no initiative_id in build output', below_bar: true };
  }
  let initiativeRow = null;
  try {
    const { rows } = await ctx.pool.query('SELECT id FROM tasks WHERE id = $1', [parsed.initiative_id]);
    initiativeRow = rows[0] || null;
  } catch (verifyErr) {
    return { success: false, error: `Post-execution verification failed: ${verifyErr.message}`, initiative_id: parsed.initiative_id };
  }
  if (!initiativeRow) {
    return { success: false, error: `Post-execution verification failed: initiative ${parsed.initiative_id} not found in tasks table` };
  }

  let codexReview = 'not_required';
  if (requiresCodexReview('initiative_build', model)) {
    const critique = await runCodexCritique('initiative_build', parsed, action, ctx);
    if (critique.status === 'fail') {
      return {
        success: false,
        error: 'Codex critique failed',
        failures: critique.failures,
        below_bar: true,
        codex_review: 'fail',
        codex_score: critique.score,
        initiative_id: parsed.initiative_id,
      };
    }
    codexReview = critique.status;
  }

  return {
    success: true,
    recipe_type: 'initiative_build',
    initiative_id: parsed.initiative_id,
    created_count: parsed.created_count || parsed.items?.length || 0,
    codex_review: codexReview,
    durationMs: result.durationMs,
  };
}

async function executeResearchRecipe(action, ctx) {
  const { validateContract, requiresCodexReview } = require('./quality-gates');
  const dispatchFn = ctx.dispatch || require('./claude-dispatch').dispatch;

  const model = process.env.AIOS_DISPATCH_MODEL || 'claude-opus-4-6';
  const prompt = buildResearchPrompt(action);

  let result;
  try {
    result = await dispatchFn({
      prompt,
      model,
      cwd: ctx.repoRoot || '.',
      timeoutMs: 600000,
    });
  } catch (err) {
    return { success: false, error: `Dispatch failed: ${err.message}` };
  }

  const parsed = parseJsonFromOutput(result.text);
  if (!parsed) {
    return { success: false, error: 'Could not parse structured output from research brief', raw: result.text.slice(0, 500) };
  }

  const validation = validateContract('research_brief', parsed);
  if (!validation.valid) {
    return { success: false, error: 'Contract validation failed', failures: validation.failures, below_bar: true };
  }

  // Post-execution verification: the brief must actually exist on disk at
  // the path the headless agent claims it wrote to.
  const fs = require('fs');
  const path = require('path');
  if (!parsed.document_path) {
    return { success: false, error: 'Post-execution verification failed: no document_path in brief output', below_bar: true };
  }
  const briefPath = path.isAbsolute(parsed.document_path)
    ? parsed.document_path
    : path.resolve(ctx.repoRoot || '.', parsed.document_path);
  if (!fs.existsSync(briefPath)) {
    return { success: false, error: `Post-execution verification failed: document not found at ${briefPath}` };
  }

  let codexReview = 'not_required';
  if (requiresCodexReview('research_brief', model)) {
    const critique = await runCodexCritique('research_brief', parsed, action, ctx);
    if (critique.status === 'fail') {
      return {
        success: false,
        error: 'Codex critique failed',
        failures: critique.failures,
        below_bar: true,
        codex_review: 'fail',
        codex_score: critique.score,
        document_path: parsed.document_path,
      };
    }
    codexReview = critique.status;
  }

  return {
    success: true,
    recipe_type: 'research_brief',
    document_path: parsed.document_path,
    finding_count: parsed.finding_count || 0,
    source_count: parsed.source_count || 0,
    codex_review: codexReview,
    durationMs: result.durationMs,
  };
}

const CODEX_PATH = 'C:\\Users\\gpbea\\AppData\\Roaming\\npm\\codex';

// Static apart from the controlled temp-file path -- deliverable text must
// never appear in this string (audit finding 2, shell injection via cmd.exe).
function buildCodexCritiqueCommand(critiqueFilePath) {
  return `"${CODEX_PATH}" exec "Read the file at ${critiqueFilePath} and follow the review instructions it contains. Output ONLY the JSON verdict object those instructions specify."`;
}

function defaultCodexExec(command, opts) {
  const { execSync } = require('child_process');
  return execSync(command, { ...opts, encoding: 'utf8' });
}

// The verdict must contain a boolean "pass". Codex output can wrap the JSON
// in prose (including stray braces), so fall back to scanning flat objects
// that mention "pass" when the greedy extraction fails.
function parseCritiqueVerdict(text) {
  const greedy = parseJsonFromOutput(text);
  if (greedy && typeof greedy.pass === 'boolean') return greedy;
  const candidates = text.match(/\{[^{}]*"pass"[^{}]*\}/g) || [];
  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(candidates[i]);
      if (typeof parsed.pass === 'boolean') return parsed;
    } catch { /* try earlier candidate */ }
  }
  return null;
}

// Cross-AI quality gate (completeness audit 2026-07-05). The verdict is
// captured and enforced: a parsed FAIL blocks the action as below-bar.
// Codex being unavailable or unparseable is non-blocking but recorded in
// the execution result -- never silently skipped.
async function runCodexCritique(recipeType, deliverable, action, ctx) {
  const { buildCritiquePrompt } = require('./quality-gates');
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const safeId = String(action.id || 'unknown').replace(/[^0-9a-f-]/gi, '');
  const critiqueFile = path.join(os.tmpdir(), `aios-codex-critique-${safeId}.md`);
  try {
    fs.writeFileSync(critiqueFile, buildCritiquePrompt(recipeType, deliverable));
    const execFn = ctx.codexExec || defaultCodexExec;
    const stdout = execFn(buildCodexCritiqueCommand(critiqueFile), {
      cwd: ctx.repoRoot || '.',
      timeout: 120000,
      windowsHide: true,
    });
    const verdict = parseCritiqueVerdict(String(stdout || ''));
    if (!verdict) {
      ctx.log?.('warn', 'Executor', 'Codex critique verdict unparseable (non-blocking)', { recipeType, actionId: action.id });
      return { status: 'unparseable', raw: String(stdout || '').slice(0, 500) };
    }
    if (verdict.pass) {
      return { status: 'pass', score: verdict.score, failures: [] };
    }
    return { status: 'fail', score: verdict.score, failures: verdict.failures || [] };
  } catch (err) {
    ctx.log?.('warn', 'Executor', 'Codex critique unavailable (non-blocking)', { recipeType, actionId: action.id, error: err.message });
    return { status: 'unavailable', error: err.message };
  } finally {
    try { fs.unlinkSync(critiqueFile); } catch (unlinkErr) { /* temp file already gone */ }
  }
}

function parseJsonFromOutput(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

registerRecipe('task_create', executeTaskRecipe);
registerRecipe('initiative_build', executeInitiativeRecipe);
registerRecipe('research_brief', executeResearchRecipe);

module.exports = {
  fetchPendingExecutions,
  markExecutionState,
  executeTaskRecipe,
  registerRecipe,
  executeAction,
  runExecutorCycle,
  getRecipeType,
  buildInitiativePrompt,
  buildResearchPrompt,
  parseJsonFromOutput,
  resolveClientId,
  resolveInboxParentId,
  buildCodexCritiqueCommand,
  runCodexCritique,
  executeInitiativeRecipe,
  executeResearchRecipe,
};
