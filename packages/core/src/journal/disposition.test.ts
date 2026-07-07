import { describe, expect, it } from 'vitest';

import { agentErrorToWire } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import { defineWorkflow, executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter } from '../engine/test-harness.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { agentScope } from './scope.js';
import { deriveContentKey } from './identity.js';
import { EMPTY_SCHEMA_HASH, EMPTY_TOOLSET_HASH } from '../l0/schema.js';
import {
  buildDeriverRegistry,
  deriverV1,
  deriverV2,
  registryKeyRing,
  scanJournalCompatibility,
} from './keyderiver.js';
import {
  buildAbandonFold,
  classifyAgentError,
  dispositionHook,
  replayDisposition,
} from './disposition.js';
import { JournalMatcher } from './matching.js';

let seq = 0;
function entry(partial: Partial<JournalEntry>): JournalEntry {
  return {
    hashVersion: 2,
    seq: seq++,
    scope: '',
    key: 'k',
    ordinal: 0,
    kind: 'agent',
    status: 'ok',
    spanId: 's',
    startedAt: 't',
    ...partial,
  };
}

function pair(
  status: 'ok' | 'error' | 'limit' | 'cancelled' | 'escalated',
  opts?: { memoize?: boolean; errorKind?: 'schema-mismatch' | 'rate-limit' | 'transport' },
): { running: JournalEntry; terminal: JournalEntry } {
  const running = entry({
    status: 'running',
    ...(opts?.memoize === undefined ? {} : { memoizeOutcome: opts.memoize }),
  });
  const terminal = entry({
    ref: running.seq,
    key: running.key,
    status,
    ...(opts?.errorKind === undefined
      ? {}
      : {
          error: agentErrorToWire(
            { kind: opts.errorKind, retryable: opts.errorKind !== 'schema-mismatch' },
            'x',
          ),
        }),
  });
  return { running, terminal };
}

const emptyFold = { isAbandoned: () => false };
const registry = buildDeriverRegistry();

