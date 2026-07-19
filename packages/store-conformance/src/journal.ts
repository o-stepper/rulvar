/**
 * journalStoreConformance (M2-T11, DEF-4): the executable definition of
 * the JournalStore seam. Mandatory checks for the conformance tier:
 * A1 append atomicity, A2 total per-run order, A3 read-your-writes,
 * A4 opaque payload, A5 monotonic seq (a stale or duplicate seq append
 * rejects with the typed journal_order_violation and never persists),
 * meta separation, the golden fold-state fixture, the end-to-end
 * decide-once oracle, and the abandon fixture (zero live classes inside
 * a skipped subtree, zero ledger increment).
 *
 * The oracle and the abandon fixture drive the kernel (Replayer,
 * ResolutionFold, the DEF-1 predicate) directly over the store under
 * test, in strict mode, so "zero live calls" holds by construction: no
 * dispatch surface exists below the kernel. The engine-level variants
 * (FakeAdapter call counters) live in the M2 cassette suite
 * (@rulvar/testing).
 */
import {
  buildDeriverRegistry,
  deriveContentKey,
  dispositionHook,
  Replayer,
  agentScope,
  type JournalEntry,
  type JournalStore,
  type RunMeta,
} from '@rulvar/core';
import {
  ensure,
  makeSuite,
  stableStringify,
  type ConformanceCheck,
  type ConformanceSuite,
  type StoreFactory,
} from './types.js';
import {
  foldStateSha256,
  GOLDEN_FOLD_JOURNAL,
  GOLDEN_FOLD_STATE_SHA256,
} from './fixtures/golden-fold.js';

const RUN = 'conformance-run';

function baseEntry(seq: number, overrides?: Partial<JournalEntry>): JournalEntry {
  return {
    hashVersion: 2,
    seq,
    scope: '',
    key: `conf-key-${seq}`,
    ordinal: 0,
    kind: 'step',
    status: 'ok',
    value: { seq },
    spanId: 'conf-span',
    startedAt: new Date(1_700_000_000_000 + seq * 1000).toISOString(),
    ...overrides,
  };
}

function sameEntry(a: JournalEntry, b: JournalEntry): boolean {
  return stableStringify(a) === stableStringify(b);
}

function meta(runId: string, overrides?: Partial<RunMeta>): RunMeta {
  return {
    runId,
    status: 'running',
    updatedAt: new Date(1_700_000_000_000).toISOString(),
    ...overrides,
  };
}

