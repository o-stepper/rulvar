import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { defineWorkflow, executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter } from '../engine/test-harness.js';
import type { JournalEntry } from '../l0/entries.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { deriveContentKey } from './identity.js';
import { JournalMatcher } from './matching.js';
import { formatScopePath, parseScopePath } from './scope.js';
import { validateEntryShape } from './kinds.js';

let seqCounter = 0;
function op(
  scope: string,
  key: string,
  status: 'ok' | 'error' | 'cancelled' | 'running',
  extra?: Partial<JournalEntry>,
): JournalEntry[] {
  const running: JournalEntry = {
    hashVersion: 2,
    seq: seqCounter++,
    scope,
    key,
    ordinal: 0,
    kind: 'agent',
    status: 'running',
    spanId: 's',
    startedAt: 't',
    ...extra,
  };
  if (status === 'running') {
    return [running];
  }
  const terminal: JournalEntry = {
    ...running,
    seq: seqCounter++,
    ref: running.seq,
    status,
    value: status === 'ok' ? { from: key } : undefined,
  };
  return [running, terminal];
}

const idA = { kind: 'step', key: 'a', deps: [] as never[] } as const;
const idB = { kind: 'step', key: 'b', deps: [] as never[] } as const;
const idC = { kind: 'step', key: 'c', deps: [] as never[] } as const;
const keyOf = deriveContentKey;

