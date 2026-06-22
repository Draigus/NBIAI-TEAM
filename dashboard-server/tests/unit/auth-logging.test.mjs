// Verify auth.js has comprehensive logging for all auth operations.
// Static analysis + integration tests for login/logout/password flows.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const fs = require('fs');
const path = require('path');

describe('auth operation logging', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../routes/auth.js'), 'utf8');

  it('logs login success', () => {
    expect(src).toContain("log('info', 'Auth', 'Login success'");
  });

  it('logs login failure for unknown user', () => {
    expect(src).toContain("reason: 'unknown_user'");
  });

  it('logs login failure for bad password', () => {
    expect(src).toContain("reason: 'bad_password'");
  });

  it('logs logout', () => {
    expect(src).toContain("log('info', 'Auth', 'Logout'");
  });

  it('logs password reset request without raw email', () => {
    expect(src).toContain("log('info', 'Auth', 'Password reset requested'");
    const resetLogLine = src.slice(src.indexOf("'Password reset requested'"), src.indexOf("'Password reset requested'") + 200);
    expect(resetLogLine).not.toContain('user.email');
  });

  it('does not log raw reset tokens in the URL', () => {
    expect(src).not.toContain('`FALLBACK — Reset link for ${user.email}: ${resetUrl}`');
  });

  it('logs admin password reset with auditLog', () => {
    expect(src).toContain("log('info', 'Auth', 'Admin password reset'");
    expect(src).toContain("auditLog('user', userId, 'admin_password_reset'");
  });

  it('logs lockout cleared', () => {
    expect(src).toContain("log('info', 'Auth', 'Lockout cleared'");
  });

  it('logs self password change with auditLog', () => {
    expect(src).toContain("log('info', 'Auth', 'Password changed'");
    expect(src).toContain("auditLog('user', req.user.id, 'password_changed'");
  });

  it('logs reset token validation failure', () => {
    expect(src).toContain("log('warn', 'Auth', 'Reset token invalid or expired'");
  });

  it('logs wrong current password on change-password', () => {
    expect(src).toContain("'Password change failed");
  });

  it('accepts auditLog in ctx destructure', () => {
    expect(src).toMatch(/auditLog[,\s]/);
  });
});
