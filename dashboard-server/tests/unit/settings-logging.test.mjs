// Verify settings.js has logging and auditLog for setting changes.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const fs = require('fs');
const path = require('path');

describe('settings logging', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../routes/settings.js'), 'utf8');

  it('destructures log and auditLog from ctx', () => {
    expect(src).toMatch(/const\s*\{[^}]*log[^}]*auditLog[^}]*\}\s*=\s*ctx/s);
  });

  it('logs setting changes', () => {
    expect(src).toContain("log('info', 'Settings', 'Setting changed'");
  });

  it('calls auditLog for setting updates with old and new values', () => {
    expect(src).toContain("auditLog('setting'");
    expect(src).toContain('oldValue');
    expect(src).toContain('newValue');
  });

  it('fetches previous value before updating', () => {
    expect(src).toContain("SELECT value FROM settings WHERE key = $1");
  });
});
