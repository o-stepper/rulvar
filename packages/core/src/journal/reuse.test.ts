import { describe, expect, it } from 'vitest';

import type { JournalEntry } from '../l0/entries.js';
import { buildDeriverRegistry, registryKeyRing } from './keyderiver.js';
import { buildAbandonFold, dispositionHook } from './disposition.js';
import { JournalMatcher } from './matching.js';
import { deriveContentKey } from './identity.js';
import { DedupIndex, evaluateReuse, nodeLinkKey } from './reuse.js';

let seqCounter = 0;
function mkEntry(
  patch: Partial<JournalEntry> & Pick<JournalEntry, 'kind' | 'status'>,
): JournalEntry {
  seqCounter += 1;
  return {
    hashVersion: 2,
    seq: patch.seq ?? seqCounter,
    scope: '',
    key: '',
    ordinal: 0,
    spanId: 's',
    startedAt: '2026-07-09T00:00:00.000Z',
    ...patch,
  };
}

const USAGE = { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
const priceUsd = (): number => 1;

function donorSet(
  status: 'ok' | 'cancelled' | 'error',
  opts?: { memoize?: boolean },
): {
  entries: JournalEntry[];
  root: JournalEntry;
  abandon: JournalEntry;
} {
  const root = mkEntry({
    kind: 'agent',
    status: 'running',
    scope: 'plan/DDDDDDDDDDDDDDDDDDDDDDDDDD',
    key: 'K1',
    value: { isolation: 'none' },
  });
  const terminal = mkEntry({
    kind: 'agent',
    status,
    scope: 'plan/DDDDDDDDDDDDDDDDDDDDDDDDDD',
    key: 'K1',
    ref: root.seq,
    usage: USAGE,
    servedBy: 'fake:model',
    ...(opts?.memoize === true ? { memoizeOutcome: true } : {}),
  });
  const abandon = mkEntry({
    kind: 'abandon',
    status: 'ok',
    ref: root.seq,
    abandon: {
      target: root.seq,
      authorizedBy: 1,
      nodeId: 'NDONOR',
      logicalTaskId: 'LT-D',
      reason: 'cancel_task',
    },
  });
  return { entries: [root, terminal, abandon], root, abandon };
}

describe('DedupIndex donor rules (docs/03, 9.3)', () => {
  it('surfaces a severed ok root as a reuse_full donor with its payment', () => {
    const { entries, root } = donorSet('ok');
    const index = DedupIndex.fold(entries, { priceUsd });
    const donors = index.donorsOf('K1');
    expect(donors).toHaveLength(1);
    expect(donors[0]).toMatchObject({
      rootEntryRef: root.seq,
      preAbandonStatus: 'ok',
      nodeId: 'NDONOR',
      logicalTaskId: 'LT-D',
    });
    expect(donors[0]?.paidUsd).toBeGreaterThan(0);
    const verdict = evaluateReuse(index, 'K1');
    expect(verdict.kind).toBe('reuse_full');
  });

  it('excludes memoized failures (retry intent belongs to invalidate/retry)', () => {
    const { entries } = donorSet('error', { memoize: true });
    const index = DedupIndex.fold(entries, { priceUsd });
    const verdict = evaluateReuse(index, 'K1');
    expect(verdict).toMatchObject({ kind: 'fresh', note: { reason: 'donor_failed' } });
  });

  it('grafts a severed-in-flight donor with paid entries; degrades unpinned worktrees', () => {
    const { entries } = donorSet('cancelled');
    const index = DedupIndex.fold(entries, { priceUsd });
    // cancelled terminal usage is excluded from eligible paid; give the
    // donor one completed paid member under its coverage.
    const member = mkEntry({
      kind: 'agent',
      status: 'ok',
      scope: 'plan/DDDDDDDDDDDDDDDDDDDDDDDDDD/agent:1',
      key: 'inner',
      usage: USAGE,
      servedBy: 'fake:model',
    });
    const withMember = DedupIndex.fold([...entries.slice(0, 2), member, entries[2]], {
      priceUsd,
    });
    expect(evaluateReuse(index, 'K1')).toMatchObject({
      kind: 'fresh',
      note: { reason: 'no_paid_entries' },
    });
    expect(evaluateReuse(withMember, 'K1').kind).toBe('admit_graft');

    // Worktree donors degrade to fresh graft_unsafe unless pinned.
    const worktreeRoot = mkEntry({
      kind: 'agent',
      status: 'running',
      scope: 'plan/WWWWWWWWWWWWWWWWWWWWWWWWWW',
      key: 'K2',
      value: { isolation: { kind: 'worktree' } },
    });
    const worktreeMember = mkEntry({
      kind: 'agent',
      status: 'ok',
      scope: 'plan/WWWWWWWWWWWWWWWWWWWWWWWWWW/agent:1',
      key: 'inner',
      usage: USAGE,
      servedBy: 'fake:model',
    });
    const worktreeAbandon = mkEntry({
      kind: 'abandon',
      status: 'ok',
      ref: worktreeRoot.seq,
      abandon: { target: worktreeRoot.seq, authorizedBy: 1, reason: 'cancel_task' },
    });
    const worktreeIndex = DedupIndex.fold([worktreeRoot, worktreeMember, worktreeAbandon], {
      priceUsd,
    });
    expect(evaluateReuse(worktreeIndex, 'K2')).toMatchObject({
      kind: 'fresh',
      note: { reason: 'graft_unsafe' },
    });
    const pinnedAbandon = mkEntry({
      kind: 'abandon',
      status: 'ok',
      ref: worktreeRoot.seq,
      abandon: {
        target: worktreeRoot.seq,
        authorizedBy: 1,
        reason: 'cancel_task',
        retainWorktree: true,
      },
    });
    const pinnedIndex = DedupIndex.fold([worktreeRoot, worktreeMember, pinnedAbandon], {
      priceUsd,
    });
    expect(evaluateReuse(pinnedIndex, 'K2').kind).toBe('admit_graft');
  });

  it('rejects at maxOscillationsPerKey via the link count (osc_guard)', () => {
    const { entries } = donorSet('ok');
    const linkOf = (n: number): JournalEntry =>
      mkEntry({
        kind: 'node.link',
        status: 'ok',
        scope: 'plan',
        key: nodeLinkKey('K1', 'plan/DDDDDDDDDDDDDDDDDDDDDDDDDD', `T${String(n)}`),
        value: {
          targetNodeId: `T${String(n)}`,
          targetScope: `plan/T${String(n)}`,
          donorScope: 'plan/DDDDDDDDDDDDDDDDDDDDDDDDDD',
          chain: ['plan/DDDDDDDDDDDDDDDDDDDDDDDDDD'],
          spawnKey: 'K1',
          logicalTaskId: 'LT-D',
          mode: 'full',
          claim: 'shared',
          reclaimedUsdAtLink: 1,
          donorRootRef: 1,
        },
      });
    const index = DedupIndex.fold([...entries, linkOf(1), linkOf(2)], { priceUsd });
    expect(index.oscillationCountOf('K1')).toBe(2);
    expect(evaluateReuse(index, 'K1')).toMatchObject({
      kind: 'reject_osc_guard',
      oscillationCount: 2,
    });
    // The abandoned-spend ledger folded both links.
    const spend = index.abandonedSpend();
    expect(spend.reclaimedUsd).toBe(2);
    expect(spend.byKey.K1?.oscillationCount).toBe(2);
    expect(spend.netLostUsd).toBe(spend.abandonedUsd - 2);
  });

  it('never surfaces live or done roots that lack a severing entry', () => {
    const root = mkEntry({
      kind: 'agent',
      status: 'running',
      scope: 'plan/LLLLLLLLLLLLLLLLLLLLLLLLLL',
      key: 'K3',
    });
    const done = mkEntry({
      kind: 'agent',
      status: 'ok',
      scope: 'plan/LLLLLLLLLLLLLLLLLLLLLLLLLL',
      key: 'K3',
      ref: root.seq,
    });
    const index = DedupIndex.fold([root, done], { priceUsd });
    expect(index.donorsOf('K3')).toHaveLength(0);
    expect(evaluateReuse(index, 'K3').kind).toBe('none');
  });
});

describe('scope-prefix aliasing (docs/03, 9.5): the matcher', () => {
  it('replays donor entries through the alias with pre-abandon status', () => {
    const registry = buildDeriverRegistry();
    // A donor completed inner step, covered by an abandon.
    const stepIdentity = { kind: 'step', key: 'step-key', deps: [] } as const;
    const stepKey = deriveContentKey(stepIdentity);
    const donorRoot = mkEntry({
      kind: 'step',
      status: 'running',
      scope: 'plan/DDDDDDDDDDDDDDDDDDDDDDDDDD',
      key: stepKey,
    });
    const donorTerminal = mkEntry({
      kind: 'step',
      status: 'ok',
      scope: 'plan/DDDDDDDDDDDDDDDDDDDDDDDDDD',
      key: stepKey,
      ref: donorRoot.seq,
      value: 'paid result',
    });
    const abandon = mkEntry({
      kind: 'abandon',
      status: 'ok',
      ref: donorRoot.seq,
      abandon: { target: donorRoot.seq, authorizedBy: 1, reason: 'cancel_task' },
    });
    const entries = [donorRoot, donorTerminal, abandon];
    const fold = buildAbandonFold(entries);
    const matcher = new JournalMatcher(entries, {
      keyRing: registryKeyRing(registry),
      disposition: dispositionHook(fold, registry),
    });
    matcher.setAliasDisposition(dispositionHook({ isAbandoned: () => false }, registry));
    const identity = stepIdentity;

    // Standalone, the covered scope stays skipped.
    const skipped = matcher.match('plan/DDDDDDDDDDDDDDDDDDDDDDDDDD', identity, 'scoped');
    expect(skipped.kind).toBe('skip');

    // Through the alias the entry regains its pre-abandon status.
    const matcher2 = new JournalMatcher(entries, {
      keyRing: registryKeyRing(registry),
      disposition: dispositionHook(fold, registry),
    });
    matcher2.setAliasDisposition(dispositionHook({ isAbandoned: () => false }, registry));
    matcher2.registerAlias('plan/DDDDDDDDDDDDDDDDDDDDDDDDDD', 'plan/TTTTTTTTTTTTTTTTTTTTTTTTTT');
    const replayed = matcher2.match('plan/TTTTTTTTTTTTTTTTTTTTTTTTTT', identity, 'scoped');
    expect(replayed.kind).toBe('replay');
    expect(replayed.kind === 'replay' && replayed.terminal.value).toBe('paid result');

    // Nested levels map for free (per-scope cursors unchanged).
    const nested = matcher2.match('plan/TTTTTTTTTTTTTTTTTTTTTTTTTT/sub', identity, 'scoped');
    expect(nested.kind).toBe('live');
  });
});
