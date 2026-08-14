/**
 * The fault-injection kit (RV811): the branches the comparison
 * experiments never drove live stop being a list of untested claims.
 * Every scenario DELIBERATELY drives one such branch on the real engine
 * with scripted adapters, verifies the documented typed outcome, and
 * leaves experiment-grade artifacts; a branch that stops producing its
 * documented observable reports matched false, fail closed.
 */
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FAULT_SCENARIO_NAMES, runFaultInjection } from './fault-injection.js';

const EXPECTED = [
  'in-flight-exposure-refusal',
  'duplicate-quota-rule',
  'torn-jsonl-tail',
  'glued-jsonl-tail',
  'crash-resume-settle-boundary',
  'pricing-rotation-uncovered-tail',
  'unknown-provider-id',
  'nan-statement-refusal',
  'token-mismatch-divergence',
  'audit-missing-field-finding',
  'anthropic-1h-priced',
  'pause-turn-units',
  'pre-admission-count-refusal',
  'forced-finish-completion',
  'settlement-terminal-honesty',
  'ttl-live-budget-parity',
  'pause-turn-real-adapter',
  'statement-settleable-guard',
  'superseded-terminal-honesty',
  'tier-crossing-live-parity',
  'benchmark-primary-preflight-parity',
  'benchmark-recovery-root-exposure',
  'parity-quiescence-deadlock',
  'parity-sequential-roster-floor',
  'parity-reserve-line-redemption',
  'resume-spawn-famine',
  'validator-guidance-conflict',
  'repair-round-honesty',
  'repair-survivor-refusal',
  'repair-round-host-rejection',
  'repair-round-own-pool',
  'repair-round-verdict-reserve',
  'claim-judge-dead-armed-refusal',
];

