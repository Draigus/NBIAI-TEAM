import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// The lib is CommonJS; vi.mock() does not intercept require() calls
// (proven: with vi.mock('child_process') the real claude CLI was spawned).
// Instead, patch the shared CJS child_process module object BEFORE the lib
// is first required, so its destructured `spawn` binding captures the wrapper.
const cp = require('child_process');
const realSpawn = cp.spawn;
const spawnMock = vi.fn();
cp.spawn = (...args) => spawnMock(...args);

const { EventEmitter } = require('events');
const { dispatch } = require('../../lib/claude-dispatch.js');

afterAll(() => {
  cp.spawn = realSpawn;
  delete require.cache[require.resolve('../../lib/claude-dispatch.js')];
});

function makeFakeChild({ stdout = 'answer text', code = 0 } = {}) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = new EventEmitter();
  child.stdin.write = vi.fn();
  child.stdin.end = vi.fn();
  child.kill = vi.fn();
  setImmediate(() => {
    child.stdout.emit('data', Buffer.from(stdout));
    child.emit('close', code);
  });
  return child;
}

describe('claude-dispatch', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it('spawns claude with the model and returns stdout', async () => {
    spawnMock.mockReturnValue(makeFakeChild({ stdout: 'The answer.' }));
    const result = await dispatch({ prompt: 'question', model: 'claude-opus-4-6', cwd: 'D:/repo' });
    expect(result.text).toBe('The answer.');
    const [cmd, args, opts] = spawnMock.mock.calls[0];
    expect(args).toContain('--model');
    expect(args[args.indexOf('--model') + 1]).toBe('claude-opus-4-6');
    expect(opts.cwd).toBe('D:/repo');
  });

  it('writes the prompt to stdin', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    await dispatch({ prompt: 'my long prompt', model: 'claude-opus-4-6', cwd: '.' });
    expect(child.stdin.write).toHaveBeenCalledWith('my long prompt');
    expect(child.stdin.end).toHaveBeenCalled();
  });

  it('rejects banned models without spawning', async () => {
    await expect(dispatch({ prompt: 'q', model: 'claude-opus-4-8', cwd: '.' })).rejects.toThrow(/banned/);
    await expect(dispatch({ prompt: 'q', model: 'opus', cwd: '.' })).rejects.toThrow(/banned/);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('rejects mixed-case banned models without spawning', async () => {
    await expect(dispatch({ prompt: 'q', model: 'Claude-Opus-4-8', cwd: '.' })).rejects.toThrow(/banned/);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('rejects on non-zero exit', async () => {
    spawnMock.mockReturnValue(makeFakeChild({ stdout: '', code: 1 }));
    await expect(dispatch({ prompt: 'q', model: 'claude-opus-4-6', cwd: '.' })).rejects.toThrow(/exit 1/);
  });

  it('rejects models with disallowed characters without spawning', async () => {
    await expect(dispatch({ prompt: 'q', model: 'claude-opus-4-6 & echo pwned', cwd: '.' })).rejects.toThrow(/disallowed characters/);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('kills the child process tree on timeout', async () => {
    // Fake child that never emits 'close' so the timeout path fires.
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = new EventEmitter();
    child.stdin.write = vi.fn();
    child.stdin.end = vi.fn();
    child.kill = vi.fn();
    child.pid = 4242;
    spawnMock.mockReturnValue(child);
    await expect(dispatch({ prompt: 'q', model: 'claude-opus-4-6', cwd: '.', timeoutMs: 50 })).rejects.toThrow(/timed out/);
    if (process.platform === 'win32') {
      // Windows: taskkill /T kills the whole tree spawned under shell:true
      expect(spawnMock).toHaveBeenCalledTimes(2);
      expect(spawnMock.mock.calls[1][0]).toBe('taskkill');
      expect(spawnMock.mock.calls[1][1]).toEqual(['/PID', '4242', '/T', '/F']);
    } else {
      expect(child.kill).toHaveBeenCalled();
    }
  });
});
