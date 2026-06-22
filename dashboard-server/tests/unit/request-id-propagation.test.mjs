// Verify request ID propagation: the HTTP access logging middleware
// passes req.requestId on every logged request, and route-level
// error logging in newly-instrumented routes also passes requestId.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../../server.js');

describe('request ID propagation', () => {
  it('access logging middleware passes req.requestId', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');
    const httpLogSection = src.slice(src.indexOf("log(level, 'HTTP'"), src.indexOf("log(level, 'HTTP'") + 500);
    expect(httpLogSection).toContain('req.requestId');
  });

  it('hiring-templates error logs pass req.requestId', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../routes/hiring-templates.js'), 'utf8');
    const errorLogs = src.match(/log\('error'.*?req\.requestId/gs);
    expect(errorLogs).not.toBeNull();
    expect(errorLogs.length).toBe(5);
  });

  it('auth logs pass req.requestId', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../routes/auth.js'), 'utf8');
    const reqIdLogs = src.match(/req\.requestId/g);
    expect(reqIdLogs).not.toBeNull();
    expect(reqIdLogs.length).toBeGreaterThanOrEqual(10);
  });

  it('settings logs pass req.requestId', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../routes/settings.js'), 'utf8');
    expect(src).toContain('req.requestId');
  });

  it('time-off logs pass req.requestId', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../routes/time-off.js'), 'utf8');
    const reqIdLogs = src.match(/req\.requestId/g);
    expect(reqIdLogs).not.toBeNull();
    expect(reqIdLogs.length).toBeGreaterThanOrEqual(2);
  });

  it('responses carry X-Request-Id header for correlation', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
