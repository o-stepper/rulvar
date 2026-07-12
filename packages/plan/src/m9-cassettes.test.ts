/**
 * M9 catalog-completion cassettes (M9-T04): the committed fixture is the compatibility contract;
 * a fresh offline run of the same scenario reproduces it byte-for-byte
 * after the deterministic normalization. The two rows that assert
 * store-independence additionally round-trip the frozen bytes through
 * BOTH reference stores with identical loads.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { JsonlFileStore, type JournalEntry, type JournalStore } from '@rulvar/core';
import { SqliteStore } from '@rulvar/store-sqlite';

import {
  runAmendVsRunningThenCancelAdd,
  runBadBaseStreakTerminates,
  runClaimExclusivityAndChain,
  runClassStormSingleTurn,
  runCombinedLoopDescent,
  runConfigDriftResume,
  runCrashAfterAppendBeforeEffects,
  runCrashBetweenLinkAndRoot,
  runGraftPartialSubtree,
  runIntraRevisionSelfConflict,
  runLegacyJournalResume,
  runOscillationBounded,
  runOscillationFullReuse,
  runOscillationGuardTrip,
  runParkRacesChildCompletion,
  runRaceTimeoutVsLive,
  runReserveSurvivesRunExhaustion,
  runRespawnPreservesCounter,
  runReviseRacingDefaultDecision,
  runRewordedLessonsCollide,
  runStallStreakClassesAndPinning,
  runWorktreeDisposedDegrade,
} from './m9-cassettes.js';
import { type M7CassetteFixture } from './cassettes.js';

function cassette(id: string): M7CassetteFixture {
  const url = new URL(`../../../cassettes/${id}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as M7CassetteFixture;
}

const SCENARIOS: Array<[string, () => Promise<unknown>]> = [
  ['combined-loop-descent', runCombinedLoopDescent],
  ['config-drift-resume', runConfigDriftResume],
  ['class-storm-single-turn', runClassStormSingleTurn],
  ['race-timeout-vs-live', runRaceTimeoutVsLive],
  ['respawn-preserves-counter', runRespawnPreservesCounter],
  ['reworded-lessons-collide', runRewordedLessonsCollide],
  ['stall-streak-classes-and-pinning', runStallStreakClassesAndPinning],
  ['legacy-journal-resume', runLegacyJournalResume],
  ['oscillation-bounded', runOscillationBounded],
  ['oscillation-full-reuse', runOscillationFullReuse],
  ['graft-partial-subtree', runGraftPartialSubtree],
  ['crash-between-link-and-root', runCrashBetweenLinkAndRoot],
  ['oscillation-guard-trip', runOscillationGuardTrip],
  ['worktree-disposed-degrade', runWorktreeDisposedDegrade],
  ['claim-exclusivity-and-chain', runClaimExclusivityAndChain],
  ['revise-racing-defaultDecision', runReviseRacingDefaultDecision],
  ['crash-after-append-before-effects', runCrashAfterAppendBeforeEffects],
  ['amend-vs-running-then-cancel-add', runAmendVsRunningThenCancelAdd],
  ['intra-revision-self-conflict', runIntraRevisionSelfConflict],
  ['bad-base-streak-terminates', runBadBaseStreakTerminates],
  ['park-races-child-completion', runParkRacesChildCompletion],
  ['reserve-survives-run-exhaustion', runReserveSurvivesRunExhaustion],
];

describe('M9 catalog cassettes (M9-T04; docs/09 sections 6.2 and 6.3)', () => {
  for (const [id, runner] of SCENARIOS) {
    it(`${id}: a fresh offline run reproduces the committed cassette`, async () => {
      const committed = cassette(id);
      const fresh = await runner();
      expect(fresh).toEqual(committed.entries);
    }, 20_000);
  }
});

/**
 * Store-independence: the frozen bytes load
 * back identically from BOTH reference stores, so every fold over them
 * is store-independent by construction.
 */
async function roundTrip(store: JournalStore, entries: JournalEntry[]): Promise<JournalEntry[]> {
  for (const entry of entries) {
    await store.append('run-fixture', entry);
  }
  return store.load('run-fixture');
}

describe('store-independence of the class and race rows', () => {
  for (const id of ['class-storm-single-turn', 'race-timeout-vs-live']) {
    it(`${id}: identical loads from JsonlFileStore and SqliteStore`, async () => {
      const entries = cassette(id).entries;
      const dir = mkdtempSync(join(tmpdir(), 'rulvar-m9-stores-'));
      const jsonl = await roundTrip(new JsonlFileStore({ dir: join(dir, 'jsonl') }), entries);
      const sqlite = await roundTrip(new SqliteStore({ path: ':memory:' }), entries);
      expect(jsonl).toEqual(entries);
      expect(sqlite).toEqual(entries);
    });
  }
});