describe('replayDisposition: the full DEF-1 table (M2-T06; docs/03 section 6.3)', () => {
  it('ok and escalated replay unconditionally (escalated-replays-as-ok)', () => {
    for (const status of ['ok', 'escalated'] as const) {
      const { running, terminal } = pair(status);
      expect(replayDisposition(running, emptyFold, { registry, terminal })).toBe('replay');
    }
  });

  it('limit reruns unless memoizeOutcome is fixed IN the entry', () => {
    const plain = pair('limit');
    expect(
      replayDisposition(plain.running, emptyFold, { registry, terminal: plain.terminal }),
    ).toBe('rerun');
    const memoized = pair('limit', { memoize: true });
    expect(
      replayDisposition(memoized.running, emptyFold, { registry, terminal: memoized.terminal }),
    ).toBe('replay');
  });

  it('error replays only under memoizeOutcome AND task-class', () => {
    const cases: Array<{
      memoize: boolean;
      errorKind: 'schema-mismatch' | 'rate-limit' | 'transport';
      expected: 'replay' | 'rerun';
    }> = [
      { memoize: true, errorKind: 'schema-mismatch', expected: 'replay' },
      { memoize: true, errorKind: 'rate-limit', expected: 'rerun' },
      { memoize: true, errorKind: 'transport', expected: 'rerun' },
      { memoize: false, errorKind: 'schema-mismatch', expected: 'rerun' },
    ];
    for (const { memoize, errorKind, expected } of cases) {
      const { running, terminal } = pair('error', { memoize, errorKind });
      expect(replayDisposition(running, emptyFold, { registry, terminal })).toBe(expected);
    }
  });

  it('cancelled always reruns; memoizeOutcome is inert on cancelled', () => {
    const { running, terminal } = pair('cancelled', { memoize: true });
    expect(replayDisposition(running, emptyFold, { registry, terminal })).toBe('rerun');
  });

  it('a hanging running entry reruns (at-least-once redispatch)', () => {
    const running = entry({ status: 'running' });
    expect(replayDisposition(running, emptyFold, { registry })).toBe('rerun');
  });

  it('abandon is stronger than any terminal status, including ok and escalated', () => {
    for (const status of ['ok', 'escalated', 'error', 'limit', 'cancelled'] as const) {
      const { running, terminal } = pair(status, { memoize: true });
      const fold = { isAbandoned: (ref: number) => ref === running.seq };
      expect(replayDisposition(running, fold, { registry, terminal })).toBe('skip');
    }
  });

  it('invalidate/retry unpins a memoized failure', () => {
    const { running, terminal } = pair('error', { memoize: true, errorKind: 'schema-mismatch' });
    const invalidated = new Set([running.seq]);
    expect(replayDisposition(running, emptyFold, { registry, terminal, invalidated })).toBe(
      'rerun',
    );
  });

  it('v1 entries dispatch under the round-1 table (compatibility lemma)', () => {
    const memoizedLimit = pair('limit', { memoize: true });
    memoizedLimit.running.hashVersion = 1;
    memoizedLimit.terminal.hashVersion = 1;
    // Under v2 this would replay; the v1 profile reruns.
    expect(
      replayDisposition(memoizedLimit.running, emptyFold, {
        registry,
        terminal: memoizedLimit.terminal,
      }),
    ).toBe('rerun');
    // On the v1 domain (no memoize, no escalated) the tables coincide.
    const okPair = pair('ok');
    okPair.running.hashVersion = 1;
    okPair.terminal.hashVersion = 1;
    expect(
      replayDisposition(okPair.running, emptyFold, { registry, terminal: okPair.terminal }),
    ).toBe('replay');
  });

  it('classifyAgentError follows the docs/03 section 6.4 split', () => {
    expect(classifyAgentError({ kind: 'schema-mismatch', retryable: false })).toBe('task');
    expect(classifyAgentError({ kind: 'terminal', retryable: false })).toBe('task');
    expect(classifyAgentError({ kind: 'tool', retryable: false })).toBe('task');
    expect(classifyAgentError({ kind: 'tool', retryable: true })).toBe('transport');
    expect(classifyAgentError({ kind: 'transport', retryable: true })).toBe('transport');
    expect(classifyAgentError({ kind: 'rate-limit', retryable: true })).toBe('transport');
    expect(classifyAgentError({ kind: 'budget', retryable: false })).toBe('transport');
  });
});

describe('buildAbandonFold (M2-T06; docs/03 sections 6.2, 8.4)', () => {
  it('covers the target and its child scope-prefix transitively, first-wins', () => {
    seq = 0;
    const spawn = entry({ status: 'running', scope: '' });
    const childA = entry({ status: 'running', scope: agentScope('', spawn.seq) });
    const grandchild = entry({
      status: 'running',
      scope: `${agentScope('', spawn.seq)}/par:0:1`,
    });
    const sibling = entry({ status: 'running', scope: '' });
    const abandon = entry({
      kind: 'abandon',
      ref: spawn.seq,
      abandon: { target: spawn.seq, authorizedBy: 0, reason: 'cancelled by revision' },
    });
    const secondAbandon = entry({
      kind: 'abandon',
      ref: childA.seq,
      abandon: { target: childA.seq, authorizedBy: 0, reason: 'noop: already covered' },
    });
    const fold = buildAbandonFold([spawn, childA, grandchild, sibling, abandon, secondAbandon]);
    expect(fold.isAbandoned(spawn.seq)).toBe(true);
    expect(fold.isAbandoned(childA.seq)).toBe(true);
    expect(fold.isAbandoned(grandchild.seq)).toBe(true);
    expect(fold.isAbandoned(sibling.seq)).toBe(false);
  });
});