export function journalStoreConformance(mk: StoreFactory<JournalStore>): ConformanceSuite {
  const checks: ConformanceCheck[] = [
    {
      id: 'a1-append-atomicity',
      title: 'an append is all-or-nothing; a torn write is never observable',
      async run() {
        const store = await mk();
        const big = 'x'.repeat(8192);
        const submitted = Array.from({ length: 12 }, (_, i) =>
          baseEntry(i, { value: { seq: i, blob: `${big}-${i}`, sentinel: 'END-OF-ENTRY' } }),
        );
        // Concurrent appends interleaved with loads: every visible entry
        // is a whole submitted entry at every point in time.
        const appends = submitted.map((item) => store.append(RUN, item));
        const midLoads = [store.load(RUN), store.load(RUN)];
        await Promise.all([...appends, ...midLoads]);
        for (const seen of await Promise.all(midLoads)) {
          for (const item of seen) {
            const original = submitted.find((candidate) => candidate.seq === item.seq);
            ensure(
              original !== undefined && sameEntry(item, original),
              'a1-append-atomicity',
              `a load observed a torn or foreign entry at seq ${item.seq}`,
            );
          }
        }
        const loaded = await store.load(RUN);
        ensure(
          loaded.length === submitted.length,
          'a1-append-atomicity',
          `expected ${submitted.length} whole entries, loaded ${loaded.length}`,
        );
        for (const item of loaded) {
          const original = submitted.find((candidate) => candidate.seq === item.seq);
          ensure(
            original !== undefined && sameEntry(item, original),
            'a1-append-atomicity',
            `loaded entry seq ${item.seq} does not equal the appended entry`,
          );
        }
      },
    },
    {
      id: 'a2-total-order',
      title: 'load returns the order of successful appends, stable across loads',
      async run() {
        const store = await mk();
        const entries = Array.from({ length: 10 }, (_, i) => baseEntry(i));
        for (const item of entries) {
          await store.append(RUN, item);
        }
        const first = await store.load(RUN);
        ensure(
          first.map((item) => item.seq).join(',') === entries.map((item) => item.seq).join(','),
          'a2-total-order',
          `sequential appends loaded out of order: ${first.map((item) => item.seq).join(',')}`,
        );
        // Concurrent appenders: the store must serialize them into ONE
        // unambiguous order, identical on every subsequent load.
        await Promise.all(
          Array.from({ length: 8 }, (_, i) => store.append(RUN, baseEntry(10 + i))),
        );
        const second = await store.load(RUN);
        const third = await store.load(RUN);
        ensure(
          second.map((item) => item.seq).join(',') === third.map((item) => item.seq).join(','),
          'a2-total-order',
          'two loads of the same run disagree on entry order',
        );
        ensure(
          second.length === 18 && new Set(second.map((item) => item.seq)).size === 18,
          'a2-total-order',
          'concurrent appends were lost or duplicated',
        );
        ensure(
          second
            .slice(0, 10)
            .map((item) => item.seq)
            .join(',') === entries.map((item) => item.seq).join(','),
          'a2-total-order',
          'later appends reordered the existing prefix',
        );
      },
    },
    {
      id: 'a3-read-your-writes',
      title: 'an acknowledged append is visible to an immediately following load',
      async run() {
        const store = await mk();
        for (let i = 0; i < 5; i += 1) {
          const item = baseEntry(i);
          await store.append(RUN, item);
          const loaded = await store.load(RUN);
          const last = loaded[loaded.length - 1];
          ensure(
            loaded.length === i + 1 && last !== undefined && sameEntry(last, item),
            'a3-read-your-writes',
            `append of seq ${i} was acknowledged but not visible to load`,
          );
        }
      },
    },
    {
      id: 'a4-opaque-payload',
      title: 'unknown kinds and unknown fields round-trip byte-exactly, never normalized',
      async run() {
        const store = await mk();
        // A raw round-1 entry (legacy `v`, no hashVersion), an unknown
        // kind, and unknown fields: the store persists bytes without
        // interpretation; normalization is read-side in the kernel and
        // never rewrites the store.
        const exotic = {
          v: 1,
          seq: 0,
          scope: 'par:0:1/wormhole',
          key: 'k-exotic',
          ordinal: 3,
          kind: 'wormhole.v9',
          status: 'ok',
          value: {
            unicode: 'δοκιμή ☃ 🚀'.normalize('NFC'),
            float: 0.1 + 0.2,
            nested: { deep: [1, 2, { three: null }] },
          },
          futureField: { shape: 'unknown' },
          spanId: 's',
          startedAt: '2026-01-01T00:00:00.000Z',
        } as unknown as JournalEntry;
        await store.append(RUN, exotic);
        const [loaded] = await store.load(RUN);
        ensure(
          loaded !== undefined && sameEntry(loaded, exotic),
          'a4-opaque-payload',
          'the exotic entry did not round-trip byte-exactly (normalized, stripped, or rewritten)',
        );
        ensure(
          (loaded as unknown as { hashVersion?: number }).hashVersion === undefined,
          'a4-opaque-payload',
          'the store injected hashVersion into a legacy entry (normalization is read-side only)',
        );
      },
    },
    {
      id: 'a5-monotonic-seq',
      title: 'append rejects a duplicate or stale seq with the typed journal_order_violation',
      async run() {
        const store = await mk();
        await store.append(RUN, baseEntry(0));
        await store.append(RUN, baseEntry(1));
        for (const stale of [1, 0]) {
          let thrown: unknown;
          try {
            await store.append(RUN, baseEntry(stale, { value: { seq: stale, second: true } }));
          } catch (error) {
            thrown = error;
          }
          ensure(
            (thrown as { code?: string } | undefined)?.code === 'journal_order_violation',
            'a5-monotonic-seq',
            `append of stale seq ${stale} must reject with code 'journal_order_violation'`,
          );
        }
        const loaded = await store.load(RUN);
        ensure(
          loaded.map((item) => item.seq).join(',') === '0,1',
          'a5-monotonic-seq',
          'a rejected stale append must never become visible',
        );
        // The guard rejects only stale seqs; the true next always lands.
        await store.append(RUN, baseEntry(2));
        ensure(
          (await store.load(RUN)).length === 3,
          'a5-monotonic-seq',
          'the append of the true next seq must succeed after rejections',
        );
      },
    },
    {
      id: 'a5-stale-tail-race',
      title: 'two writers appending the same next seq: exactly one persists, the loser is typed',
      async run() {
        const store = await mk();
        for (let i = 0; i < 3; i += 1) {
          await store.append(RUN, baseEntry(i));
        }
        const settled = await Promise.allSettled([
          store.append(RUN, baseEntry(3, { value: { seq: 3, writer: 'a' } })),
          store.append(RUN, baseEntry(3, { value: { seq: 3, writer: 'b' } })),
        ]);
        const fulfilled = settled.filter((item) => item.status === 'fulfilled');
        const rejected = settled.filter(
          (item): item is PromiseRejectedResult => item.status === 'rejected',
        );
        ensure(
          fulfilled.length === 1 && rejected.length === 1,
          'a5-stale-tail-race',
          `exactly one of two same-seq appends may persist (got ${fulfilled.length} fulfilled)`,
        );
        ensure(
          (rejected[0]?.reason as { code?: string } | undefined)?.code ===
            'journal_order_violation',
          'a5-stale-tail-race',
          "the losing writer must observe the typed 'journal_order_violation' conflict",
        );
        const loaded = await store.load(RUN);
        ensure(
          loaded.length === 4 && loaded.filter((item) => item.seq === 3).length === 1,
          'a5-stale-tail-race',
          'the journal must hold exactly one entry at the raced seq',
        );
        const seqs = loaded.map((item) => item.seq);
        ensure(
          seqs.every((seq, index) => index === 0 || seq > (seqs[index - 1] ?? Number.NaN)),
          'a5-stale-tail-race',
          'reloading after the race must show a strictly increasing total order',
        );
      },
    },
    {
      id: 'a5-stale-replayer-fencing',
      title:
        'two kernel replayers from the same tail: one append wins, the loser gets the conflict',
      async run() {
        const store = await mk();
        const seed = new Replayer({ runId: RUN, store });
        for (let i = 0; i < 3; i += 1) {
          await seed.appendSinglePhase({
            scope: '',
            key: `seed-${i}`,
            kind: 'step',
            status: 'ok',
            spanId: 'conf-span',
            value: { i },
          });
        }
        const tail = await store.load(RUN);
        const writerA = new Replayer({ runId: RUN, store, priorEntries: tail });
        const writerB = new Replayer({ runId: RUN, store, priorEntries: tail });
        const settled = await Promise.allSettled([
          writerA.appendSinglePhase({
            scope: '',
            key: 'race',
            kind: 'step',
            status: 'ok',
            spanId: 'conf-span',
            value: 'a',
          }),
          writerB.appendSinglePhase({
            scope: '',
            key: 'race',
            kind: 'step',
            status: 'ok',
            spanId: 'conf-span',
            value: 'b',
          }),
        ]);
        const rejected = settled.filter(
          (item): item is PromiseRejectedResult => item.status === 'rejected',
        );
        ensure(
          settled.filter((item) => item.status === 'fulfilled').length === 1 &&
            rejected.length === 1,
          'a5-stale-replayer-fencing',
          'exactly one stale-tail replayer append may persist',
        );
        ensure(
          (rejected[0]?.reason as { code?: string } | undefined)?.code ===
            'journal_order_violation',
          'a5-stale-replayer-fencing',
          "the losing replayer must observe the typed 'journal_order_violation' conflict",
        );
        const reload = await store.load(RUN);
        const seqs = reload.map((item) => item.seq);
        ensure(
          new Set(seqs).size === seqs.length &&
            seqs.every((seq, index) => index === 0 || seq > (seqs[index - 1] ?? Number.NaN)),
          'a5-stale-replayer-fencing',
          'reopening the store must show a unique, strictly increasing seq order',
        );
      },
    },
    {
      id: 'meta-separation',
      title:
        'putMeta replaces the run record; listRuns filters without payload parsing; delete removes both',
      async run() {
        const store = await mk();
        ensure(
          (await store.load('never-written')).length === 0,
          'meta-separation',
          'load of an unknown run must return an empty journal',
        );
        await store.append(RUN, baseEntry(0));
        await store.putMeta(meta(RUN, { name: 'wf-a', tags: ['team:core'] }));
        await store.putMeta(meta('other-run', { status: 'suspended', name: 'wf-b' }));
        const all = await store.listRuns();
        ensure(
          all.filter((candidate) => candidate.runId === RUN).length === 1,
          'meta-separation',
          'putMeta must upsert one record per run',
        );
        await store.putMeta(meta(RUN, { status: 'suspended', name: 'wf-a', tags: ['team:core'] }));
        const suspended = await store.listRuns({ status: 'suspended' });
        ensure(
          suspended.some((candidate) => candidate.runId === RUN) &&
            suspended.every((candidate) => candidate.status === 'suspended'),
          'meta-separation',
          'listRuns must reflect the replaced meta and honor the status filter',
        );
        const byName = await store.listRuns({ name: 'wf-b' });
        ensure(
          byName.length === 1 && byName[0]?.runId === 'other-run',
          'meta-separation',
          'listRuns must honor the name filter',
        );
        const byTag = await store.listRuns({ tags: ['team:core'] });
        ensure(
          byTag.length === 1 && byTag[0]?.runId === RUN,
          'meta-separation',
          'listRuns must honor the tags filter',
        );
        // Optional RunMeta fields must round-trip byte-faithfully: the
        // engine restores the run's budget ceiling from budgetUsd on
        // resume (a store that drops it silently uncaps resumed runs),
        // derives each resume segment's event seq / span-id base
        // from segments (a store that drops it degrades resumed-run
        // telemetry counters to per-segment; v1.22.0 review P1-2), and
        // hosts verify re-supplied resume args against the genesis
        // argsProvided/argsHash binding (v1.23.0 review: a store that
        // drops them disables the args-divergence refusal).
        await store.putMeta(
          meta(RUN, {
            status: 'suspended',
            name: 'wf-a',
            tags: ['team:core'],
            budgetUsd: 12.5,
            segments: 3,
            argsProvided: true,
            argsHash: 'a'.repeat(64),
          }),
        );
        const roundTripped = (await store.listRuns()).find((candidate) => candidate.runId === RUN);
        ensure(
          roundTripped?.budgetUsd === 12.5,
          'meta-separation',
          'putMeta/listRuns must round-trip optional RunMeta fields (budgetUsd)',
        );
        ensure(
          roundTripped?.segments === 3,
          'meta-separation',
          'putMeta/listRuns must round-trip optional RunMeta fields (segments)',
        );
        ensure(
          roundTripped?.argsProvided === true && roundTripped.argsHash === 'a'.repeat(64),
          'meta-separation',
          'putMeta/listRuns must round-trip optional RunMeta fields (argsProvided, argsHash)',
        );
        await store.delete(RUN);
        ensure(
          (await store.load(RUN)).length === 0 &&
            !(await store.listRuns()).some((candidate) => candidate.runId === RUN),
          'meta-separation',
          'delete must remove the journal and the meta record',
        );
      },
    },
    {
      id: 'golden-fold-state',
      title: 'the kernel fold over the stored golden journal hashes to the reference',
      async run() {
        const store = await mk();
        for (const item of GOLDEN_FOLD_JOURNAL) {
          await store.append(RUN, item);
        }
        const loaded = await store.load(RUN);
        const hash = foldStateSha256(loaded);
        ensure(
          hash === GOLDEN_FOLD_STATE_SHA256,
          'golden-fold-state',
          `fold state hash ${hash} differs from the reference ${GOLDEN_FOLD_STATE_SHA256}: ` +
            'the store influenced replay semantics',
        );
      },
    },
    {
      id: 'decide-once-oracle',
      title:
        'a scripted race yields exactly one applied classification, then replays with the same winner',
      async run() {
        const store = await mk();
        const writer = new Replayer({ runId: RUN, store });
        const suspended = await writer.appendSuspended({
          scope: '',
          key: deriveContentKey({ kind: 'external', key: 'decide-once' }),
          kind: 'external',
          spanId: 'conf-span',
          value: { key: 'decide-once' },
        });
        const [first, second] = await Promise.all([
          writer.resolveSuspended(suspended.seq, {
            by: 'external',
            value: { decision: 'primary' },
          }),
          writer.resolveSuspended(suspended.seq, {
            by: 'timeout',
            value: { decision: 'fallback' },
          }),
        ]);
        const outcomes = [first, second];
        ensure(
          outcomes.filter((outcome) => outcome.applied).length === 1,
          'decide-once-oracle',
          'a race of two resolution attempts must settle exactly one applied',
        );
        const journaled = await store.load(RUN);
        ensure(
          journaled.filter((item) => item.kind === 'resolution').length === 2,
          'decide-once-oracle',
          'both attempts must be journaled (the loser is a journaled noop)',
        );
        // Replay-strict over the loaded journal: the fold reproduces the
        // live winner bit-identically, with zero live classes possible.
        const replayed = new Replayer({
          runId: RUN,
          store,
          priorEntries: journaled,
          strict: true,
        });
        const state = replayed.suspensionState(suspended.seq);
        const winnerSeq = outcomes.find((outcome) => outcome.applied)?.seq;
        ensure(
          state.state === 'resolved' && state.by === winnerSeq,
          'decide-once-oracle',
          'the replayed fold disagrees with the live winner',
        );
        const reload = await store.load(RUN);
        ensure(
          foldStateSha256(journaled) === foldStateSha256(reload),
          'decide-once-oracle',
          'two loads of the raced journal fold to different states',
        );
      },
    },
    {
      id: 'abandon-derived-skip',
      title: 'a journal with an abandoned branch replays with zero live classes inside the subtree',
      async run() {
        const store = await mk();
        const writer = new Replayer({ runId: RUN, store });
        const branchIdentity: Parameters<Replayer['match']>[1] = {
          kind: 'step',
          key: 'abandoned-branch',
          deps: [],
        };
        const spawn = await writer.appendRunning({
          scope: '',
          key: deriveContentKey(branchIdentity),
          kind: 'agent',
          spanId: 'conf-span',
        });
        const child = await writer.appendRunning({
          scope: agentScope('', spawn.seq),
          key: 'child-key',
          kind: 'agent',
          spanId: 'conf-span',
        });
        await writer.appendTerminal(child.seq, {
          status: 'ok',
          value: 'paid work',
          usage: { inputTokens: 500, outputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0 },
        });
        const abandonOutcome = await writer.abandonBranch({
          target: spawn.seq,
          authorizedBy: spawn.seq,
          reason: 'conformance abandon',
        });
        ensure(abandonOutcome.applied, 'abandon-derived-skip', 'the covering abandon must apply');

        const replayed = new Replayer({
          runId: RUN,
          store,
          priorEntries: await store.load(RUN),
          strict: true,
        });
        replayed.setDisposition(dispositionHook(replayed.fold.abandonFold, buildDeriverRegistry()));
        // Strict mode throws on any live class; the covered hanging
        // dispatch must derive skipped instead (DEF-1).
        const matched = replayed.match('', branchIdentity, 'scoped');
        ensure(
          matched.kind === 'skip',
          'abandon-derived-skip',
          `the abandoned dispatch must derive skipped, got '${matched.kind}'`,
        );
        const ledger = replayed.ledger();
        ensure(
          ledger.usage.inputTokens === 0 &&
            ledger.usage.outputTokens === 0 &&
            ledger.agentsSpawned === 0,
          'abandon-derived-skip',
          'derived-skipped entries must contribute a zero ledger increment',
        );
        const report = replayed.resumeReport();
        ensure(
          report.orphaned.length === 0,
          'abandon-derived-skip',
          'covered entries must be reported skipped, never orphaned',
        );
      },
    },
  ];
  return makeSuite('journalStoreConformance', checks);
}
