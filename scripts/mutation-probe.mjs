// The mutation probe (the cycle 83 gate): proof that the tests guarding
// the doctrine-bearing lines actually FAIL when those lines change.
//
// A green suite says the code passes its tests. It does not say the tests
// would notice if the code stopped doing its job. Every cycle of this
// project ships a fail-closed rule (suppress a claim, refuse a spend,
// classify an error terminally), and each rule is one comparison or one
// guard away from silently inverting. This probe rewrites exactly those
// lines, one at a time, and requires the named test file to go RED. A
// mutation that survives is a hole in the suite, reported by name.
//
// Deliberately NOT a generic mutation framework: the manifest below is
// hand-picked, every entry names the doctrine it defends and the test
// file that must kill it, and the whole run is a couple of minutes
// instead of hours. Adding an entry when a cycle ships a new fail-closed
// rule is the intended maintenance.
//
// Usage: node scripts/mutation-probe.mjs [--only <id>] [--list]
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Each mutation: the file, an EXACT source fragment (unique in the file),
 * its replacement, the test file that must fail, and the doctrine the
 * mutation attacks. `find` is matched literally, so a refactor that moves
 * the line makes the probe fail loudly with 'fragment not found' instead
 * of silently testing nothing.
 */
const MUTATIONS = [
  {
    id: 'usage-invariant',
    doctrine: 'the Usage invariant: inputTokens is the FULL prompt, cache included',
    file: 'packages/anthropic/src/wire.ts',
    find: 'inputTokens: input + cacheRead + cacheWrite,',
    replace: 'inputTokens: input,',
    test: 'packages/anthropic/src/index.test.ts',
  },
  {
    id: 'retry-non-retryable',
    doctrine: 'task-class failures never retry (a non-retryable WireError has no retry class)',
    file: 'packages/core/src/model/retry.ts',
    find: '  if (!error.retryable) {\n    return undefined;\n  }',
    replace: '  if (false) {\n    return undefined;\n  }',
    test: 'packages/core/src/runtime/retry-failover-loop.test.ts',
  },
  {
    id: 'typed-throw-class',
    doctrine: 'a typed throw out of stream() keeps its class instead of failing over (cycle 83)',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '        thrown instanceof RulvarError\n          ? // A TYPED throw',
    replace: '        false\n          ? // A TYPED throw',
    test: 'packages/core/src/runtime/retry-failover-loop.test.ts',
  },
  {
    id: 'truncation-fails-closed',
    doctrine: 'a stream that drains with no terminal event is a fault, never a partial success',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '  if (!sawFinish && wireError === undefined) {',
    replace: '  if (false && !sawFinish && wireError === undefined) {',
    // The rule has its own dedicated suite; agent-loop.test.ts stays
    // green under this mutation, which is exactly what the probe is for.
    test: 'packages/core/src/engine/stream-terminal-contract.test.ts',
  },
  {
    id: 'extension-headroom-admission',
    doctrine: 'a tool budget grant is admitted only with remaining budget headroom (RV301)',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '    const remaining = options.budget?.remainingUsd?.();\n    if (remaining !== undefined) {',
    replace:
      '    const remaining = options.budget?.remainingUsd?.();\n    if (false && remaining !== undefined) {',
    test: 'packages/core/src/runtime/tool-budget-extension.test.ts',
  },
  {
    id: 'sweep-claim-suppression',
    doctrine: 'a cell with non-ok targets never mints a model claim (cycle 81)',
    file: 'packages/evals/src/sweeps.ts',
    find: '        exhaustedRuns === 0 &&\n        nonOkRuns === 0 &&',
    replace: '        exhaustedRuns === 0 &&',
    test: 'packages/evals/src/sweeps.test.ts',
  },
  {
    id: 'checkpoint-contamination',
    doctrine: 'a contaminated A/B arm never passes the value gate (cycle 81)',
    file: 'packages/evals/src/checkpoint.ts',
    find: 'passed: !contaminated && rungRuleHolds(',
    replace: 'passed: rungRuleHolds(',
    test: 'packages/evals/src/checkpoint.test.ts',
  },
  {
    id: 'bridge-error-finish-bill',
    doctrine: 'an error finish still bills its usage (cycle 82)',
    file: 'packages/bridge-ai-sdk/src/bridge.ts',
    find: "        { type: 'usage', usage: mapUsage(part.usage) },",
    replace: '',
    test: 'packages/bridge-ai-sdk/src/bridge.test.ts',
  },
  {
    id: 'bridge-unparsed-wrapper',
    doctrine: 'unparseable tool args reach the engine repair path, never kill the turn (cycle 82)',
    file: 'packages/bridge-ai-sdk/src/bridge.ts',
    find: '          args: parsed.ok ? parsed.value : { __unparsed: part.input },',
    replace: '          args: parsed.ok ? parsed.value : {},',
    test: 'packages/bridge-ai-sdk/src/bridge.test.ts',
  },
  {
    id: 'server-rejection-honesty',
    doctrine: 'a segment that rejected reports error, never running forever (cycle 83)',
    file: 'packages/cli/src/server.ts',
    find: '      if (run.rejection !== undefined) {\n        // A segment that rejected has no outcome to report',
    replace: '      if (false) {\n        // A segment that rejected has no outcome to report',
    test: 'packages/cli/src/server.test.ts',
  },
  {
    id: 'sandbox-ambient-clock',
    doctrine: 'the sandbox realm has no ambient clock or entropy (cycle 83)',
    file: 'packages/planner/src/sandbox-worker.ts',
    find: '        Reflect.construct(target, args.length === 0 ? [shimNow()] : args, newTarget) as object,',
    replace: '        Reflect.construct(target, args, newTarget) as object,',
    test: 'packages/planner/src/sandbox-runner.test.ts',
    // The sandbox worker executes from dist: the probe rebuilds it.
    build: '@rulvar/planner',
  },
  {
    id: 'finalization-window-refusal',
    doctrine: 'a non-allowlisted call inside the finalization window is refused typed (RV302)',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '          if (windowState !== undefined && !windowAllows(gatedCall.name)) {\n            events?.emit({',
    replace: '          if (false) {\n            events?.emit({',
    test: 'packages/core/src/runtime/finalization-window.test.ts',
  },
  {
    id: 'synthesis-reserve-lifecycle-envelope',
    doctrine:
      'a configured synthesis reserve reports its lifecycle on the acceptance envelope (RV304)',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      ...(synthesisReserveLifecycle === undefined\n        ? {}\n        : { synthesisReserve: synthesisReserveLifecycle }),',
    replace: '',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'evidence-floor-warning',
    doctrine:
      'a cap that cannot fit the declared evidence contract is warned, never silent (RV303)',
    file: 'packages/core/src/engine/preflight.ts',
    find: '      if (executedToolCallCeiling < floor) {',
    replace: '      if (false) {',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'bridge-flat-response-id',
    doctrine: 'a bridged finish ships the flat responseId the reconciliation record reads (RV401)',
    file: 'packages/bridge-ai-sdk/src/bridge.ts',
    find: "      if (typeof this.response.id === 'string') {\n        // The flat form the core reconciliation record reads (RV401),",
    replace:
      '      if (false) {\n        // The flat form the core reconciliation record reads (RV401),',
    test: 'packages/bridge-ai-sdk/src/bridge-provenance.test.ts',
  },
  {
    id: 'synthesis-reserve-lifecycle-on-rejection',
    doctrine:
      'the reserve lifecycle journals even when the synthesis validator terminally rejects (RV402)',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      if (configuredReserveUsd > 0) {',
    replace: '      if (configuredReserveUsd > 0 && validationTermination === undefined) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'exec-key-incarnation-scope',
    doctrine:
      "a recreated runId never reuses the deleted incarnation's exec idempotency keys (RV403)",
    file: 'packages/core/src/runtime/executor.ts',
    find: '  const canonical = jcsSerialize({ derivation: 2, runId, genesis, agentSeq, ordinal, tool, args });',
    replace:
      '  const canonical = jcsSerialize({ derivation: 2, runId, agentSeq, ordinal, tool, args });',
    test: 'packages/core/src/engine/engine-exec-key.test.ts',
  },
  {
    id: 'exec-intent-before-dispatch',
    doctrine: 'a two-phase ledger records the intent durably before the external effect (RV404)',
    file: 'packages/executor/src/subprocess.ts',
    find: '      if (options.ledger?.intent !== undefined) {',
    replace: '      if (false) {',
    test: 'packages/executor/src/subprocess.test.ts',
  },
  {
    id: 'invoice-pricing-pin',
    doctrine: 'the settle pins the applied pricing so a re-fold reproduces the invoice (RV407)',
    file: 'packages/core/src/engine/pricing-snapshot.ts',
    find: '  return rows.length === 0 ? undefined : rows;',
    replace: '  return undefined;',
    test: 'packages/core/src/engine/pricing-snapshot.test.ts',
  },
  {
    id: 'mid-batch-boundary',
    doctrine: 'the configured cadence durably writes the pending boundary inside a batch (RV408)',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '      executedSinceBoundary += 1;\n      const boundaryCadence = limits.checkpointEveryToolCalls;',
    replace: '      executedSinceBoundary += 1;\n      const boundaryCadence = undefined;',
    test: 'packages/core/src/runtime/mid-batch-checkpoint.test.ts',
  },
  {
    id: 'sse-buffer-default-bound',
    doctrine: 'an unconfigured server still bounds the per-run SSE replay buffer (RV409)',
    file: 'packages/cli/src/server.ts',
    find: '  const bufferCap = options.maxBufferedEventsPerRun ?? DEFAULT_MAX_BUFFERED_EVENTS_PER_RUN;',
    replace: '  const bufferCap = options.maxBufferedEventsPerRun ?? Number.MAX_SAFE_INTEGER;',
    test: 'packages/cli/src/server.test.ts',
  },
  {
    id: 'exec-ledger-honest-outcome',
    doctrine: 'a dispatch that never ran ledgers error, never a success (cycle 92)',
    file: 'packages/executor/src/subprocess.ts',
    find: "      let outcome: ToolEffectRecord['outcome'] = 'error';",
    replace: "      let outcome: ToolEffectRecord['outcome'] = 'ok';",
    test: 'packages/executor/src/subprocess.test.ts',
  },
  {
    id: 'exec-key-derivation-stamp',
    doctrine:
      'a fresh run stamps its exec key derivation into RunMeta so resume derives the same keys (RV403)',
    file: 'packages/core/src/engine/engine.ts',
    find: '    const execKeyVersion =\n      resumeCtx === undefined ? CURRENT_EXEC_KEY_DERIVATION : resumeCtx.execKeyDerivation;',
    replace:
      '    const execKeyVersion =\n      resumeCtx === undefined ? undefined : resumeCtx.execKeyDerivation;',
    test: 'packages/core/src/engine/engine-exec-key.test.ts',
  },
  {
    id: 'ledger-attempt-pairing',
    doctrine:
      "an outcome resolves only its OWN attempt; a sibling retry's outcome never clears another attempt (RV501)",
    file: 'packages/executor/src/ledger.ts',
    find: '      : !resolvedAttempts.has(entry.attemptId),',
    replace:
      '      : !resolvedAttempts.has(entry.attemptId) && !outcomes.some((candidate) => candidate.idempotencyKey === entry.idempotencyKey),',
    test: 'packages/executor/src/ledger.test.ts',
  },
  {
    id: 'ledger-torn-boundary',
    doctrine:
      'the writer repairs a torn tail before appending, so a crash artifact can never swallow the next record (RV502)',
    file: 'packages/executor/src/ledger.ts',
    find: '    boundaryReady ??= repairTail(path, now);',
    replace: '    boundaryReady ??= Promise.resolve();',
    test: 'packages/executor/src/ledger.test.ts',
  },
  {
    id: 'cost-fold-per-call-basis',
    doctrine:
      'a fully attributed entry prices per provider call: a nonlinear tier fires per request, never on the aggregate (RV504)',
    file: 'packages/core/src/l0/entries.ts',
    find: '  if (!callsCoverSlices(slices, records)) {',
    replace: '  if (true || !callsCoverSlices(slices, records)) {',
    test: 'packages/core/src/engine/cost-report.test.ts',
  },
  {
    id: 'pricing-pin-segment-composition',
    doctrine:
      'a seq-aware fold prices each row under the pin of its OWN segment, so a table rotation never re-prices settled history (RV505)',
    file: 'packages/core/src/engine/pricing-snapshot.ts',
    find: '    if (seq === undefined) {\n      return lastByModel.get(servedBy);\n    }',
    replace:
      '    if (seq === undefined || seq >= 0) {\n      return lastByModel.get(servedBy);\n    }',
    test: 'packages/core/src/engine/pricing-snapshot.test.ts',
  },
  {
    id: 'tool-budget-grant-durability',
    doctrine:
      'an authorization is durable BEFORE the work it authorizes: a grant awaits its decision append, so no tool call runs under a raise the store never accepted (RV601)',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '    return durable({ grant, maxExtensions: extension.maxExtensions, toolCallsUsed, cap }).then(\n      commit,\n    );',
    replace:
      '    void durable({ grant, maxExtensions: extension.maxExtensions, toolCallsUsed, cap });\n    return commit();',
    test: 'packages/core/src/runtime/tool-budget-extension.test.ts',
  },
  {
    id: 'restored-cap-anchor',
    doctrine:
      'the journaled cap anchors a resumed ceiling, so drifting live limits cannot revoke a raise the model was promised and the two recovery paths agree (RV602)',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '        capBase = Math.max(journaledCap, derivedCap);',
    replace: '        capBase = Math.max(limits.maxToolCalls, derivedCap);',
    test: 'packages/core/src/runtime/tool-budget-extension.test.ts',
  },
  {
    id: 'synthesis-skip-generation',
    doctrine:
      'a journaled skip is the authority only for the contract generation and the draft it judged (RV603)',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '          contractGenerationCurrent(value) &&',
    replace: '          true &&',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
];

const args = process.argv.slice(2);
if (args.includes('--list')) {
  for (const mutation of MUTATIONS) {
    console.log(`${mutation.id}\t${mutation.doctrine}`);
  }
  process.exit(0);
}
const onlyIndex = args.indexOf('--only');
const only = onlyIndex === -1 ? undefined : args[onlyIndex + 1];
const selected = only === undefined ? MUTATIONS : MUTATIONS.filter((m) => m.id === only);
if (selected.length === 0) {
  console.error(`no mutation with id '${String(only)}'; run with --list`);
  process.exit(2);
}

function run(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '' },
  });
}

