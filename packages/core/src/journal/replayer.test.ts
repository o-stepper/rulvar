import { describe, expect, it } from 'vitest';

import { NonSerializableValueError } from '../l0/errors.js';
import { CURRENT_HASH_VERSION } from '../l0/entries.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { deriveContentKey } from './identity.js';
import { Replayer } from './replayer.js';

function makeReplayer(): { replayer: Replayer; store: InMemoryStore } {
  const store = new InMemoryStore();
  const replayer = new Replayer({ runId: 'run-1', store, now: () => 1_700_000_000_000 });
  return { replayer, store };
}

const key = deriveContentKey({ kind: 'rand', subtype: 'now' });

describe('journal write path (M1-T04; docs/03 sections 5, 7.2, 13)', () => {
  it('assigns ordinals 0,1,2 to identical calls in one scope', async () => {
    const { replayer } = makeReplayer();
    const first = await replayer.appendSinglePhase({
      scope: '',
      key,
      kind: 'rand',
      spanId: 's1',
      status: 'ok',
      value: { subtype: 'now', value: 1 },
    });
    const second = await replayer.appendSinglePhase({
      scope: '',
      key,
      kind: 'rand',
      spanId: 's1',
      status: 'ok',
      value: { subtype: 'now', value: 2 },
    });
    const third = await replayer.appendSinglePhase({
      scope: '',
      key,
      kind: 'rand',
      spanId: 's1',
      status: 'ok',
      value: { subtype: 'now', value: 3 },
    });
    expect([first.ordinal, second.ordinal, third.ordinal]).toEqual([0, 1, 2]);
    // The same key in a DIFFERENT scope has its own ordinal space.
    const other = await replayer.appendSinglePhase({
      scope: 'par:0:0',
      key,
      kind: 'rand',
      spanId: 's1',
      status: 'ok',
      value: { subtype: 'now', value: 4 },
    });
    expect(other.ordinal).toBe(0);
  });

  it('two-phase entries share one ordinal and link terminal to running by ref', async () => {
    const { replayer } = makeReplayer();
    const agentKey = 'a'.repeat(64);
    const running = await replayer.appendRunning({
      scope: '',
      key: agentKey,
      kind: 'agent',
      spanId: 'span-a',
    });
    expect(running.status).toBe('running');
    expect(running.hashVersion).toBe(CURRENT_HASH_VERSION);

    const terminal = await replayer.appendTerminal(running.seq, {
      status: 'ok',
      value: { verdict: 'pass' },
      usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0 },
      servedBy: 'anthropic:claude-sonnet-4',
      transcriptRef: 'run-1/t0',
    });
    expect(terminal.ref).toBe(running.seq);
    expect(terminal.seq).toBeGreaterThan(running.seq);
    expect(terminal.ordinal).toBe(running.ordinal);
    expect(terminal.scope).toBe(running.scope);
    expect(terminal.key).toBe(agentKey);
    expect(terminal.startedAt).toBe(running.startedAt);
    expect(terminal.endedAt).toBeDefined();

    // A second identical spawn gets ordinal 1: the pair consumed one slot.
    const secondRunning = await replayer.appendRunning({
      scope: '',
      key: agentKey,
      kind: 'agent',
      spanId: 'span-b',
    });
    expect(secondRunning.ordinal).toBe(1);
  });

  it('rejects a non-serializable value at the call site without journaling', async () => {
    const { replayer, store } = makeReplayer();
    expect(() =>
      replayer.appendSinglePhase({
        scope: '',
        key,
        kind: 'rand',
        spanId: 's1',
        status: 'ok',
        value: { when: new Date() },
      }),
    ).toThrow(NonSerializableValueError);
    expect(() =>
      replayer.appendSinglePhase({
        scope: '',
        key,
        kind: 'step',
        spanId: 's1',
        status: 'ok',
        value: { fn: () => 1 },
      }),
    ).toThrow(NonSerializableValueError);
    expect(await store.load('run-1')).toHaveLength(0);
  });

  it('journals a JSON snapshot decoupled from later caller mutations', async () => {
    const { replayer, store } = makeReplayer();
    const payload = { list: [1, 2] };
    await replayer.appendSinglePhase({
      scope: '',
      key,
      kind: 'step',
      spanId: 's1',
      status: 'ok',
      value: payload,
    });
    payload.list.push(3);
    const [entry] = await store.load('run-1');
    expect(entry?.value).toEqual({ list: [1, 2] });
  });

  it('serializes concurrent appends into one total per-run order', async () => {
    const { replayer, store } = makeReplayer();
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        replayer.appendSinglePhase({
          scope: '',
          key,
          kind: 'rand',
          spanId: 's1',
          status: 'ok',
          value: { subtype: 'random', value: i },
        }),
      ),
    );
    const entries = await store.load('run-1');
    expect(entries.map((e) => e.seq)).toEqual(Array.from({ length: 20 }, (_, i) => i));
    expect(entries.map((e) => e.ordinal)).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it('suspended entries carry deadlineAt and status suspended', async () => {
    const { replayer } = makeReplayer();
    const entry = await replayer.appendSuspended({
      scope: '',
      key: deriveContentKey({ kind: 'external', key: 'approve' }),
      kind: 'external',
      spanId: 's1',
    });
    expect(entry.status).toBe('suspended');
    expect(entry.deadlineAt).toBeUndefined();

    const approval = await replayer.appendSuspended({
      scope: '',
      key: deriveContentKey({ kind: 'approval', toolName: 'bash', input: {} }),
      kind: 'approval',
      spanId: 's1',
      deadlineAt: '2026-07-08T00:00:00.000Z',
    });
    expect(approval.deadlineAt).toBe('2026-07-08T00:00:00.000Z');
  });

  it('folds the budget ledger from terminal usage exactly once', async () => {
    const store = new InMemoryStore();
    const replayer = new Replayer({
      runId: 'run-2',
      store,
      priceUsd: (_servedBy, usage) => usage.outputTokens * 0.001,
    });
    const a = await replayer.appendRunning({ scope: '', key: 'k1', kind: 'agent', spanId: 's' });
    await replayer.appendTerminal(a.seq, {
      status: 'ok',
      usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 2, cacheWriteTokens: 1 },
    });
    const b = await replayer.appendRunning({ scope: '', key: 'k2', kind: 'agent', spanId: 's' });
    await replayer.appendTerminal(b.seq, {
      status: 'error',
      error: { code: 'agent', message: 'x', retryable: false },
      usage: {
        inputTokens: 4,
        outputTokens: 1,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 7,
      },
    });
    const ledger = replayer.ledger();
    expect(ledger.agentsSpawned).toBe(2);
    expect(ledger.usage).toEqual({
      inputTokens: 14,
      outputTokens: 6,
      cacheReadTokens: 2,
      cacheWriteTokens: 1,
      reasoningTokens: 7,
    });
    expect(ledger.usd).toBeCloseTo(0.006);
  });

  it('appendTerminal on a non-running seq is a ConfigError', async () => {
    const { replayer } = makeReplayer();
    await expect(replayer.appendTerminal(99, { status: 'ok' })).rejects.toThrow(
      'not a running entry',
    );
  });

  it('every lookup is live in M1 (resume lands in M2)', () => {
    const { replayer } = makeReplayer();
    expect(replayer.lookup('', key, 0, 'scoped')).toBe('live');
  });
});
