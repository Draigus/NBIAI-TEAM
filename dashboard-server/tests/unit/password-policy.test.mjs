// dashboard-server/tests/unit/password-policy.test.mjs
//
// Unit tests for the validatePassword() helper.
// Verifies length, uppercase, lowercase, and digit requirements.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { validatePassword } = require('../../lib/helpers.js');

describe('validatePassword', () => {
  it('rejects passwords shorter than 6 characters', () => {
    const result = validatePassword('Ab1d');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/6 characters/);
  });

  it('rejects 5-character passwords', () => {
    const result = validatePassword('Ab1de');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/6 characters/);
  });

  it('accepts exactly 6-character passwords meeting all rules', () => {
    const result = validatePassword('Ab1def');
    expect(result.valid).toBe(true);
  });

  it('rejects passwords without an uppercase letter', () => {
    const result = validatePassword('abcdefghij1k');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/uppercase/);
  });

  it('rejects passwords without a lowercase letter', () => {
    const result = validatePassword('ABCDEFGHIJ1K');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/lowercase/);
  });

  it('rejects passwords without a digit', () => {
    const result = validatePassword('Abcdefghijkl');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/digit/);
  });

  it('accepts a strong password with all requirements met', () => {
    const result = validatePassword('MyStr0ngP@ssword!');
    expect(result.valid).toBe(true);
  });

  it('reports multiple missing requirements', () => {
    // All lowercase, no digit — should mention both
    const result = validatePassword('abcdefghijkl');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/uppercase/);
    expect(result.message).toMatch(/digit/);
  });

  it('rejects non-string input', () => {
    expect(validatePassword(undefined).valid).toBe(false);
    expect(validatePassword(null).valid).toBe(false);
    expect(validatePassword(12345678901234).valid).toBe(false);
  });

  it('rejects empty string', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
  });
});
