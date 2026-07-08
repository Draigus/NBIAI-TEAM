import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Same CJS interception pattern as claude-dispatch.test.mjs: patch the shared
// child_process module object before the lib is first required.
const cp = require('child_process');
const realSpawn = cp.spawn;
const spawnMock = vi.fn();
cp.spawn = (...args) => spawnMock(...args);

const { EventEmitter } = require('events');
const { createClaudeWorker } = require('../../lib/claude-worker.js');

afterAll(() => {
  cp.spawn = realSpawn;
  delete require.cache[require.resolve('../../lib/claude-worker.js')];
});

// A fake persistent claude child. Tests emit result events explicitly.
function makeFakeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = new EventEmitter();
  child.stdin.write = vi.fn();
  child.stdin.end = vi.fn();
  child.kill = vi.fn();
  child.pid = 5151;
  child.emitResult = (text, extra = {}) => {
    child.stdout.emit('data', Buffer.from(
      JSON.stringify({ type: 'result', subtype: 'success', result: text, ...extra }) + '\n'
    ));
  };
  child.lastUserText = () => {
    const calls = child.stdin.write.mock.calls;
    const line = calls[calls.length - 1][0];
    return JSON.parse(line).message.content[0].text;
  };
  return child;
}

function makeWorker(overrides = {}) {
  return createClaudeWorker({
    model: 'claude-opus-4-6',
    cwd: 'D:/repo',
    systemPrompt: 'You are the voice of the AIOS.',
    maxExchanges: 20,
    turnTimeoutMs: 60000,
    ...overrides,
  });
}

