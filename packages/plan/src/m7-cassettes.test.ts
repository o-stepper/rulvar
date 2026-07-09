import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  runBudgetDeniedRung,
  runCapFreezeThenFinish,
  runCrashBetweenCapAndEffects,
  runCrashDuringRevision,
  runDecomposeMintsChildren,
  runEscalationStormFrozen,
  runFinalizeFallbackSynthesized,
  runHalfEscalatedLadder,
  runOscillationFreeze,
  runParkUnpark,
  runReviseMidRun,
  runRevisionExhaustion,
  runRungRetryLineage,
  type M7CassetteFixture,
} from './cassettes.js';

function cassette(id: string): M7CassetteFixture {
  const url = new URL(`../../../cassettes/${id}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as M7CassetteFixture;
}

/**
 * Every M7 gating cassette (docs/09 catalog; docs/10 milestone table):
 * the committed fixture is the compatibility contract; a fresh offline
 * run of the same scenario must reproduce it byte-for-byte after the
 * deterministic normalization (ULIDs, hashes, clocks, spans).
 */
const SCENARIOS: Array<[string, () => Promise<unknown>]> = [
  ['revise-mid-run', runReviseMidRun],
  ['crash-during-revision', runCrashDuringRevision],
  ['park-unpark', runParkUnpark],
  ['oscillation-freeze', () => runOscillationFreeze()],
  ['half-escalated-ladder', runHalfEscalatedLadder],
  ['budget-denied-rung', runBudgetDeniedRung],
  ['cap-freeze-then-finish', runCapFreezeThenFinish],
  ['crash-between-cap-and-effects', runCrashBetweenCapAndEffects],
  ['finalize-fallback-synthesized', runFinalizeFallbackSynthesized],
  ['escalation-storm-frozen', runEscalationStormFrozen],
  ['revision-exhaustion', runRevisionExhaustion],
  ['rung-retry-lineage', runRungRetryLineage],
  ['decompose-mints-children', runDecomposeMintsChildren],
];

describe('M7 gating cassettes (M7-T14; docs/09 section 6)', () => {
  for (const [id, runner] of SCENARIOS) {
    it(`${id}: a fresh offline run reproduces the committed cassette`, async () => {
      const committed = cassette(id);
      const fresh = await runner();
      expect(fresh).toEqual(committed.entries);
    });
  }
});