describe('scoped forward-matching (M2-T03; docs/03 section 7)', () => {
  it('replays hits in order and pays exactly one live call for an insert', () => {
    seqCounter = 0;
    const journal = [...op('', keyOf(idA), 'ok'), ...op('', keyOf(idC), 'ok')];
    const matcher = new JournalMatcher(journal);
    // Body order after the edit: a, b (inserted), c.
    expect(matcher.match('', idA, 'scoped').kind).toBe('replay');
    expect(matcher.match('', idB, 'scoped').kind).toBe('live');
    // Insertion stability: the miss did not extinguish c.
    expect(matcher.match('', idC, 'scoped').kind).toBe('replay');
    const report = matcher.report();
    expect(report).toMatchObject({ hits: 2, misses: 1, orphaned: [] });
  });

  it('marks deleted calls orphaned, never re-paid', () => {
    seqCounter = 0;
    const journal = [...op('', keyOf(idA), 'ok'), ...op('', keyOf(idB), 'ok')];
    const matcher = new JournalMatcher(journal);
    expect(matcher.match('', idB, 'scoped').kind).toBe('replay');
    const report = matcher.report();
    expect(report.orphaned).toEqual([0]);
  });

  it('identical calls bind in journal order (documented residual)', () => {
    seqCounter = 0;
    const journal = [...op('', keyOf(idA), 'ok'), ...op('', keyOf(idA), 'error')];
    const matcher = new JournalMatcher(journal);
    const first = matcher.match('', idA, 'scoped');
    expect(first.kind).toBe('replay');
    const second = matcher.match('', idA, 'scoped');
    expect(second.kind).toBe('rerun');
  });

  it('scopes are independent; cache mode matches across the whole run', () => {
    seqCounter = 0;
    const journal = [...op('par:0:0', keyOf(idA), 'ok')];
    const matcher = new JournalMatcher(journal);
    expect(matcher.match('', idA, 'scoped').kind).toBe('live');
    expect(matcher.match('', idA, 'cache').kind).toBe('replay');
    // Consumed by the cache hit: a second cache lookup misses.
    expect(matcher.match('', idA, 'cache').kind).toBe('live');
  });

  it("mode 'never' always goes live; dangling running redispatches", () => {
    seqCounter = 0;
    const journal = [...op('', keyOf(idA), 'ok'), ...op('', keyOf(idB), 'running')];
    const matcher = new JournalMatcher(journal);
    expect(matcher.match('', idA, 'never').kind).toBe('live');
    const dangling = matcher.match('', idB, 'scoped');
    expect(dangling.kind).toBe('rerun-dangling');
  });

  it('cancelled and error rerun under the interim round-1 disposition', () => {
    seqCounter = 0;
    const journal = [...op('', keyOf(idA), 'cancelled'), ...op('', keyOf(idB), 'error')];
    const matcher = new JournalMatcher(journal);
    expect(matcher.match('', idA, 'scoped').kind).toBe('rerun');
    expect(matcher.match('', idB, 'scoped').kind).toBe('rerun');
  });

  it('property: insertion stability holds for arbitrary subsequences', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), { minLength: 1, maxLength: 8 }),
        fc.func(fc.boolean()),
        (labels, keep) => {
          seqCounter = 0;
          const identities = labels.map(
            (label) => ({ kind: 'step', key: label, deps: [] as never[] }) as const,
          );
          const journal = identities.flatMap((identity) => op('', keyOf(identity), 'ok'));
          const matcher = new JournalMatcher(journal);
          // The edited body keeps an arbitrary subsequence and inserts new
          // calls anywhere; every kept call MUST replay.
          let hits = 0;
          for (const [index, identity] of identities.entries()) {
            if (keep(index)) {
              const result = matcher.match('', identity, 'scoped');
              expect(result.kind).toBe('replay');
              hits += 1;
            } else {
              const inserted = {
                kind: 'step',
                key: `${labels[index]}-new`,
                deps: [] as never[],
              } as const;
              expect(matcher.match('', inserted, 'scoped').kind).toBe('live');
            }
          }
          expect(matcher.report().hits).toBe(hits);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('resume through ctx (M2-T03)', () => {
  async function firstRun(): Promise<{ entries: JournalEntry[]; values: unknown[] }> {
    const adapter = scriptedAdapter((req) => ({
      text: `live:${(req.messages[0]?.parts[0] as { text: string }).text}`,
    }));
    const store = new InMemoryStore();
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      store,
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      const a = await ctx.agent('alpha');
      const t = ctx.now();
      const s = await ctx.step('compute', () => Promise.resolve({ n: 41 }));
      return [a, t, s];
    });
    const values = (await executeWorkflow(internals, wf, undefined)) as unknown[];
    return { entries: await store.load('test-run'), values };
  }

  it('replays agents, steps, and shims byte-identically with zero adapter calls', async () => {
    const first = await firstRun();
    const adapter = scriptedAdapter(() => ({ text: 'MUST NOT BE CALLED' }));
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      priorEntries: first.entries,
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      const a = await ctx.agent('alpha');
      const t = ctx.now();
      const s = await ctx.step('compute', () => Promise.reject(new Error('must not rerun')));
      return [a, t, s];
    });
    const values = (await executeWorkflow(internals, wf, undefined)) as unknown[];
    expect(values).toEqual(first.values);
    expect(adapter.calls).toHaveLength(0);
    const replayedEnds = events.all.filter((e) => e.type === 'agent:end');
    expect(replayedEnds).toHaveLength(1);
  });

  it('an inserted call pays exactly one live call; the ledger never double-counts', async () => {
    const first = await firstRun();
    const priorUsage = first.entries
      .filter((e) => e.usage !== undefined)
      .reduce((sum, e) => sum + (e.usage?.inputTokens ?? 0), 0);
    const adapter = scriptedAdapter(() => ({ text: 'inserted-live' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      priorEntries: first.entries,
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      const a = await ctx.agent('alpha');
      const extra = await ctx.agent('inserted between');
      const t = ctx.now();
      const s = await ctx.step('compute', () => Promise.resolve({ n: 999 }));
      return [a, extra, t, s];
    });
    const values = (await executeWorkflow(internals, wf, undefined)) as unknown[];
    expect(values[0]).toBe(first.values[0]);
    expect(values[1]).toBe('inserted-live');
    expect(values[2]).toBe(first.values[1]);
    expect((values[3] as { n: number }).n).toBe(41);
    expect(adapter.calls).toHaveLength(1);
    // Ledger equals uninterrupted run: prior fold plus exactly the new call.
    const spent = internals.budget.spent();
    expect(spent.usage.inputTokens).toBeGreaterThan(priorUsage);
    expect(spent.agentsSpawned).toBe(2);
    expect(internals.replayer.resumeReport()).toMatchObject({ misses: 1, orphaned: [] });
  });

  it('a dangling running agent redispatches with the terminal referencing the original seq', async () => {
    const first = await firstRun();
    // Simulate a crash: strip the agent terminal entry.
    const truncated = first.entries.filter((e) => !(e.kind === 'agent' && e.ref !== undefined));
    const adapter = scriptedAdapter(() => ({ text: 'redispatched' }));
    const store = new InMemoryStore();
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      priorEntries: truncated,
      store,
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => ctx.agent('alpha'));
    const value = await executeWorkflow(internals, wf, undefined);
    expect(value).toBe('redispatched');
    expect(adapter.calls).toHaveLength(1);
    const appended = await store.load('test-run');
    const terminal = appended.find((e) => e.kind === 'agent' && e.ref !== undefined);
    const originalRunning = truncated.find((e) => e.kind === 'agent');
    expect(terminal?.ref).toBe(originalRunning?.seq);
  });
});