describe('KeyDeriver profiles and the support window (M2-T05; docs/03 section 4)', () => {
  const agentIdentity = {
    kind: 'agent',
    agentType: 'reviewer',
    modelSpec: { kind: 'model', model: 'anthropic:claude-sonnet-4', effort: 'high' },
    prompt: 'Review the attached diff for correctness.',
    schemaHash: 'f1342f68c9dbb49e8056d0414479659414776dfa4c599b3bebd166c8fdc416ba',
    toolsetHash: 'd2c59d7e8cb64de34366877e8764eab84d615942f14167d8715a15d8dbff105c',
    isolation: 'none',
  } as const;

  it('v2 reproduces the docs/03 worked-example key; v1 strips effort', () => {
    const v2Key = deriverV2.deriveKey(deriverV2.project(agentIdentity) as Record<string, unknown>);
    expect(v2Key).toBe('66ef15922e576a8f6884b28176c8c21fee9b4d3bb98c76592ed6ca1d3c8f1062');
    const projected = deriverV1.project(agentIdentity);
    expect(projected).not.toBe('incomparable');
    expect((projected as { modelSpec: unknown }).modelSpec).toEqual({
      model: 'anthropic:claude-sonnet-4',
    });
    const v1Key = deriverV1.deriveKey(projected as Record<string, unknown>);
    expect(v1Key).not.toBe(v2Key);
    // The v1 predicate is effort-insensitive: a different effort derives
    // the SAME v1 key.
    const lowEffort = {
      ...agentIdentity,
      modelSpec: { ...agentIdentity.modelSpec, effort: 'low' as const },
    };
    expect(deriverV1.deriveKey(deriverV1.project(lowEffort) as Record<string, unknown>)).toBe(
      v1Key,
    );
  });

  it('features outside the v1 domain are incomparable, never false matches', () => {
    expect(deriverV1.project({ kind: 'rand', subtype: 'now' })).not.toBe('incomparable');
    expect(registryKeyRing(registry).keyFor({ kind: 'rand', subtype: 'now' }, 99)).toBe(
      'incomparable',
    );
  });

  it('rejects malformed extraDerivers and accepts real ones', () => {
    expect(() => buildDeriverRegistry([{ nope: true }])).toThrow('KeyDeriver SPI');
    const withV0 = buildDeriverRegistry([{ ...deriverV1, hashVersion: 0 }]);
    expect(withV0.has(0)).toBe(true);
  });

  it('the compatibility scan refuses out-of-window journals side-effect free', () => {
    seq = 0;
    const tooOld = [entry({ hashVersion: 0 })];
    expect(() => scanJournalCompatibility('r', tooOld, registry)).toThrow(
      expect.objectContaining({ subCode: 'HASH_VERSION_TOO_OLD' }) as Error,
    );
    const fromFuture = [entry({ hashVersion: 3 })];
    expect(() => scanJournalCompatibility('r', fromFuture, registry)).toThrow(
      expect.objectContaining({ subCode: 'HASH_VERSION_TOO_NEW' }) as Error,
    );
    // With the matching deriver supplied, the same journal scans clean.
    const extended = buildDeriverRegistry([{ ...deriverV1, hashVersion: 0 }]);
    expect(() => scanJournalCompatibility('r', tooOld, extended)).not.toThrow();
  });

  it('mixed-version journals match each entry under its own version', () => {
    seq = 0;
    // Two identical v1 calls paid before an upgrade (ordinals 0 and 1 in
    // the v1 space), then a resume with three identical calls: the third
    // goes live and is written with hashVersion 2, ordinal 0 in its own
    // space (docs/03, section 4.4).
    const v1Key = deriverV1.deriveKey(deriverV1.project(agentIdentity) as Record<string, unknown>);
    const journal: JournalEntry[] = [];
    for (const ordinal of [0, 1]) {
      const running = entry({ hashVersion: 1, key: v1Key, ordinal, status: 'running' });
      journal.push(
        running,
        entry({ hashVersion: 1, key: v1Key, ordinal, ref: running.seq, status: 'ok' }),
      );
    }
    const matcher = new JournalMatcher(journal, {
      keyRing: registryKeyRing(registry),
      disposition: dispositionHook(buildAbandonFold(journal), registry),
    });
    expect(matcher.match('', agentIdentity, 'scoped').kind).toBe('replay');
    expect(matcher.match('', agentIdentity, 'scoped').kind).toBe('replay');
    expect(matcher.match('', agentIdentity, 'scoped').kind).toBe('live');
  });
});

