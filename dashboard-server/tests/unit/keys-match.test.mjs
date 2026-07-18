import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(__dirname, '../../public/js/nbi-keys.js'), 'utf8');
const matchShortcut = new Function(src + '; return _keysMatch;')();

function ev(key, mods = {}) {
  return { key, ctrlKey: !!mods.ctrl, metaKey: !!mods.meta, shiftKey: !!mods.shift, altKey: !!mods.alt };
}

describe('_keysMatch', () => {
  it('matches a bare key with no modifiers', () => {
    expect(matchShortcut({ key: 'n', mod: null }, ev('n'))).toBe(true);
    expect(matchShortcut({ key: 'n', mod: null }, ev('n', { ctrl: true }))).toBe(false);
  });

  it('matches mod as ctrl OR meta (cross-platform)', () => {
    expect(matchShortcut({ key: 'k', mod: 'mod' }, ev('k', { ctrl: true }))).toBe(true);
    expect(matchShortcut({ key: 'k', mod: 'mod' }, ev('k', { meta: true }))).toBe(true);
    expect(matchShortcut({ key: 'k', mod: 'mod' }, ev('k'))).toBe(false);
  });

  it('matches specific modifiers', () => {
    expect(matchShortcut({ key: 'z', mod: 'ctrl' }, ev('z', { ctrl: true }))).toBe(true);
    expect(matchShortcut({ key: 'z', mod: 'ctrl' }, ev('z', { meta: true }))).toBe(false);
    expect(matchShortcut({ key: 'S', mod: 'shift' }, ev('S', { shift: true }))).toBe(true);
  });

  it('is case-insensitive on the key', () => {
    expect(matchShortcut({ key: 'N', mod: null }, ev('n'))).toBe(true);
  });

  it('? matches without treating shift as a modifier mismatch', () => {
    expect(matchShortcut({ key: '?', mod: null }, ev('?', { shift: true }))).toBe(true);
  });
});