describe('claude-worker', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it('lazily spawns claude in persistent stream-json mode on first ask', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    const worker = makeWorker();
    expect(spawnMock).not.toHaveBeenCalled();

    const pending = worker.ask('hello');
    child.emitResult('hi there');
    const result = await pending;

    expect(result.text).toBe('hi there');
    const [cmd, args, opts] = spawnMock.mock.calls[0];
    expect(cmd).toBe('claude');
    expect(args).toContain('--input-format');
    expect(args[args.indexOf('--input-format') + 1]).toBe('stream-json');
    expect(args[args.indexOf('--output-format') + 1]).toBe('stream-json');
    expect(args[args.indexOf('--model') + 1]).toBe('claude-opus-4-6');
    expect(args[args.indexOf('--permission-mode') + 1]).toBe('default');
    expect(args).not.toContain('bypassPermissions');
    expect(opts.cwd).toBe('D:/repo');
    worker.stop();
  });

  it('prepends the system prompt on the first turn of a session only', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    const worker = makeWorker();

    const p1 = worker.ask('first question');
    expect(child.lastUserText()).toContain('You are the voice of the AIOS.');
    expect(child.lastUserText()).toContain('first question');
    child.emitResult('answer one');
    await p1;

    const p2 = worker.ask('second question');
    expect(child.lastUserText()).toBe('second question');
    child.emitResult('answer two');
    const r2 = await p2;
    expect(r2.text).toBe('answer two');
    expect(spawnMock).toHaveBeenCalledTimes(1); // same child, no respawn
    worker.stop();
  });

  it('serialises concurrent asks on one child', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    const worker = makeWorker();

    const p1 = worker.ask('q1');
    const p2 = worker.ask('q2');
    // only one message written until the first turn resolves
    expect(child.stdin.write).toHaveBeenCalledTimes(1);
    child.emitResult('a1');
    await p1;
    await vi.waitFor(() => expect(child.stdin.write).toHaveBeenCalledTimes(2));
    child.emitResult('a2');
    const [r1, r2] = [await p1, await p2];
    expect(r1.text).toBe('a1');
    expect(r2.text).toBe('a2');
    worker.stop();
  });

  it('recycles the child after maxExchanges and respawns on the next ask', async () => {
    const child1 = makeFakeChild();
    const child2 = makeFakeChild();
    spawnMock.mockReturnValueOnce(child1).mockReturnValueOnce(child2);
    const worker = makeWorker({ maxExchanges: 2 });

    const p1 = worker.ask('q1'); child1.emitResult('a1'); await p1;
    const p2 = worker.ask('q2'); child1.emitResult('a2'); await p2;
    // exchange limit hit: child1 retired
    expect(child1.stdin.end).toHaveBeenCalled();

    const p3 = worker.ask('q3');
    expect(spawnMock).toHaveBeenCalledTimes(2);
    // new session gets the system prompt again
    expect(child2.lastUserText()).toContain('You are the voice of the AIOS.');
    child2.emitResult('a3');
    const r3 = await p3;
    expect(r3.text).toBe('a3');
    worker.stop();
  });

  it('rejects the in-flight turn if the child dies, then respawns on next ask', async () => {
    const child1 = makeFakeChild();
    const child2 = makeFakeChild();
    spawnMock.mockReturnValueOnce(child1).mockReturnValueOnce(child2);
    const worker = makeWorker();

    const p1 = worker.ask('q1');
    child1.emit('close', 1);
    await expect(p1).rejects.toThrow(/exited/);

    const p2 = worker.ask('q2');
    expect(spawnMock).toHaveBeenCalledTimes(2);
    child2.emitResult('recovered');
    const r2 = await p2;
    expect(r2.text).toBe('recovered');
    worker.stop();
  });

  it('kills the child tree and rejects on turn timeout', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    const worker = makeWorker({ turnTimeoutMs: 50 });

    await expect(worker.ask('q')).rejects.toThrow(/timed out/);
    if (process.platform === 'win32') {
      const killCall = spawnMock.mock.calls.find(c => c[0] === 'taskkill');
      expect(killCall).toBeTruthy();
      expect(killCall[1]).toEqual(['/PID', '5151', '/T', '/F']);
    } else {
      expect(child.kill).toHaveBeenCalled();
    }
    worker.stop();
  });

  it('rejects error results without crashing the worker', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    const worker = makeWorker();

    const p1 = worker.ask('q1');
    child.emitResult('', { is_error: true, subtype: 'error_during_execution' });
    await expect(p1).rejects.toThrow(/error_during_execution/);
    worker.stop();
  });

  it('tolerates JSON lines split across stdout chunks', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    const worker = makeWorker();

    const p = worker.ask('q');
    const line = JSON.stringify({ type: 'result', subtype: 'success', result: 'split answer' }) + '\n';
    child.stdout.emit('data', Buffer.from(line.slice(0, 10)));
    child.stdout.emit('data', Buffer.from(line.slice(10)));
    const r = await p;
    expect(r.text).toBe('split answer');
    worker.stop();
  });

  it('prepends freshContext only when the session is fresh', async () => {
    const child1 = makeFakeChild();
    const child2 = makeFakeChild();
    spawnMock.mockReturnValueOnce(child1).mockReturnValueOnce(child2);
    const worker = makeWorker({ maxExchanges: 1 });

    const p1 = worker.ask('q1', { freshContext: 'Recent conversation:\nUser: hi' });
    expect(child1.lastUserText()).toContain('Recent conversation:');
    child1.emitResult('a1');
    await p1;

    // session recycled after 1 exchange; context comes back on the new session
    const p2 = worker.ask('q2', { freshContext: 'Recent conversation:\nUser: hi\nUser: q1' });
    expect(child2.lastUserText()).toContain('Recent conversation:');
    expect(child2.lastUserText()).toContain('You are the voice of the AIOS.');
    child2.emitResult('a2');
    await p2;

    // same session, not fresh: context omitted
    const child3 = makeFakeChild();
    spawnMock.mockReturnValueOnce(child3);
    void child3;
    const p3 = worker.ask('q3', { freshContext: 'Recent conversation:\nignored' });
    // maxExchanges=1 means child2 retired; this spawns child3 and IS fresh again,
    // so use a worker with headroom instead for the not-fresh assertion
    child3.emitResult('a3');
    await p3;

    const childA = makeFakeChild();
    spawnMock.mockReturnValueOnce(childA);
    const worker2 = makeWorker({ maxExchanges: 10 });
    const pa = worker2.ask('first', { freshContext: 'CTX' });
    expect(childA.lastUserText()).toContain('CTX');
    childA.emitResult('a');
    await pa;
    const pb = worker2.ask('second', { freshContext: 'CTX' });
    expect(childA.lastUserText()).toBe('second');
    childA.emitResult('b');
    await pb;
    worker2.stop();
    worker.stop();
  });

  it('warm() pays the spawn cost with a priming turn carrying the system prompt', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    const worker = makeWorker();

    const warming = worker.warm();
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(child.lastUserText()).toContain('You are the voice of the AIOS.');
    child.emitResult('ready');
    await warming;

    // the first real turn after priming must NOT resend the system prompt but
    // MUST still deliver conversation-restore context
    const p = worker.ask('real question', { freshContext: 'Recent conversation:\nUser: hi' });
    const sent = child.lastUserText();
    expect(sent).not.toContain('You are the voice of the AIOS.');
    expect(sent).toContain('Recent conversation:');
    expect(sent).toContain('real question');
    child.emitResult('answer');
    await p;
    worker.stop();
  });

  it('re-warms automatically after a session recycle', async () => {
    const child1 = makeFakeChild();
    const child2 = makeFakeChild();
    // every real turn recycles at maxExchanges=1, so the answer to q2 will
    // trigger a further warm spawn -- give the mock a default child for it
    spawnMock.mockReturnValueOnce(child1).mockReturnValueOnce(child2).mockReturnValue(makeFakeChild());
    const worker = makeWorker({ maxExchanges: 1, prewarmOnRecycle: true });

    const p1 = worker.ask('q1');
    child1.emitResult('a1');
    await p1;
    // recycle at limit: a fresh child is spawned and primed without being asked
    await vi.waitFor(() => expect(spawnMock).toHaveBeenCalledTimes(2));
    expect(child2.lastUserText()).toContain('You are the voice of the AIOS.');
    child2.emitResult('ready');

    const p2 = worker.ask('q2');
    await vi.waitFor(() => expect(child2.stdin.write).toHaveBeenCalledTimes(2));
    child2.emitResult('a2');
    const r2 = await p2;
    expect(r2.text).toBe('a2');
    worker.stop();
  });

  it('refuses banned models without spawning', () => {
    expect(() => makeWorker({ model: 'claude-opus-4-8' })).toThrow(/banned/);
    expect(() => makeWorker({ model: 'opus' })).toThrow(/banned/);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('reports status', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    const worker = makeWorker();
    expect(worker.status().running).toBe(false);

    const p = worker.ask('q');
    expect(worker.status().running).toBe(true);
    child.emitResult('a');
    await p;
    expect(worker.status().exchanges).toBe(1);
    worker.stop();
    expect(worker.status().running).toBe(false);
  });
});