describe('DEF-1 synthetic cassette scenarios (M2-T06)', () => {
  it('abandon-subtree: ok, escalated, and hanging running all skip with zero live calls', async () => {
    seq = 0;
    const spawnKey = deriveContentKey({
      kind: 'agent',
      agentType: '',
      modelSpec: { kind: 'model', model: 'fake:model' },
      prompt: 'branch root',
      schemaHash: EMPTY_SCHEMA_HASH,
      toolsetHash: EMPTY_TOOLSET_HASH,
      isolation: 'none',
    });
    const root = entry({ status: 'running', key: spawnKey });
    const rootTerminal = entry({ key: spawnKey, ref: root.seq, status: 'ok', value: 'done' });
    const childScope = agentScope('', root.seq);
    const childOk = entry({ status: 'running', scope: childScope });
    const childOkTerminal = entry({ scope: childScope, ref: childOk.seq, status: 'ok' });
    const childHanging = entry({ status: 'running', scope: childScope });
    const abandon = entry({
      kind: 'abandon',
      ref: root.seq,
      abandon: { target: root.seq, authorizedBy: 0, reason: 'cancel_task' },
    });
    const journal = [root, rootTerminal, childOk, childOkTerminal, childHanging, abandon];

    const adapter = scriptedAdapter(() => ({ text: 'MUST NOT RUN' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      priorEntries: journal,
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      const full = await ctx.agent('branch root', { result: 'full' });
      return full.status;
    });
    const status = await executeWorkflow(internals, wf, undefined);
    expect(status).toBe('skipped');
    expect(adapter.calls).toHaveLength(0);
    // Zero spend increment for the skipped subtree.
    expect(internals.budget.spent().usd).toBe(0);
  });

  it('memoize-classifier: task-class replays, transport-class reruns', async () => {
    // First run: two spawns with memoizeOutcome, one schema-mismatch
    // (task), one rate-limit (transport).
    const store = new InMemoryStore();
    const firstAdapter = scriptedAdapter((req) => {
      const text = (req.messages[0]?.parts[0] as { text: string }).text;
      if (text === 'task-fail') {
        return { text: 'not json at all' };
      }
      return {
        error: {
          code: 'agent',
          message: '429',
          retryable: true,
          data: { kind: 'rate-limit', retryAfterMs: 1 },
        },
      };
    });
    const first = makeInternals({
      adapters: [firstAdapter],
      routing: { loop: 'fake:model', extract: 'fake:model' },
      store,
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      const a = await ctx.agent('task-fail', {
        schema: { type: 'object', additionalProperties: false, properties: {}, required: [] },
        memoizeOutcome: true,
        result: 'full',
        limits: { maxTurns: 3 },
      });
      const b = await ctx.agent('transport-fail', { memoizeOutcome: true, result: 'full' });
      return [a.status, a.error?.kind, b.status, b.error?.kind];
    });
    const firstOut = (await executeWorkflow(first.internals, wf, undefined)) as unknown[];
    expect(firstOut).toEqual(['error', 'schema-mismatch', 'error', 'rate-limit']);

    // Resume: the task-class failure replays memoized; the transport one
    // reruns live (and this time succeeds).
    const prior = await store.load('test-run');
    const secondAdapter = scriptedAdapter(() => ({ text: 'recovered' }));
    const second = makeInternals({
      adapters: [secondAdapter],
      routing: { loop: 'fake:model', extract: 'fake:model' },
      priorEntries: prior,
    });
    const secondOut = (await executeWorkflow(second.internals, wf, undefined)) as unknown[];
    expect(secondOut[0]).toBe('error');
    expect(secondOut[1]).toBe('schema-mismatch');
    expect(secondOut[2]).toBe('ok');
    // Exactly one live call: the transport rerun.
    expect(secondAdapter.calls).toHaveLength(1);
    const firstPart = secondAdapter.calls[0]?.messages[0]?.parts[0];
    expect(firstPart?.type === 'text' && firstPart.text).toBe('transport-fail');
  });
});
