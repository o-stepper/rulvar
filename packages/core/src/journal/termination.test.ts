import { describe, expect, it } from 'vitest';

import { ConfigError, PlanInvariantError } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import {
  buildTerminationInitValue,
  foldTermination,
  kMaxOf,
  ladderLengthOf,
  lineageWeightOf,
  phiInitialOf,
  profileRegistrySnapshotHash,
  TerminationAccount,
  terminationConfigDrift,
  validateTerminationLimits,
  type TerminationDeniedValue,
  type TerminationLimits,
} from './termination.js';

function limitsOf(patch?: Partial<TerminationLimits>): TerminationLimits {
  return validateTerminationLimits({
    runBudgetUsdCeiling: 10,
    orchestratorCapUsd: 2,
    finalizeReserveUsd: 0.5,
    ...patch,
  });
}

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

function mkInit(limits: TerminationLimits): JournalEntry {
  return mkEntry({
    kind: 'termination.init',
    status: 'ok',
    value: buildTerminationInitValue(limits, 'h'.repeat(64)) as unknown as Record<string, never>,
  });
}

function mkRevision(revisionUnitsAfter: number, admissions: unknown[] = []): JournalEntry {
  return mkEntry({
    kind: 'plan.revision',
    status: 'ok',
    scope: 'plan',
    value: {
      revisionUnitsAfter,
      admissions,
      debits: [],
    } as unknown as JournalEntry['value'],
  });
}

function mkSpawnAdmission(
  ltid: string,
  spawnUnitsAfter: number,
  opts?: { isNew?: boolean; ladderLength?: number },
): JournalEntry {
  return mkEntry({
    kind: 'decision',
    status: 'ok',
    value: {
      decisionType: 'spawn-admission',
      childScope: 'w',
      decision: {
        verdict: {
          kind: 'admit',
          spawnUnitsAfter,
          lineage: { logicalTaskId: ltid, isNew: opts?.isNew ?? true, depth: 1 },
        },
        ...(opts?.ladderLength === undefined ? {} : { ladderLength: opts.ladderLength }),
      },
    },
  });
}

describe('validateTerminationLimits (docs/07, 11.2)', () => {
  it('applies the Appendix A defaults for the countable resources', () => {
    const limits = limitsOf();
    expect(limits.maxRevisionsPerRun).toBe(32);
    expect(limits.maxTotalSpawns).toBe(128);
    expect(limits.maxEscalationsPerLogicalTask).toBe(2);
    expect(limits.maxDepth).toBe(1);
    expect(limits.kMax).toBe(1);
  });

  it('rejects the pre-rename escalation knob with a migration hint (XF-10)', () => {
    expect(() =>
      validateTerminationLimits({ maxEscalationsPerNode: 3, runBudgetUsdCeiling: 1 }),
    ).toThrow(/maxEscalationsPerLogicalTask/);
  });

  it('rejects malformed counters', () => {
    expect(() => limitsOf({ maxRevisionsPerRun: -1 })).toThrow(ConfigError);
    expect(() => limitsOf({ kMax: 0 })).toThrow(ConfigError);
    expect(() =>
      validateTerminationLimits({ orchestratorCapUsd: 1, finalizeReserveUsd: 1 }),
    ).toThrow(ConfigError); // runBudgetUsdCeiling missing
  });
});

describe('the variant function (docs/07, 11.4)', () => {
  it('computes C and Phi0 from the frozen vector', () => {
    const limits = limitsOf({ maxEscalationsPerLogicalTask: 2, kMax: 3 });
    expect(lineageWeightOf(limits)).toBe(5);
    expect(phiInitialOf(limits)).toBe(limits.maxRevisionsPerRun + 5 * limits.maxTotalSpawns);
    expect(buildTerminationInitValue(limits, 'x').phiInitial).toBe(phiInitialOf(limits));
  });
});

