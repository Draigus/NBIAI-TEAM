// dashboard-server/tests/unit/sync-batch-limit.test.mjs
//
// Validates the MAX_BATCH_SIZE guard on POST /api/sync/changes.
// A batch of >500 items must be rejected with 400; batches at the
// limit or below must not be rejected for size reasons.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

/** Build an array of N minimal upsert changes. */
function buildChanges(n) {
  return Array.from({ length: n }, (_, i) => ({
    action: 'upsert',
    entity: 'task',
    data: {
      id: crypto.randomUUID(),
      title: `batch-item-${i}`,
      status: 'Not started',
      item_type: 'task',
      assignees: [],
      dependencies: [],
    },
  }));
}

describe('POST /api/sync/changes — batch size limit', () => {
  it('rejects a batch of 501 items with 400', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const res = await request(app)
      .post('/api/sync/changes')
      .set('Authorization', `Bearer ${token}`)
      .send({ changes: buildChanges(501) });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Batch size exceeds maximum of 500/);
  });

  it('does not reject a batch of exactly 500 items for size reasons', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const res = await request(app)
      .post('/api/sync/changes')
      .set('Authorization', `Bearer ${token}`)
      .send({ changes: buildChanges(500) });

    // Should not be a 400 batch-size rejection. It may succeed (200) or
    // fail for unrelated reasons, but the batch-size guard must not fire.
    expect(res.status).not.toBe(400);
  });
});