describe('kinds registry v2 validators and scope grammar (M2-T04)', () => {
  const base: JournalEntry = {
    hashVersion: 2,
    seq: 10,
    scope: '',
    key: 'k',
    ordinal: 0,
    kind: 'rand',
    status: 'ok',
    spanId: 's',
    startedAt: 't',
  };

  it('validates the docs/03 payload examples per kind', () => {
    expect(validateEntryShape({ ...base, value: { subtype: 'now', value: 123 } })).toEqual([]);
    expect(
      validateEntryShape({
        ...base,
        kind: 'decision',
        value: { decisionType: 'spawn-admission' },
      }),
    ).toEqual([]);
    expect(
      validateEntryShape({
        ...base,
        kind: 'resolution',
        ref: 3,
        resolution: { by: 'external', value: { ok: true }, target: 3 },
      }),
    ).toEqual([]);
    expect(validateEntryShape({ ...base, kind: 'external', status: 'suspended' })).toEqual([]);
  });

  it('rejects illegal statuses, missing payloads, and forward refs', () => {
    expect(validateEntryShape({ ...base, status: 'error' })).not.toEqual([]);
    expect(validateEntryShape({ ...base, value: { subtype: 'nope', value: 1 } })).not.toEqual([]);
    expect(validateEntryShape({ ...base, kind: 'decision', value: {} })).not.toEqual([]);
    expect(validateEntryShape({ ...base, kind: 'resolution', ref: 99 })).not.toEqual([]);
    expect(
      validateEntryShape({ ...base, kind: 'external', status: 'suspended', deadlineAt: 'x' }),
    ).not.toEqual([]);
    expect(validateEntryShape({ ...base, kind: 'rand', ref: 3 })).not.toEqual([]);
  });

  it('parses and round-trips the frozen scope grammar', () => {
    const cases = [
      '',
      'par:0:2',
      'par:0:2/pipe:1:4',
      'wf:extract-invoices:1',
      'wf:name:with:colons:3',
      'agent:17',
      'plan/01JZK3TQ8R4M5N6P7Q8R9S0T1U',
      'wf:child:0/par:3:1/agent:9',
    ];
    for (const path of cases) {
      expect(formatScopePath(parseScopePath(path))).toBe(path);
    }
    expect(parseScopePath('wf:name:with:colons:3')[0]).toEqual({
      kind: 'workflow',
      name: 'name:with:colons',
      ordinal: 3,
    });
    expect(() => parseScopePath('par:x:1')).toThrow();
    expect(() => parseScopePath('plan/not-a-ulid')).toThrow();
    expect(() => parseScopePath('mystery:1')).toThrow();
  });

  it('property: built scope paths always round-trip', () => {
    const segment = fc.oneof(
      fc
        .tuple(fc.nat({ max: 99 }), fc.nat({ max: 99 }))
        .map(([site, branch]) => `par:${site}:${branch}`),
      fc
        .tuple(fc.nat({ max: 99 }), fc.nat({ max: 99 }))
        .map(([stage, item]) => `pipe:${stage}:${item}`),
      fc
        .tuple(fc.stringMatching(/^[a-z][a-z0-9:-]{0,10}[a-z0-9]$/), fc.nat({ max: 99 }))
        .map(([name, ordinal]) => `wf:${name}:${ordinal}`),
      fc.nat({ max: 999 }).map((seq) => `agent:${seq}`),
    );
    fc.assert(
      fc.property(fc.array(segment, { maxLength: 5 }), (segments) => {
        const path = segments.join('/');
        expect(formatScopePath(parseScopePath(path))).toBe(path);
      }),
      { numRuns: 200 },
    );
  });
});
