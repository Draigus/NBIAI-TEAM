// dashboard-server/lib/attachment-sweep.js
//
// Pure helper that, given the current time and a list of document_attachments
// rows, returns the rows that have been orphaned for at least 24 hours and
// should be physically removed (DB row + file on disk).
//
// Purity matters: the cron orchestrator does the I/O (DB query, fs.unlink,
// DELETE FROM). This function does only the calculation, so it is trivially
// unit-tested.

const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * @param {Date} now
 * @param {Array<{ id: string, stored_name: string, orphaned_at: Date | null }>} attachments
 * @returns {Array<{ id: string, stored_name: string }>}
 */
function pickFilesToDelete(now, attachments) {
  if (!(now instanceof Date)) throw new TypeError('now must be a Date');
  if (!Array.isArray(attachments)) return [];
  const cutoff = now.getTime() - ORPHAN_GRACE_MS;
  return attachments
    .filter(a => a && a.orphaned_at instanceof Date && a.orphaned_at.getTime() < cutoff)
    .map(a => ({ id: a.id, stored_name: a.stored_name }));
}

module.exports = { pickFilesToDelete, ORPHAN_GRACE_MS };