const survivors = [];
const missing = [];
for (const mutation of selected) {
  const path = join(root, mutation.file);
  const original = readFileSync(path, 'utf8');
  if (!original.includes(mutation.find)) {
    missing.push(mutation.id);
    console.log(`[mutation-probe] ${mutation.id}: FRAGMENT NOT FOUND (the source moved)`);
    continue;
  }
  if (original.split(mutation.find).length !== 2) {
    missing.push(mutation.id);
    console.log(`[mutation-probe] ${mutation.id}: fragment is not unique in ${mutation.file}`);
    continue;
  }
  writeFileSync(path, original.replace(mutation.find, mutation.replace), 'utf8');
  try {
    if (mutation.build !== undefined) {
      const built = run('npx', ['turbo', 'build', '--filter', mutation.build, '--force']);
      if (built.status !== 0) {
        // A mutation that does not even compile is killed by the build,
        // which is a legitimate kill: the suite never had to run.
        console.log(`[mutation-probe] ${mutation.id}: killed by the build`);
        continue;
      }
    }
    const result = run('npx', ['vitest', 'run', mutation.test]);
    if (result.status === 0) {
      survivors.push(mutation);
      console.log(`[mutation-probe] ${mutation.id}: SURVIVED (${mutation.test} stayed green)`);
    } else {
      console.log(`[mutation-probe] ${mutation.id}: killed`);
    }
  } finally {
    writeFileSync(path, original, 'utf8');
    if (mutation.build !== undefined) {
      run('npx', ['turbo', 'build', '--filter', mutation.build, '--force']);
    }
  }
}

if (missing.length > 0) {
  console.error(
    `[mutation-probe] ${String(missing.length)} mutation(s) could not be applied: ` +
      `${missing.join(', ')}. Update the manifest to the current source.`,
  );
}
if (survivors.length > 0) {
  console.error('[mutation-probe] SURVIVING MUTATIONS (the suite does not defend these):');
  for (const survivor of survivors) {
    console.error(`  - ${survivor.id}: ${survivor.doctrine} (expected kill in ${survivor.test})`);
  }
}
if (survivors.length > 0 || missing.length > 0) {
  process.exit(1);
}
console.log(
  `[mutation-probe] all ${String(selected.length)} doctrine mutations were killed by their tests`,
);
