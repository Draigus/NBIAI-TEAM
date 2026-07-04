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

async function executeTaskRecipe(action, ctx) {
  const { internalToken, baseUrl, fetch: fetchFn } = ctx;
  const recipe = action.execution_recipe || {};
  const body = {
    title: action.title,
    description: action.description || action.proposed_action || '',
    source: 'aios-executor',
    item_type: 'task',
  };
  if (recipe.parent_id) body.parent_id = recipe.parent_id;

  try {
    const res = await fetchFn(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nbi-internal-token': internalToken,
        'Cookie': 'nbi_service_account=executor',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, created_id: data.id, title: data.title };
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

registerRecipe('task_create', executeTaskRecipe);

module.exports = {
  fetchPendingExecutions,
  markExecutionState,
  executeTaskRecipe,
  registerRecipe,
  executeAction,
  runExecutorCycle,
  getRecipeType,
};
