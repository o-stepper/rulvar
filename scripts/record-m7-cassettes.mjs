// Records the M7 gating cassettes (M7-T14; docs/09 catalog: the round-2
// set plus the DEF-7 set minus queue-failover, plus representative
// DEF-2/DEF-3 rows). Everything runs on the scripted adapter: fully
// offline, deterministic after journal normalization (ULIDs, hashes,
// wall clock, spans collapse to first-appearance placeholders).
//
// Imports the BUILT dists (root scripts cannot import workspace packages
// by name; docs/13). Build first:
//   corepack pnpm turbo build
//   node scripts/record-m7-cassettes.mjs
//   node scripts/check-frozen-fixtures.mjs --update
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (pkg) => import(pathToFileURL(join(root, 'packages', pkg, 'dist/index.js')).href);

const plan = await load('plan');

const write = (id, note, entries) => {
  const path = join(root, 'cassettes', `${id}.json`);
  writeFileSync(path, `${JSON.stringify({ id, note, entries }, null, 2)}\n`, 'utf8');
  console.log(`recorded ${id} (${entries.length} entries)`);
};

const SCENARIOS = [
  [
    'revise-mid-run',
    'Round-2: a plan revision arrives while a worker subtree is mid-flight; the hanging ' +
      'node cancels (cancel-landed) while the replacement is admitted in the same revision ' +
      'and completes (docs/07, 3.5/3.6).',
    plan.runReviseMidRun,
  ],
  [
    'crash-during-revision',
    'Round-2: process death at the PRE-APPEND kill point of the second revision; the resume ' +
      're-issues the revision live and rolls its effects forward; the first revision recovers ' +
      'idempotently by content key (docs/07, 3.9).',
    plan.runCrashDuringRevision,
  ],
  [
    'park-unpark',
    'Round-2: park of a running node with checkpoint retention, later unpark and ' +
      'continuation from the retained checkpoint (docs/03, 11.2; docs/07, 3.6).',
    plan.runParkUnpark,
  ],
  [
    'oscillation-freeze',
    'Round-2: cancel/re-add of one coarse signature repeatedly; the oscillation detector ' +
      'freezes the signature under hysteresis and further re-adds drop (docs/07, 3.8).',
    plan.runOscillationFreeze,
  ],
  [
    'half-escalated-ladder',
    'Round-2: rung 1 terminal, the active rung dangling mid-attempt at the crash; the resume ' +
      'continues the ladder without repaying completed rungs (docs/07, 10).',
    plan.runHalfEscalatedLadder,
  ],
  [
    'budget-denied-rung',
    'Round-2: the rung respawn admission is denied by the frozen spawn vector; ' +
      'termination.denied precedes the non-raising verdict (respawn_denied) and the ladder ' +
      'takes the declared fallback path (docs/07, 10, 11.3).',
    plan.runBudgetDeniedRung,
  ],
  [
    'cap-freeze-then-finish',
    'DEF-7: the soft boundary crossed with live children; the cap decision precedes its ' +
      'effects; admitted nodes run to completion; the final quiescence wake gets the ' +
      'finish-only toolset; outcome ok with forcedFinish (docs/07, 12.4).',
    plan.runCapFreezeThenFinish,
  ],
  [
    'crash-between-cap-and-effects',
    'DEF-7: process death right after the cap decision entry; the resume re-derives the ' +
      'frozen state from the entry and rolls the forced finish forward (docs/07, 12.4).',
    plan.runCrashBetweenCapAndEffects,
  ],
  [
    'finalize-fallback-synthesized',
    'DEF-7: the final finish fails inside its turn limit; orchestrator_finalize_fallback ' +
      'journals and the deterministic partial is synthesized by pure fold; outcome exhausted ' +
      'with the non-null value (docs/07, 12.4).',
    plan.runFinalizeFallbackSynthesized,
  ],
  [
    'escalation-storm-frozen',
    'DEF-7: three Flavor B escalations under the frozen plan; each resolves through its ' +
      'journaled defaultDecision, the lineage counters hold (docs/07, 12.4 c; the v1 ' +
      'deadline timers carry the defaults).',
    plan.runEscalationStormFrozen,
  ],
  [
    'revision-exhaustion',
    'DEF-2: the absolute revision budget reaches zero; termination.denied precedes the typed ' +
      'error and nothing replenishes (docs/07, 11.1, 11.3).',
    plan.runRevisionExhaustion,
  ],
  [
    'rung-retry-lineage',
    'DEF-3: the ladder raise continues the SAME logical task with relation rung-retry; ' +
      'attempts count across rungs (docs/03, 10.1 row 4).',
    plan.runRungRetryLineage,
  ],
  [
    'decompose-mints-children',
    'DEF-3: an escalation decomposition mints FRESH logical tasks inside the decision entry; ' +
      'the spawn debits ride the same entry (docs/07, 8.1 rule 6, 11.3 b).',
    plan.runDecomposeMintsChildren,
  ],
];

// Cross-promise signalling (hangUntilAborted, awaitPromise gates) has no
// I/O behind it: keep the event loop alive for the runs' duration.
const keepalive = setInterval(() => undefined, 500);
try {
  for (const [id, note, runner] of SCENARIOS) {
    const first = await runner();
    const second = await runner();
    if (JSON.stringify(first) !== JSON.stringify(second)) {
      throw new Error(`${id}: the two recording runs disagree after normalization`);
    }
    write(id, note, first);
  }
} finally {
  clearInterval(keepalive);
}
console.log('M7 cassettes recorded.');
