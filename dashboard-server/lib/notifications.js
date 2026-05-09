// lib/notifications.js — notification creation helper
module.exports = function createNotifications(pool) {
  async function createNotification(username, type, title, message, link, dismissable = true) {
    await pool.query('INSERT INTO notifications (username, type, title, message, link, dismissable) VALUES ($1,$2,$3,$4,$5,$6)',
      [username, type, title, message || '', link || '', dismissable]);
  }
  return { createNotification };
};