describe('the fault-injection kit (RV811)', () => {
  it('every scenario drives its branch and matches the documented typed outcome', async () => {
    const report = await runFaultInjection();
    expect(report.scenarios.map((s) => s.scenario)).toEqual(EXPECTED);
    for (const scenario of report.scenarios) {
      expect(
        scenario.observation.matched,
        `${scenario.scenario}: ${scenario.observation.detail}`,
      ).toBe(true);
      expect(scenario.artifacts.length).toBeGreaterThan(0);
      expect(scenario.doctrine.length).toBeGreaterThan(0);
    }
    expect(report.allMatched).toBe(true);
    expect(FAULT_SCENARIO_NAMES).toEqual(EXPECTED);

    const byName = new Map(report.scenarios.map((s) => [s.scenario, s]));
    // The typed observables, pinned by content so a scenario that quietly
    // stops driving its branch cannot keep reporting success.
    expect(byName.get('in-flight-exposure-refusal')?.observation.detail).toContain(
      'in flight exposure cap reached',
    );
    expect(byName.get('duplicate-quota-rule')?.observation.detail).toContain('duplicate');
    expect(byName.get('torn-jsonl-tail')?.observation.detail).toContain('salvaged');
    expect(byName.get('glued-jsonl-tail')?.observation.detail).toContain('glued');
    expect(byName.get('crash-resume-settle-boundary')?.observation.detail).toContain('liveCalls=1');
    expect(byName.get('pricing-rotation-uncovered-tail')?.observation.detail).toContain('unpriced');
    expect(byName.get('unknown-provider-id')?.observation.detail).toContain('ghost');
    // The RV909 scenarios: the thirteenth experiment's probes as
    // permanent gates, each pinned by the observable that proves the
    // FIXED branch (not the historical defect) was the one driven.
    expect(byName.get('nan-statement-refusal')?.observation.detail).toContain('cannot be summed');
    expect(byName.get('token-mismatch-divergence')?.observation.detail).toContain('divergence');
    expect(byName.get('token-mismatch-divergence')?.observation.detail).toContain('informational');
    expect(byName.get('audit-missing-field-finding')?.observation.detail).toContain('no such rate');
    expect(byName.get('anthropic-1h-priced')?.observation.detail).toContain('anthropic-2026-07-31');
    expect(byName.get('pause-turn-units')?.observation.detail).toContain('wire requests');
    expect(byName.get('pre-admission-count-refusal')?.observation.detail).toContain('never called');
    expect(byName.get('forced-finish-completion')?.observation.detail).toContain("'partial'");
    expect(byName.get('settlement-terminal-honesty')?.observation.detail).toContain(
      'settled=false',
    );
    // The RV1002 scenario: the fourteenth experiment's live-budget
    // probe as a permanent gate, driven on the REAL live path (a
    // mid-stream usage event against a ceiling), never post-hoc.
    expect(byName.get('ttl-live-budget-parity')?.observation.detail).toContain('live=4.5');
    expect(byName.get('ttl-live-budget-parity')?.observation.detail).toContain('settled=4.5');
    // The RV1003+RV1004 scenario: the REAL Anthropic adapter's
    // two-segment pause_turn through the real engine, never a synthetic
    // adapter with ready wire metadata; plus the invalid continuation
    // cap refusing typed before any wire.
    expect(byName.get('pause-turn-real-adapter')?.observation.detail).toContain('usage 11/2');
    expect(byName.get('pause-turn-real-adapter')?.observation.detail).toContain('before any wire');
    // The RV1005+RV1006 scenario: a 'match' verdict is not settlement
    // grade while unknown-usage money is on the table, and an export
    // row whose own total contradicts its own component split refuses
    // typed at intake.
    expect(byName.get('statement-settleable-guard')?.observation.detail).toContain(
      'settleable=false',
    );
    expect(byName.get('statement-settleable-guard')?.observation.detail).toContain(
      'settleable=true',
    );
    expect(byName.get('statement-settleable-guard')?.observation.detail).toContain('contradict');
    // The RV1009 scenario: a fenced-out segment refuses green typed
    // with the distinct superseded reason, and exactly one successor
    // settles the run.
    expect(byName.get('superseded-terminal-honesty')?.observation.detail).toContain(
      'settledReason=superseded',
    );
    expect(byName.get('superseded-terminal-honesty')?.observation.detail).toContain(
      'exactly one settle entry',
    );
    // The RV1007 arcs ride the audit scenario (RV1014 sweep): a
    // page-only long-context tier and a NaN scalar are findings on the
    // published comparator, never silent passes.
    expect(byName.get('audit-missing-field-finding')?.observation.detail).toContain(
      'the seed declares none',
    );
    expect(byName.get('audit-missing-field-finding')?.observation.detail).toContain('NaN');
    // The RV1101 scenario: a tier crossing on one call's sum that no
    // mid-stream slice reached must read the same dollars on both
    // money paths, and the between-readings ceiling must sever.
    expect(byName.get('tier-crossing-live-parity')?.observation.detail).toContain('live=5.75');
    expect(byName.get('tier-crossing-live-parity')?.observation.detail).toContain('settled=5.75');
    expect(byName.get('tier-crossing-live-parity')?.observation.detail).toContain(
      'no slice crossed',
    );
    // The marginal ladder: $1.50 after the first slice, the $5.00
    // retroactive re-price at the crossing, $5.75 at the remainder.
    expect(byName.get('tier-crossing-live-parity')?.observation.detail).toContain(
      '1.5 -> 5 -> 5.75',
    );
    // The RV3601 scenario: the third comparison run's terminal lie as
    // a permanent gate; the detail pins the FIXED branch (dispatch
    // named, round counted spent, verdict facts carried).
    expect(byName.get('repair-round-host-rejection')?.observation.detail).toContain(
      'roundDispatched=true',
    );
    expect(byName.get('repair-round-host-rejection')?.observation.detail).toContain(
      'repairsUsed=1',
    );
    expect(byName.get('repair-round-host-rejection')?.observation.detail).toContain(
      'outcome lifts findings=true',
    );
    // The RV3602 scenario: the frozen third comparison sequence
    // carried to convergence; the pins prove the round's pool
    // restarted at the invocation boundary.
    expect(byName.get('repair-round-own-pool')?.observation.detail).toContain(
      'repairsUsed [0,1,0,1]',
    );
    expect(byName.get('repair-round-own-pool')?.observation.detail).toContain(
      'the repaired document',
    );
    // The RV3603 pin on the same arc: the round's prompt carried the
    // bought lesson; the initial composition's did not.
    expect(byName.get('repair-round-own-pool')?.observation.detail).toContain(
      'lesson carried=true',
    );
    // The RV3701 scenario: the money twin of the RV3602 pool; a round
    // whose verdict cannot be funded refuses pre dispatch with the
    // held convergence reserve named, one composition ever paid.
    expect(byName.get('repair-round-verdict-reserve')?.observation.detail).toContain(
      'roundDispatched=false',
    );
    expect(byName.get('repair-round-verdict-reserve')?.observation.detail).toContain(
      'held convergence reserve named=true',
    );
    expect(byName.get('repair-round-verdict-reserve')?.observation.detail).toContain(
      '1 composition(s) paid',
    );
    // The report is self-describing (RV1014): the scenario count can
    // never quietly shrink under a consumer that pins these.
    expect(report.requested).toBe(EXPECTED.length);
    expect(report.selected).toBe(EXPECTED.length);
  });

  it('writes experiment-grade artifacts when a directory is given, and only runs the named subset', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-fault-kit-'));
    const report = await runFaultInjection({
      artifactsDir: dir,
      only: ['torn-jsonl-tail', 'unknown-provider-id'],
    });
    expect(report.scenarios).toHaveLength(2);
    expect(report.allMatched).toBe(true);
    expect(report.requested).toBe(2);
    expect(report.selected).toBe(2);
    const files = readdirSync(dir);
    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(report.artifactFiles?.length).toBeGreaterThanOrEqual(2);
    for (const file of report.artifactFiles ?? []) {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
        scenario?: string;
        observation?: { matched?: boolean };
      };
      expect(typeof parsed.scenario).toBe('string');
      expect(parsed.observation?.matched).toBe(true);
    }
  });

  it('refuses an unknown scenario name typed', async () => {
    await expect(runFaultInjection({ only: ['no-such-branch'] })).rejects.toThrow(
      /unknown fault scenario/,
    );
  });

  it('refuses an empty only selection typed instead of vacuous success (RV1014)', async () => {
    // `only: []` selected zero scenarios and reported allMatched true:
    // a gate that runs nothing must refuse, in tone with the
    // unknown-name refusal above.
    await expect(runFaultInjection({ only: [] })).rejects.toThrow(/empty/);
  });

  it('every real defect of the validated plans keeps a kit scenario on the real path (RV1014)', () => {
    const coverage: Record<string, string> = {
      'RV1001/RV1002 live budget parity': 'ttl-live-budget-parity',
      'RV1003/RV1004 real-adapter pause_turn': 'pause-turn-real-adapter',
      'RV1005/RV1006 statement consistency and settleable': 'statement-settleable-guard',
      'RV1007 comparator fail-closed': 'audit-missing-field-finding',
      'RV1009 superseded terminal': 'superseded-terminal-honesty',
      'RV1101 tier-crossing live parity': 'tier-crossing-live-parity',
    };
    for (const scenario of Object.values(coverage)) {
      expect(FAULT_SCENARIO_NAMES).toContain(scenario);
    }
  });
});
