// Records the M9 catalog-completion cassettes (M9-T04; docs/09 catalog:
// the DEF-2 and DEF-3 rows deferred at M7). Everything runs on the
// scripted adapter: fully offline, deterministic after journal
// normalization (ULIDs, hashes, wall clock, spans collapse to
// first-appearance placeholders).
//
// Imports the BUILT dists (root scripts cannot import workspace packages
// by name; docs/13). Build first:
//   pnpm turbo build
//   node scripts/record-m9-cassettes.mjs
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
    'combined-loop-descent',
    'DEF-2: a verify-failed gate raises the ladder rung, the raised rung hits its limit at ' +
      'the top and the node fails, the failure wakes a replan that decomposes into two ' +
      'depth-1 halves, the escalating half is respawned until its escalationUnits deny ' +
      '(termination.denied precedes the capExceeded decision); Phi strictly decreases on ' +
      'every debiting entry and matches the embedded balances (docs/07, 11.3).',
    plan.runCombinedLoopDescent,
  ],
  [
    'config-drift-resume',
    'DEF-2: life 1 runs under maxRevisionsPerRun 2 and crashes at the pre-append kill point ' +
      'of its second revision; life 2 resumes with the knob DOUBLED; balances continue from ' +
      'the journaled termination.init, termination:config-drift fires, nothing is repaid ' +
      '(docs/07, 11.2).',
    plan.runConfigDriftResume,
  ],
  [
    'class-storm-single-turn',
    'DEF-2: five dependency-free workers escalate (Flavor A); ONE revision resolves all ' +
      'five; the class-level decision carries five per-lineage debits inside one entry ' +
      '(docs/07, 6.5); store-independence asserted by the replay suite over JSONL and SQLite.',
    plan.runClassStormSingleTurn,
  ],
  [
    'race-timeout-vs-live',
    'DEF-2: a Flavor B deadline resolution and a live revision cancel race on one ' +
      'suspension; first-wins applies the timeout, the live attempt lands as a noop, exactly ' +
      'ONE escalationUnits debit exists (docs/07, 6.3); store-independence asserted by the ' +
      'replay suite.',
    plan.runRaceTimeoutVsLive,
  ],
  [
    'respawn-preserves-counter',
    'DEF-3: the worker escalates three times across two amended respawns of ONE logical ' +
      'task (new content keys, same LTID); the third respawn attempt is rejected ' +
      'lineage_exhausted and the run closes through the non-HITL path (docs/03, 10.5).',
    plan.runRespawnPreservesCounter,
  ],
  [
    'reworded-lessons-collide',
    'DEF-3: two attempts of one LTID with different prompt prose but identical signature ' +
      "inputs and the 'binary-search' tag compute equal approachSig values; lesson_add keys " +
      'once; plan_view groups both attempts into one approach (docs/03, 10.2; docs/07, 9.2).',
    plan.runRewordedLessonsCollide,
  ],
  [
    'stall-streak-classes-and-pinning',
    'DEF-3: transient-error, task-error, no-progress, ok across four attempts of one LTID ' +
      'pin stallStreak 0, 1, 2 in the respawn admissions and 0 in the post-ok pinned view; ' +
      'a wake turn re-executed after a crash reads the SAME LineageStats from its snapshot ' +
      '(docs/03, 10.4).',
    plan.runStallStreakClassesAndPinning,
  ],
  [
    'legacy-journal-resume',
    'DEF-3: a journal whose spawns carry no lineage records resumes on the current engine; ' +
      "legacy spawns canonize onto deterministic 'legacy:' LTIDs, forward matching pays " +
      'nothing, and the new lineage-declaring admission carries sigVersion 1 (docs/03, 10.7).',
    plan.runLegacyJournalResume,
  ],
  [
    'oscillation-full-reuse',
    'DEF-5: an escalated-terminal branch severed by cancel_task and re-added byte-identically ' +
      'links reuse_full: the embedded verdict, the shared node.link, and the by-ref root are ' +
      'present; the reused subtree costs zero live calls and reclaimedUsdAtLink carries the ' +
      'donor spend (docs/03, 9.4/9.5).',
    plan.runOscillationFullReuse,
  ],
  [
    'graft-partial-subtree',
    'DEF-5: the three-rung limit ladder severed mid-top-rung after two completed rung ' +
      'attempts; the byte-identical re-add grafts exclusively, the completed rungs ' +
      'forward-match through the scope alias, and only the interrupted rung reruns live, ' +
      'exactly once (docs/03, 9.5).',
    plan.runGraftPartialSubtree,
  ],
  [
    'crash-between-link-and-root',
    'DEF-5: the run is cut strictly AFTER the durable node.link and BEFORE the by-ref root; ' +
      'the resume rolls forward, the link forward-matches, the root is re-issued, nothing is ' +
      'paid twice (docs/03, 9.10).',
    plan.runCrashBetweenLinkAndRoot,
  ],
  [
    'oscillation-guard-trip',
    'DEF-5: the third re-add of one SpawnKey at maxOscillationsPerKey 2 rejects osc_guard ' +
      'with the embedded verdict; the run closes through the non-HITL path (docs/03, 9.4).',
    plan.runOscillationGuardTrip,
  ],
  [
    'worktree-disposed-degrade',
    'DEF-5: an unpinned worktree graft donor degrades to a fresh admit with the embedded ' +
      'DedupNote graft_unsafe; the second section verifies reuse_full stays allowed for a ' +
      'worktree donor with a terminal root (docs/03, 9.4).',
    plan.runWorktreeDisposedDegrade,
  ],
  [
    'claim-exclusivity-and-chain',
    'DEF-5: one revision adds two identical tasks (the first grafts exclusively, the second ' +
      'admits fresh, donor_active); the grafted node is severed and the third add links to ' +
      'the CHAIN HEAD with the transitive oldest-first drain; oscillationCount reaches 2 ' +
      '(docs/03, 9.6).',
    plan.runClaimExclusivityAndChain,
  ],
  [
    'revise-racing-defaultDecision',
    'DEF-8 (mandatory): the orchestrator sleeps; a Flavor B timeout resolves the upstream ' +
      'done, a second node escalates, a third completes; ONE stale-based revision drops the ' +
      'trio with dep_already_resolved (blockingRef to the resolving reference), ' +
      'node_escalated, node_already_done (docs/07, 3.5).',
    plan.runReviseRacingDefaultDecision,
  ],
  [
    'crash-after-append-before-effects',
    'DEF-8: the kill lands after the durable plan.revision (add x2 + cancel on a running ' +
      'node); the resume re-issues the effects: both children spawn live exactly once and ' +
      'the request-only cancel lands on the redispatched branch (docs/07, 3.9).',
    plan.runCrashAfterAppendBeforeEffects,
  ],
  [
    'amend-vs-running-then-cancel-add',
    'DEF-8: amend_task on a running node drops node_running; the next revision cancels and ' +
      'adds the amended prompt; the abandon covers the old branch and replay repays neither ' +
      '(docs/07, 4.7).',
    plan.runAmendVsRunningThenCancelAdd,
  ],
  [
    'intra-revision-self-conflict',
    'DEF-8: one revision {cancel_task X, amend_task X, rewire_deps onto X} resolves strictly ' +
      'in submission order per the sequential intra-revision semantics (docs/07, 4.7).',
    plan.runIntraRevisionSelfConflict,
  ],
  [
    'bad-base-streak-terminates',
    'DEF-8: three consecutive fabricated-base revisions land as all-dropped bad-base ' +
      'entries; the dropped streak reaches its limit and the non-HITL RevisionGuards ' +
      'fallback closes the run (docs/07, 3.5/3.8).',
    plan.runBadBaseStreakTerminates,
  ],
  [
    'park-races-child-completion',
    'DEF-8: park_task lands on a running node whose terminal appends moments later; ' +
      'parkRequested is extinguished by the child-result transition, no park retention is ' +
      'written, the node is done (docs/07, 3.6).',
    plan.runParkRacesChildCompletion,
  ],
  [
    'reserve-survives-run-exhaustion',
    'DEF-7: cheap workers eat the run ceiling; the invading adds drop admission_denied ' +
      '(journaled in the revision outcomes, forward-matched on replay); the forced finish ' +
      'executes FROM the reserve and closes the run ok (docs/07, 12.4).',
    plan.runReserveSurvivesRunExhaustion,
  ],
  [
    'oscillation-bounded',
    'DEF-2: an escalated branch is cancelled and re-added byte-identically twice; every ' +
      'plan_revise call debits one revisionUnit (including the drop on the linked done ' +
      'node), each link debits one spawnUnit, the worker is paid exactly once, counters ' +
      'never reset (docs/07, 11.3; docs/03, 9.7).',
    plan.runOscillationBounded,
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
console.log('M9 cassettes recorded.');
