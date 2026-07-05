'use strict';

async function executeAndReport(pool, actionId, ctx, log, executorOverride) {
  const executor = executorOverride || require('./executor');
  const { rows } = await pool.query('SELECT * FROM aios_actions WHERE id = $1', [actionId]);
  const action = rows[0];
  if (!action) {
    return { success: false, error: 'Action not found' };
  }
  if (executor.getRecipeType(action) === 'unknown') {
    return { success: false, error: 'No executable recipe' };
  }
  await executor.markExecutionState(pool, action.id, 'in_progress', null);
  try {
    const result = await executor.executeAction(action, ctx);
    await executor.markExecutionState(pool, action.id, result.success ? 'completed' : 'failed', result);
    return result;
  } catch (err) {
    const errorResult = { success: false, error: err.message };
    await executor.markExecutionState(pool, action.id, 'failed', errorResult);
    return errorResult;
  }
}

module.exports = { executeAndReport };
