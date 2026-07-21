// lib/notifications.js — notification creation helper
module.exports = function createNotifications(pool) {
  /**
   * Create a notification. With opts.dedupe, a recurring system alert
   * refreshes the existing UNREAD row for the same user + title (message,
   * link, type, dismissable, timestamp) instead of stacking a duplicate —
   * one live alert per condition, however often the condition re-fires.
   *
   * The dedupe path runs in a transaction holding an advisory lock on the
   * (username, title) pair, so concurrent callers cannot both miss the
   * UPDATE and double-insert. A partial unique index is deliberately NOT
   * used: non-dedupe flows legitimately stack same-title unread rows
   * ("Task updated" per task), so the invariant only holds per call site.
   */
  async function createNotification(username, type, title, message, link, dismissable = true, opts = {}) {
    if (opts.dedupe) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [username, title]);
        const { rowCount } = await client.query(
          `UPDATE notifications SET message = $1, link = $2, type = $3, dismissable = $4, created_at = NOW()
           WHERE id = (
             SELECT id FROM notifications
             WHERE username = $5 AND title = $6 AND is_read = false
             ORDER BY created_at DESC LIMIT 1
           )`,
          [message || '', link || '', type, dismissable, username, title]
        );
        if (rowCount === 0) {
          await client.query(
            'INSERT INTO notifications (username, type, title, message, link, dismissable) VALUES ($1,$2,$3,$4,$5,$6)',
            [username, type, title, message || '', link || '', dismissable]
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch (_) { /* connection may be gone */ }
        throw e;
      } finally {
        client.release();
      }
      return;
    }
    await pool.query('INSERT INTO notifications (username, type, title, message, link, dismissable) VALUES ($1,$2,$3,$4,$5,$6)',
      [username, type, title, message || '', link || '', dismissable]);
  }
  return { createNotification };
};