describe('profile registry snapshot (docs/07, 11.6)', () => {
  it('derives kMax and a deterministic hash from declared ladders', () => {
    // Ladders declare through the profile's ModelSpec (docs/04, section
    // 12): `model: { ladder }` or a loop-role routing entry.
    const profiles = {
      worker: {},
      climber: { model: { ladder: { rungs: [{}, {}, {}] } } },
      router: { routing: { loop: { ladder: { rungs: [{}, {}] } } } },
    };
    expect(ladderLengthOf(profiles.worker)).toBe(1);
    expect(ladderLengthOf(profiles.climber)).toBe(3);
    expect(ladderLengthOf(profiles.router)).toBe(2);
    expect(kMaxOf(profiles)).toBe(3);
    expect(kMaxOf(undefined)).toBe(1);
    expect(profileRegistrySnapshotHash(profiles)).toBe(
      profileRegistrySnapshotHash({ ...profiles }),
    );
    expect(profileRegistrySnapshotHash(profiles)).not.toBe(profileRegistrySnapshotHash({}));
  });
});

describe('TerminationAccount (docs/07, 11.3, 11.5)', () => {
  it('exposes no credit operation anywhere (API-shape assertion)', () => {
    const members = Object.getOwnPropertyNames(TerminationAccount.prototype);
    for (const member of members) {
      expect(member).not.toMatch(/credit|refund|top[uU]p|grant|replenish|increase|add[A-Z]/);
    }
  });

  it('debits a spawn and allocates a NEW lineage in one atomic step', () => {
    const account = new TerminationAccount({ limits: limitsOf({ kMax: 3 }) });
    const before = account.phi();
    const result = account.debitSpawn({ logicalTaskId: 'L1', isNew: true, ladderLength: 2 });
    expect(result).toEqual({ ok: true, spawnUnitsAfter: 127 });
    // The lemma: the decrease equals C - (E0 + K_l - 1) = kMax - K_l + 1.
    expect(before - account.phi()).toBe(3 - 2 + 1);
    expect(account.snapshot().perLineage.L1).toEqual({
      escalationUnitsRemaining: 2,
      rungsRemaining: 1,
    });
  });

  it('debits revision units on every journaled plan_revise regardless of outcome', () => {
    const account = new TerminationAccount({ limits: limitsOf({ maxRevisionsPerRun: 2 }) });
    expect(account.debitRevision()).toEqual({ ok: true, revisionUnitsAfter: 1 });
    expect(account.debitRevision()).toEqual({ ok: true, revisionUnitsAfter: 0 });
    expect(account.debitRevision()).toEqual({ ok: false, resource: 'revisionUnits' });
  });

  it('debits escalations and rungs per lineage with monotone rung indices', () => {
    const account = new TerminationAccount({ limits: limitsOf({ kMax: 3 }) });
    account.debitSpawn({ logicalTaskId: 'L1', isNew: true, ladderLength: 3 });
    expect(account.debitEscalation('L1')).toEqual({ ok: true, escalationUnitsAfter: 1 });
    expect(account.debitEscalation('L1')).toEqual({ ok: true, escalationUnitsAfter: 0 });
    expect(account.debitEscalation('L1')).toEqual({ ok: false, resource: 'escalationUnits' });
    expect(account.debitRung('L1')).toEqual({
      ok: true,
      rungIndexAfter: 1,
      rungsRemainingAfter: 1,
    });
    expect(account.debitRung('L1')).toEqual({
      ok: true,
      rungIndexAfter: 2,
      rungsRemainingAfter: 0,
    });
    expect(account.debitRung('L1')).toEqual({ ok: false, resource: 'rungs' });
    expect(account.rungIndexOf('L1')).toBe(2);
  });

  it('writes termination.denied strictly before resolving an underflow', async () => {
    const written: TerminationDeniedValue[] = [];
    const account = new TerminationAccount({
      limits: limitsOf({ maxRevisionsPerRun: 0 }),
      deniedWriter: (denied) => {
        written.push(denied);
        return Promise.resolve(41);
      },
    });
    const result = await account.debit('revisionUnits', undefined, { requestedByRef: 7 });
    expect(result).toEqual({ ok: false, deniedEntryRef: 41, resource: 'revisionUnits' });
    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
      resource: 'revisionUnits',
      requestedByRef: 7,
      reasonCode: 'revision_budget_exhausted',
    });
    expect(written[0]?.snapshotAfter.revisionUnitsRemaining).toBe(0);
  });

  it('demands a deniedWriter on underflow (the denied entry MUST precede the error)', async () => {
    const account = new TerminationAccount({ limits: limitsOf({ maxRevisionsPerRun: 0 }) });
    await expect(account.debit('revisionUnits')).rejects.toThrow(ConfigError);
  });

  it('Phi strictly decreases on every successful debit and never increases (property)', () => {
    // Deterministic LCG: no Math.random in tests (determinism discipline).
    let state = 0xdecafbad % 2147483647;
    const next = (): number => {
      state = (state * 48271) % 2147483647;
      return state;
    };
    const account = new TerminationAccount({
      limits: limitsOf({ maxRevisionsPerRun: 12, maxTotalSpawns: 24, kMax: 4 }),
    });
    const lineages: string[] = [];
    let phi = account.phi();
    for (let step = 0; step < 400; step += 1) {
      const choice = next() % 4;
      let debited = false;
      if (choice === 0) {
        debited = account.debitRevision().ok;
      } else if (choice === 1) {
        const ladderLength = (next() % 4) + 1;
        const ltid = `L${String(next() % 32)}`;
        const isNew = !lineages.includes(ltid);
        const result = account.debitSpawn({ logicalTaskId: ltid, isNew, ladderLength });
        if (result.ok && isNew) {
          lineages.push(ltid);
        }
        debited = result.ok;
      } else if (lineages.length > 0) {
        const ltid = lineages[next() % lineages.length];
        debited = choice === 2 ? account.debitEscalation(ltid).ok : account.debitRung(ltid).ok;
      }
      const phiAfter = account.phi();
      if (debited) {
        expect(phiAfter).toBeLessThanOrEqual(phi - 1);
      } else {
        expect(phiAfter).toBe(phi);
      }
      phi = phiAfter;
      expect(phi).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('foldTermination (docs/07, 11.6): replay-strict integrity', () => {
  it('returns undefined without a termination.init entry (non-PlanRunner runs)', () => {
    expect(foldTermination([mkRevision(31)])).toBeUndefined();
  });

  it('recomputes balances from init and accepts matching embedded balances', () => {
    const limits = limitsOf({ maxRevisionsPerRun: 2, maxTotalSpawns: 3, kMax: 2 });
    const entries = [
      mkInit(limits),
      mkRevision(1, [
        {
          nodeId: 'N1',
          decision: {
            verdict: {
              kind: 'admit',
              spawnUnitsAfter: 2,
              lineage: { logicalTaskId: 'L1', isNew: true, depth: 1 },
            },
            ladderLength: 2,
          },
        },
      ]),
      mkSpawnAdmission('L2', 1),
      mkEntry({
        kind: 'decision',
        status: 'ok',
        value: {
          decisionType: 'escalation-decision',
          countsAgainstLimit: true,
          logicalTaskId: 'L1',
          escalationUnitsAfter: 1,
        },
      }),
      mkEntry({
        kind: 'decision',
        status: 'ok',
        value: {
          decisionType: 'ladder-verdict',
          raisesRung: true,
          logicalTaskId: 'L1',
          rungIndexAfter: 1,
          rungsRemainingAfter: 0,
        },
      }),
    ];
    const folded = foldTermination(entries);
    expect(folded).toBeDefined();
    const snapshot = folded!.account.snapshot();
    expect(snapshot.revisionUnitsRemaining).toBe(1);
    expect(snapshot.spawnUnitsRemaining).toBe(1);
    expect(snapshot.perLineage.L1).toEqual({ escalationUnitsRemaining: 1, rungsRemaining: 0 });
    // Phi is recomputable at any prefix and strictly decreasing across
    // the debiting suffix (combined-loop-descent shape).
    let previous = Number.POSITIVE_INFINITY;
    for (let end = 1; end <= entries.length; end += 1) {
      const prefix = foldTermination(entries.slice(0, end));
      const phi = prefix!.account.phi();
      expect(phi).toBeLessThan(previous);
      previous = phi;
    }
  });

  it('raises the typed integrity error at exactly the diverging entry', () => {
    const limits = limitsOf({ maxRevisionsPerRun: 4 });
    const init = mkInit(limits);
    const bad = mkRevision(99);
    const entries = [init, bad];
    try {
      foldTermination(entries);
      expect.unreachable('embedded balance mismatch must throw');
    } catch (thrown) {
      const error = thrown as PlanInvariantError;
      expect(error).toBeInstanceOf(PlanInvariantError);
      expect(error.data).toMatchObject({ entryRef: bad.seq, what: 'revisionUnitsAfter' });
    }
  });

  it('flags a revision journaled after exhaustion (revision-exhaustion shape)', () => {
    const limits = limitsOf({ maxRevisionsPerRun: 1 });
    const entries = [mkInit(limits), mkRevision(0), mkRevision(-1)];
    expect(() => foldTermination(entries)).toThrow(PlanInvariantError);
  });

  it('debits one unit per lineage of a class-level decision (class-storm shape)', () => {
    const limits = limitsOf({ maxTotalSpawns: 8 });
    const entries = [
      mkInit(limits),
      mkSpawnAdmission('L1', 7),
      mkSpawnAdmission('L2', 6),
      mkSpawnAdmission('L3', 5),
      mkEntry({
        kind: 'decision',
        status: 'ok',
        value: {
          decisionType: 'escalation-decision',
          countsAgainstLimit: true,
          debits: [
            { logicalTaskId: 'L1', escalationUnitsAfter: 1 },
            { logicalTaskId: 'L2', escalationUnitsAfter: 1 },
            { logicalTaskId: 'L3', escalationUnitsAfter: 1 },
          ],
        },
      }),
    ];
    const folded = foldTermination(entries)!;
    for (const ltid of ['L1', 'L2', 'L3']) {
      expect(folded.account.snapshot().perLineage[ltid]?.escalationUnitsRemaining).toBe(1);
    }
  });

  it('counts a timeout defaultDecision once under first-closing-wins (race shape)', () => {
    const limits = limitsOf({ maxTotalSpawns: 4 });
    const suspended = mkEntry({ kind: 'external', status: 'suspended', key: 'esc' });
    const entries = [
      mkInit(limits),
      mkSpawnAdmission('L1', 3),
      suspended,
      mkEntry({
        kind: 'resolution',
        status: 'ok',
        ref: suspended.seq,
        resolution: {
          target: suspended.seq,
          by: 'timeout',
          value: {},
          logicalTaskId: 'L1',
          countsAgainstLimit: true,
        },
      }),
      mkEntry({
        kind: 'resolution',
        status: 'ok',
        ref: suspended.seq,
        resolution: {
          target: suspended.seq,
          by: 'operator',
          value: {},
          logicalTaskId: 'L1',
          countsAgainstLimit: true,
        },
      }),
    ];
    const folded = foldTermination(entries)!;
    expect(folded.account.snapshot().perLineage.L1?.escalationUnitsRemaining).toBe(1);
  });

  it('collects denials for zero-live-call re-issue', () => {
    const limits = limitsOf({ maxRevisionsPerRun: 0 });
    const init = mkInit(limits);
    const denied = mkEntry({
      kind: 'termination.denied',
      status: 'ok',
      value: {
        resource: 'revisionUnits',
        reasonCode: 'revision_budget_exhausted',
        snapshotAfter: {
          revisionUnitsRemaining: 0,
          spawnUnitsRemaining: 128,
          perLineage: {},
          phi: 384,
        },
      },
    });
    const folded = foldTermination([init, denied])!;
    expect(folded.denials).toHaveLength(1);
    expect(folded.denials[0]?.value.reasonCode).toBe('revision_budget_exhausted');
  });
});

describe('terminationConfigDrift (docs/07, 11.2): the journal always wins', () => {
  it('reports every differing field for the config-drift event', () => {
    const frozen = limitsOf({ maxRevisionsPerRun: 32 });
    const drift = terminationConfigDrift(frozen, {
      maxRevisionsPerRun: 64,
      maxTotalSpawns: 128,
    });
    expect(drift).toEqual([{ field: 'maxRevisionsPerRun', frozenValue: 32, liveValue: 64 }]);
  });
});
