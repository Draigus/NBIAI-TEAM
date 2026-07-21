import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { pool } = require('../helpers/db');
const createNotifications = require('../../lib/notifications');

const { createNotification } = createNotifications(pool);

async function rows(username, title) {
  const { rows } = await pool.query(
    'SELECT id, message, link, is_read FROM notifications WHERE username=$1 AND title=$2 ORDER BY id',
    [username, title]
  );
  return rows;
}

describe('createNotification dedupe', () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM notifications WHERE username LIKE 'dedupe_test_%'");
  });

  it('default behaviour still inserts a new row every call', async () => {
    await createNotification('dedupe_test_a', 'warning', 'Same Title', 'first', '', true);
    await createNotification('dedupe_test_a', 'warning', 'Same Title', 'second', '', true);
    expect((await rows('dedupe_test_a', 'Same Title')).length).toBe(2);
  });

  it('dedupe refreshes the existing unread row instead of stacking', async () => {
    await createNotification('dedupe_test_b', 'warning', 'Backup Validation Failed', 'issues v1', '/a', true, { dedupe: true });
    await createNotification('dedupe_test_b', 'warning', 'Backup Validation Failed', 'issues v2', '/b', true, { dedupe: true });
    const r = await rows('dedupe_test_b', 'Backup Validation Failed');
    expect(r.length).toBe(1);
    expect(r[0].message).toBe('issues v2');
    expect(r[0].link).toBe('/b');
    expect(r[0].is_read).toBe(false);
  });

  it('dedupe inserts fresh when the previous notification was read', async () => {
    await createNotification('dedupe_test_c', 'warning', 'Backup Validation Failed', 'old', '', true, { dedupe: true });
    await pool.query("UPDATE notifications SET is_read = true WHERE username = 'dedupe_test_c'");
    await createNotification('dedupe_test_c', 'warning', 'Backup Validation Failed', 'new', '', true, { dedupe: true });
    const r = await rows('dedupe_test_c', 'Backup Validation Failed');
    expect(r.length).toBe(2);
    expect(r.filter(x => !x.is_read).length).toBe(1);
  });

  it('dedupe scopes by username — different users keep their own rows', async () => {
    await createNotification('dedupe_test_d1', 'warning', 'T', 'm', '', true, { dedupe: true });
    await createNotification('dedupe_test_d2', 'warning', 'T', 'm', '', true, { dedupe: true });
    expect((await rows('dedupe_test_d1', 'T')).length).toBe(1);
    expect((await rows('dedupe_test_d2', 'T')).length).toBe(1);
  });

  it('dedupe refreshes dismissable alongside the other fields', async () => {
    await createNotification('dedupe_test_e', 'warning', 'T', 'm1', '', true, { dedupe: true });
    await createNotification('dedupe_test_e', 'warning', 'T', 'm2', '', false, { dedupe: true });
    const { rows: r } = await pool.query(
      "SELECT dismissable FROM notifications WHERE username='dedupe_test_e' AND is_read=false"
    );
    expect(r.length).toBe(1);
    expect(r[0].dismissable).toBe(false);
  });

  it('concurrent dedupe writers cannot double-insert (advisory lock)', async () => {
    await Promise.all(Array.from({ length: 10 }, (_, i) =>
      createNotification('dedupe_test_f', 'warning', 'Race Title', 'msg ' + i, '', true, { dedupe: true })
    ));
    const r = await rows('dedupe_test_f', 'Race Title');
    expect(r.length).toBe(1);
  });
});
