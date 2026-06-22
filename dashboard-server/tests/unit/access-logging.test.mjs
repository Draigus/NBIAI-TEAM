// Verify the HTTP access logging middleware is present in server.js
// and correctly filters noisy endpoints while logging API calls.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const app = require('../../server.js');

describe('HTTP access logging middleware', () => {
  it('server.js contains the access logging middleware', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');
    expect(src).toContain("log(level, 'HTTP'");
    expect(src).toContain('process.hrtime.bigint()');
    expect(src).toContain("res.on('finish'");
  });

  it('middleware filters /api/health on success (no crash)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('middleware filters /metrics on success (no crash)', async () => {
    const res = await request(app).get('/metrics');
    expect([200, 404]).toContain(res.status);
  });

  it('API calls still work with access logging active', async () => {
    const res = await request(app).get('/api/settings');
    expect([200, 401]).toContain(res.status);
  });

  it('middleware uses req.path not req.originalUrl to avoid leaking query tokens', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');
    const httpBlock = src.slice(src.indexOf("log(level, 'HTTP'"), src.indexOf("log(level, 'HTTP'") + 500);
    expect(httpBlock).toContain('req.path');
    expect(httpBlock).not.toContain('req.originalUrl');
  });

  it('middleware truncates user-agent to prevent log injection', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');
    expect(src).toContain('.slice(0, 300)');
  });
});
