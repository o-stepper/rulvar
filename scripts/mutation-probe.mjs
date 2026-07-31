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
      'a covered model prices per provider call under the symmetric per-model key: a nonlinear tier fires per request, never on an aggregate, several roles on one model included (RV504, RV604)',
    file: 'packages/core/src/l0/entries.ts',
    find: '  const covered = coveredModels(slices, records);',
    replace: '  const covered = new Set<ModelRef>();',
    test: 'packages/core/src/engine/cost-report.test.ts',
  },
  {
    id: 'invoice-residual-transfer',
    doctrine:
      "a target with no rows never transfers onto another model's line: the dust pass reconciles only what rows can carry and declares the rest (RV605)",
    file: 'packages/core/src/engine/invoice.ts',
    find: '    if (target !== 0 && !pools.has(key)) {\n      unallocated += target;\n    }',
    replace: '    if (false) {\n      unallocated += target;\n    }',
    test: 'packages/core/src/engine/invoice.test.ts',
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
    find: '    return durable({\n      grant,\n      maxExtensions: extension.maxExtensions,\n      toolCallsUsed,\n      cap,\n      ...(trigger === undefined ? {} : { trigger }),\n    }).then(commit);',
    replace:
      '    void durable({\n      grant,\n      maxExtensions: extension.maxExtensions,\n      toolCallsUsed,\n      cap,\n      ...(trigger === undefined ? {} : { trigger }),\n    });\n    return commit();',
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
  {
    id: 'ledger-repair-exclusion',
    doctrine:
      'tail repair is mutually exclusive across processes and never truncates a boundary computed from a stale read (RV606)',
    file: 'packages/executor/src/ledger.ts',
    find: '  await repairUnderLock(path, now);',
    replace:
      "  const boundary = raw.lastIndexOf(0x0a) + 1;\n  const fragment = raw.subarray(boundary).toString('utf8');\n  await truncate(path, boundary);\n  await appendFile(path, `${JSON.stringify({ phase: 'torn', bytes: fragment, recoveredAt: now() })}\\n`, 'utf8');",
    test: 'packages/executor/src/ledger-exclusion.test.ts',
  },
  {
    id: 'ledger-shape-validation',
    doctrine:
      'a ledger line is validated before anything dereferences it: an unknown phase, a primitive, or a missing field is corruption, never silence or a raw TypeError (RV607)',
    file: 'packages/executor/src/ledger.ts',
    find: '    const entry = asLedgerLine(parsed);\n    if (entry === undefined) {',
    replace: '    const entry = parsed as LedgerLine;\n    if (false) {',
    test: 'packages/executor/src/ledger.test.ts',
  },
  {
    id: 'quota-rules-snapshot',
    doctrine:
      'a limiter admits under the immutable snapshot taken at construction, never the caller’s live rule graph (RV608)',
    file: 'packages/core/src/model/quota.ts',
    find: '    firstIndexByKey.set(key, index);\n  });\n  return Object.freeze(',
    replace:
      '    firstIndexByKey.set(key, index);\n  });\n  if (rules.length > -1) return rules;\n  return Object.freeze(',
    test: 'packages/core/src/model/quota.test.ts',
  },
  {
    id: 'quota-denial-canonical-order',
    doctrine:
      'the denial fold visits matching rules in canonical rule-key order, so permuted identical sets refuse byte-identically (RV608)',
    file: 'packages/core/src/model/quota.ts',
    find: '    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));',
    replace: '    .sort(() => 0);',
    test: 'packages/core/src/model/quota.test.ts',
  },
  {
    id: 'restored-child-alias',
    doctrine:
      'recovered attempts alias by admission identity, not by the strictly monotonic call ordinal that makes the alias unreachable for any rerun (RV609)',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '              prior.key === dispatched.key &&\n              !records.has(prior.seq)',
    replace:
      '              prior.key === dispatched.key &&\n              prior.ordinal === dispatched.ordinal &&\n              !records.has(prior.seq)',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'evidence-empty-pattern-intake',
    doctrine:
      'a citation pattern that can match the empty string is refused at intake: an empty match is fabricated evidence (RV610)',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: "  if (probe.test('')) {",
    replace: '  if (false) {',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'cost-overflow-fold',
    doctrine:
      'the per-entry price fold refuses a non-finite sum typed instead of returning Infinity (RV610)',
    file: 'packages/core/src/l0/entries.ts',
    find: '    usd += price;\n    if (!Number.isFinite(usd)) {\n      throw foldOverflow(entry.seq, record.servedBy);\n    }',
    replace:
      '    usd += price;\n    if (false) {\n      throw foldOverflow(entry.seq, record.servedBy);\n    }',
    test: 'packages/core/src/engine/cost-report.test.ts',
  },
  {
    id: 'cost-overflow-boundary',
    doctrine:
      'no public cost report may carry a non-finite number: the cross-entry accumulation is guarded at the boundary (RV610)',
    file: 'packages/core/src/engine/cost-report.ts',
    find: "  // published report must never carry Infinity or NaN.\n  requireFiniteNumbersDeep(report, 'costReport');",
    replace: '  // published report must never carry Infinity or NaN.\n  void report;',
    test: 'packages/core/src/engine/cost-report.test.ts',
  },
  {
    id: 'pin-composition-tail',
    doctrine:
      'the composed fold prices the tail past the last pin at the current table, never silently at the last pin (RV611)',
    file: 'packages/core/src/engine/pricing-snapshot.ts',
    find: '    composedPriceUsd: (current) => (servedBy, usage, seq) =>\n      seq !== undefined && seq < pinnedThroughSeq',
    replace:
      '    composedPriceUsd: (current) => (servedBy, usage, seq) =>\n      seq !== undefined',
    test: 'packages/core/src/engine/pricing-snapshot.test.ts',
  },
  {
    id: 'invoice-pin-composition',
    doctrine:
      'the CLI invoice folds through the snapshot composition, not the raw last-pin snapshot (RV611)',
    file: 'packages/cli/src/commands.ts',
    find: '    snapshot === undefined ? assembled.priceUsd : snapshot.composedPriceUsd(assembled.priceUsd),',
    replace: '    snapshot?.priceUsd ?? assembled.priceUsd,',
    test: 'packages/cli/src/index.test.ts',
  },
  {
    id: 'server-pin-composition',
    doctrine:
      'the server cost endpoint folds through the snapshot composition, not the raw last-pin snapshot (RV611)',
    file: 'packages/cli/src/server.ts',
    find: '      settleSnapshot === undefined\n        ? currentPriceUsd\n        : settleSnapshot.composedPriceUsd(currentPriceUsd),',
    replace: '      settleSnapshot?.priceUsd ?? currentPriceUsd,',
    test: 'packages/cli/src/server.test.ts',
  },
  {
    id: 'invoice-provenance-segments',
    doctrine:
      'the invoice provenance declares every pinned version with its boundaries, not only the last (RV611)',
    file: 'packages/cli/src/commands.ts',
    find: '              segments: snapshot.segments,\n              pinnedThroughSeq: snapshot.pinnedThroughSeq,\n',
    replace: '',
    test: 'packages/cli/src/index.test.ts',
  },
  {
    id: 'jsonl-valid-tail-terminate',
    doctrine:
      'append terminates a parseable unterminated tail before writing, so it never glues two accepted records into one disposable line (RV701)',
    file: 'packages/core/src/stores/jsonl.ts',
    find: '      this.terminateUnterminatedTail(runId);\n',
    replace: '',
    test: 'packages/core/src/stores/jsonl.test.ts',
  },
  {
    id: 'jsonl-repair-salvage',
    doctrine:
      'torn-tail repair salvages whole records glued on the last line instead of discarding them with the fragment (RV701)',
    file: 'packages/core/src/stores/jsonl.ts',
    find: '          for (const value of splitConcatenatedJson(line).whole) {\n            entries.push(value as JournalEntry);\n          }\n',
    replace: '',
    test: 'packages/core/src/stores/jsonl.test.ts',
  },
  {
    id: 'cost-report-public-guard',
    doctrine:
      'the exported live builder refuses non-finite reports exactly like the journal fold (RV705)',
    file: 'packages/core/src/engine/cost-report.ts',
    find: "  // The public boundary (RV610, completed by RV705): the journal fold\n  // refuses non-finite reports, and the live builder a host feeds its\n  // own accumulation must refuse them identically.\n  requireFiniteNumbersDeep(report, 'costReport');\n",
    replace: '',
    test: 'packages/core/src/engine/cost-report.test.ts',
  },
  {
    id: 'percall-accumulator',
    doctrine:
      'live telemetry dollars accumulate per priced provider call, so a nonlinear tier fires per request, never on the phase aggregate (RV702)',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '          // The money twin of the record (RV702): this call priced\n          // individually, at the same chokepoint that minted it, so the\n          // phase deltas and the invocation total fold per request.\n          addCallUsd(site.role, target.resolved.ref, accounted);\n',
    replace: '',
    test: 'packages/core/src/engine/invocation-events.test.ts',
  },
  {
    id: 'percall-coverage-fallback',
    doctrine:
      'an invocation whose restored usage lacks call records falls back to the labeled aggregate estimate instead of silently dropping restored spend (RV702)',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "    if (!perCallCoverage) {\n      return { usd: priceRecordedUsage(), basis: 'aggregate-estimate' };\n    }",
    replace:
      "    if (false) {\n      return { usd: priceRecordedUsage(), basis: 'aggregate-estimate' };\n    }",
    test: 'packages/core/src/engine/invocation-events.test.ts',
  },
  {
    id: 'replay-phase-percall',
    doctrine:
      'replayed phase pairs carry the billing-fold dollars of their (role, model) key, identical to the live per-call stream (RV702)',
    file: 'packages/core/src/engine/ctx.ts',
    find: '              costUsd: usdByRoleModel.get(`${slice.role ?? primaryRole} ${slice.servedBy}`) ?? 0,',
    replace: '              costUsd: 0,',
    test: 'packages/core/src/engine/invocation-events.test.ts',
  },
  {
    id: 'reducer-basis-default',
    doctrine:
      'the reducer defaults an absent cost basis to aggregate-estimate, never to a per-call claim it cannot back (RV702)',
    file: 'packages/core/src/l0/telemetry-reduce.ts',
    find: "        phase.costBasis = event.costBasis ?? 'aggregate-estimate';",
    replace: "        phase.costBasis = event.costBasis ?? 'per-call';",
    test: 'packages/core/src/engine/invocation-events.test.ts',
  },
  {
    id: 'invoice-covered-remainder',
    doctrine:
      "a covered model's invoice rows are exactly its records; fabricating a per-slice remainder for it double-counts tokens and skews allocation (RV703)",
    file: 'packages/core/src/engine/invoice.ts',
    find: '      if (billing.coveredModels.has(slice.servedBy)) {\n        continue;\n      }\n',
    replace: '',
    test: 'packages/core/src/engine/invoice.test.ts',
  },
  {
    id: 'quota-duplicate-refused',
    doctrine:
      'a rule set with two identical rules is refused at the shared construction chokepoint, never admitted into storage-divergent buckets (RV704)',
    file: 'packages/core/src/model/quota.ts',
    find: '    const first = firstIndexByKey.get(key);\n    if (first !== undefined) {',
    replace: '    const first = firstIndexByKey.get(key);\n    if (false) {',
    test: 'packages/core/src/model/quota.test.ts',
  },
  {
    id: 'invoice-current-version-json',
    doctrine:
      'a composed invoice provenance names the current table version that priced the tail, never leaving it anonymous (RV706)',
    file: 'packages/cli/src/commands.ts',
    find: '    assembled.currentPricingVersion === undefined\n      ? {}\n      : { currentPricingVersion: assembled.currentPricingVersion };',
    replace: '    assembled.currentPricingVersion === undefined\n      ? {}\n      : {};',
    test: 'packages/cli/src/index.test.ts',
  },
  {
    id: 'invoice-current-version-text',
    doctrine:
      'the invoice and inspect text forms name both halves of the composition: the pinned versions and the current table (RV706)',
    file: 'packages/cli/src/commands.ts',
    find: '  if (currentPricingVersion !== undefined) {\n    parts.push(`current ${currentPricingVersion}`);\n  }',
    replace: '',
    test: 'packages/cli/src/index.test.ts',
  },
  {
    id: 'ledger-quarantine-bytes',
    doctrine:
      'the ledger quarantine preserves the exact torn bytes with their hash, never only a lossy string two byte tails can share (RV707)',
    file: 'packages/executor/src/ledger.ts',
    find: "          phase: 'torn',\n          bytes: fragment.toString('utf8'),\n          bytesBase64: fragment.toString('base64'),\n          sha256: createHash('sha256').update(fragment).digest('hex'),\n          recoveredAt: now(),",
    replace:
      "          phase: 'torn',\n          bytes: fragment.toString('utf8'),\n          recoveredAt: now(),",
    test: 'packages/executor/src/ledger.test.ts',
  },
  {
    id: 'ledger-parseable-on-bytes',
    doctrine:
      'the tail-repair parseable decision is made on the exact bytes, so a lossy-parseable invalid-UTF-8 fragment quarantines instead of becoming manufactured corruption (RV707)',
    file: 'packages/executor/src/ledger.ts',
    find: '        JSON.parse(decodeStrict(fragment));',
    replace: "        JSON.parse(fragment.toString('utf8'));",
    test: 'packages/executor/src/ledger.test.ts',
  },
  {
    id: 'policy-facts-finalize',
    doctrine:
      'the opted-in finalize request carries the policy-facts digest so the final model sees the evidence the run observed (RV709)',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "        ...(options.policyFacts === true\n          ? [\n              {\n                role: 'user',\n                parts: [{ type: 'text', text: policyFactsLines().join('\\n') }],\n              } as Msg,\n            ]\n          : []),\n",
    replace: '',
    test: 'packages/core/src/runtime/policy-facts.test.ts',
  },
  {
    id: 'policy-facts-identity',
    doctrine:
      'the synthesis policy-facts line exists exactly under the opt-in: prompt bytes are journal identity, so an unconditional line would re-pay every existing synthesis on resume (RV709)',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        ...(spec.policyFacts === true',
    replace: '        ...(true',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'critical-path-clip',
    doctrine:
      'a post-fan-in bucket counts only the part of an interval inside the window: a straddling coordination activation must not smuggle pre-fan-in time into the decomposition (RV710)',
    file: 'packages/core/src/l0/telemetry-reduce.ts',
    find: '        from: Math.max(interval.from, windowFrom),',
    replace: '        from: interval.from,',
    test: 'packages/core/src/orchestrator/synthesis.test.ts',
  },
  {
    id: 'critical-path-union',
    doctrine:
      'coveredMs is the exact interval union, so an overlap between buckets can never shrink the residue the fold reports (RV710)',
    file: 'packages/core/src/l0/telemetry-reduce.ts',
    find: '    if (interval.from > to) {',
    replace: '    if (true) {',
    test: 'packages/core/src/orchestrator/synthesis.test.ts',
  },
  {
    id: 'exposure-admission',
    doctrine:
      'a dispatch whose estimate does not fit spent plus reserves plus live reservations is refused typed at the exposure cap, never admitted on the argument that the money is merely not spent yet (RV711)',
    file: 'packages/core/src/engine/budget.ts',
    find: '    if (committed >= cap || committed + estimateUsd > cap) {',
    replace: '    if (false) {',
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'exposure-release',
    doctrine:
      'a settled attempt returns exactly its estimate to the exposure pool: a leak would starve every later dispatch under the cap (RV711)',
    file: 'packages/core/src/engine/budget.ts',
    find: '      released = true;\n      this.inFlightExposureUsd = Math.max(0, this.inFlightExposureUsd - estimateUsd);',
    replace: '      released = true;',
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'exposure-loop-seam',
    doctrine:
      'the loop admits every attempt against the exposure cap before the wire call: an unwired hook is a cap that binds nothing (RV711)',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '          if (options.quota === undefined) {\n            const req = site.requestFor(target);\n            admitExposure(req);',
    replace:
      '          if (options.quota === undefined) {\n            const req = site.requestFor(target);',
    test: 'packages/core/src/runtime/turn-exposure.test.ts',
  },
  {
    id: 'ledger-settled-basis',
    doctrine:
      'the kernel ledger prices per provider call where the records cover the usage: an aggregate re-price lets a long-context tier fire on a phase sum no single request produced, 42.573% high live in the twelfth experiment (RV801)',
    file: 'packages/core/src/journal/replayer.ts',
    find: '        usd += priceEntryBilling(entry, this.priceUsd).usd;',
    replace: '        usd += this.priceUsd(entry.servedBy, entry.usage) ?? 0;',
    test: 'packages/core/src/journal/replayer.test.ts',
  },
  {
    id: 'parallel-fanout-partial',
    doctrine:
      'a mid-loop admission refusal in parallel_agents returns the started handles as a typed result: a throw loses the wave while the children keep spending (RV805)',
    file: 'packages/core/src/orchestrator/spawn-tools.ts',
    find: '        } catch (thrown) {\n          return {',
    replace: '        } catch (thrown) {\n          throw thrown;\n          return {',
    test: 'packages/core/src/orchestrator/spawn-tools.test.ts',
  },
  {
    id: 'acceptance-children-roster',
    doctrine:
      'the journaled acceptance decision carries the per-child machine roster with the evidence verdicts; name lists alone hid the twelfth experiment salvaged below-floor children (RV806)',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        children: childrenSummary,',
    replace: '',
    test: 'packages/core/src/orchestrator/salvage.test.ts',
  },
  {
    id: 'evidence-verdict-stamp',
    doctrine:
      'a declared evidence contract stamps every settled result with the count and the met verdict, the field the acceptance roster reads (RV806)',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '  if (evidenceFloor !== undefined && recordedEvidenceEntries !== undefined) {',
    replace: '  if (false) {',
    test: 'packages/core/src/engine/ctx-evidence-floor.test.ts',
  },
  {
    id: 'checkpoint-structural-decode',
    doctrine:
      'a parseable checkpoint with malformed nested messages decodes to undefined and the dispatch reruns; it never throws a raw TypeError out of the undefined-on-unparseable contract (RV804)',
    file: 'packages/core/src/journal/checkpoint.ts',
    find: "    if (\n      typeof msg !== 'object' ||\n      msg === null ||\n      typeof (msg as { role?: unknown }).role !== 'string' ||\n      !Array.isArray((msg as { parts?: unknown }).parts)\n    ) {\n      return undefined;\n    }",
    replace: '    if (false) {\n      return undefined;\n    }',
    test: 'packages/core/src/journal/checkpoint.test.ts',
  },
  {
    id: 'preflight-ceiling-guard',
    doctrine:
      'preflight refuses a NaN, negative, or infinite run ceiling with the same typed guard as the runtime, instead of folding it silently into every projection (RV803)',
    file: 'packages/core/src/engine/preflight.ts',
    find: "  if (input.run?.budgetUsd !== undefined) {\n    requireNonNegativeNumber(input.run.budgetUsd, 'preflight.run.budgetUsd');\n  }",
    replace:
      "  if (false) {\n    requireNonNegativeNumber(input.run.budgetUsd, 'preflight.run.budgetUsd');\n  }",
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'partial-export-coverage',
    doctrine:
      'a partially delivered provider export folds component deltas over the COVERED subset only: comparing a subset against the whole manufactures false divergence (RV812)',
    file: 'packages/openai/src/reconcile.ts',
    find: '    covered = matched;\n    matchedRows = matched.length;',
    replace: '    covered = billable;\n    matchedRows = matched.length;',
    test: 'packages/openai/src/reconcile.test.ts',
  },
  {
    id: 'headline-aggregate-refusal',
    doctrine:
      'a statement with no rows (a headline total) is refused typed: eventually consistent dashboard aggregates are not reconciliation evidence (RV812, the 4.45-vs-7.30 lesson)',
    file: 'packages/openai/src/reconcile.ts',
    find: '  if (statement.rows.length === 0) {',
    replace: '  if (false) {',
    test: 'packages/openai/src/reconcile.test.ts',
  },
  {
    id: 'tool-span-pairing',
    doctrine:
      'a tool:end closes its own synthetic pair span, never the agent span it rides: the agent span must live to agent:end with its usage, cost, and exploration attributes (RV802)',
    file: 'packages/cli/src/otel.ts',
    find: '        key ??= openToolPairs.get(toolPairOf(event.spanId, event.toolName))?.shift();',
    replace: '        key ??= event.spanId;',
    test: 'packages/cli/src/otel.test.ts',
  },
  {
    id: 'run-end-settled-total',
    doctrine:
      "run:end's dollars are asserted against the settled report: before RV801 no test pinned the event's totalUsd to outcome.cost.totalUsd, which is exactly how the terminal event lied by 42.573% while every other surface agreed (RV801)",
    file: 'packages/core/src/engine/engine.ts',
    find: '          totalUsd: outcome.cost.totalUsd,',
    replace: '          totalUsd: 0,',
    test: 'packages/core/src/engine/invocation-events.test.ts',
  },
  {
    id: 'readme-sha-ancestor-gate',
    doctrine:
      'every SHA the README release table cites must be an ancestor of HEAD: the v1.109.0 row pointed at an object no branch contained for eleven releases, and a gate that stops checking ancestry green-washes exactly that (RV807)',
    file: 'scripts/readme-release-shas.mjs',
    find: "    if (git('merge-base', '--is-ancestor', sha, 'HEAD').status !== 0) {",
    replace: '    if (false) {',
    test: 'scripts/readme-release-shas.test.mjs',
  },
  {
    id: 'rates-audit-divergence',
    doctrine:
      'the documented-rates comparator names every seed field that diverges from the page; a comparator that tolerates the difference silently re-verifies a stale seed forever (RV813, published home RV909)',
    file: 'packages/core/src/model/pricing.ts',
    find: '    } else if (!(Math.abs(seedValue - pageValue) <= 1e-9)) {',
    replace: '    } else if (false as boolean) {',
    test: 'packages/core/src/model/pricing.test.ts',
  },
  {
    id: 'preflight-rates-verified-stamp',
    doctrine:
      'preflight stamps the serving row ratesVerifiedAt onto the spawn report so the staleness of the rates behind every projected dollar is visible before any spend (RV814)',
    file: 'packages/core/src/engine/preflight.ts',
    find: '      ...(pricing?.ratesVerifiedAt === undefined\n        ? {}\n        : { ratesVerifiedAt: pricing.ratesVerifiedAt }),',
    replace: '      ...{},',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'draft-contract-gate',
    doctrine:
      "draftPolicy 'contract' judges the coordination draft by the FULL declared validator set, so the coordination repair loop drives the draft toward what the skip pre-pass will judge instead of a weak subset (RV808a)",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "      if (policy === 'contract') {",
    replace: '      if (false) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'draft-gaps-carried',
    doctrine:
      'a failed skip pre-pass under carryDraftGaps rides the synthesis prompt as the named DRAFT CONTRACT GAPS line instead of being discarded, which is exactly the double rework the twelfth run paid for (RV808a)',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        ...(draftGaps === undefined\n          ? []\n          : [',
    replace: '        ...(true\n          ? []\n          : [',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'carry-gaps-intake-pair',
    doctrine:
      'carryDraftGaps without skipWhenDraftValid is refused typed at intake: the gaps ARE the pre-pass verdict and a silent no-op option is a lie (RV808a)',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      if (conditional.carryDraftGaps && conditional.skipWhenDraftValid !== true) {',
    replace: '      if (false) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'sectional-splice-anchor',
    doctrine:
      'spliceSections replaces a patched section IN PLACE at its line anchor; without the anchor every patch would silently append and the reconstructed document would duplicate instead of repair (RV808b)',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '    if (at >= 0) {\n      anchors.push({ marker, at });\n    }',
    replace: '    if (false) {\n      anchors.push({ marker, at });\n    }',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'sectional-retained-gate',
    doctrine:
      'a sections-only finish with no retained rejected attempt is refused typed with the full-resubmission remedy; splicing into nothing must never reach spliceSections (RV808b)',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '          if (retained === undefined) {',
    replace: '          if (false) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'evidence-index-pool',
    doctrine:
      'the EVIDENCE INDEX extracts citations ONLY from evidence-pool children (ok and salvage-accepted): an indexed citation from a failed child is one the validators would reject as fabricated (RV808b)',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "                const eligible =\n                  settled.status === 'ok' ||",
    replace: '                const eligible =\n                  true ||',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'deficit-boundary-trigger',
    doctrine:
      'the RV809 proactive grant fires at a tool-turn boundary whose remaining calls cannot cover the declared evidence deficit; without the trigger the child slams into the cap and dumps evidence through the reserved tail',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '    if (deficit <= 0 || cap - toolCallsUsed >= deficit) {\n      return undefined;\n    }',
    replace: '    if (true) {\n      return undefined;\n    }',
    test: 'packages/core/src/runtime/tool-budget-extension.test.ts',
  },
  {
    id: 'cache-write-ttl-rate',
    doctrine:
      'the 1h cache-write share prices at its own premium rate when the usage carries the TTL split (RV810); folding it at the 5m rate underbills exactly the premium the provider charges',
    file: 'packages/core/src/model/pricing.ts',
    find: '  const write1hRate = pricing.cacheWrite1hUsdPerMTok ?? writeRate;',
    replace: '  const write1hRate = writeRate;',
    test: 'packages/core/src/model/pricing.test.ts',
  },
  {
    id: 'fault-kit-exposure-drive',
    doctrine:
      'the fault-injection kit actually DRIVES the in-flight-exposure branch (RV811): a cap too high to fire must make the scenario report matched false, fail closed, instead of the kit vouching for a branch it never entered',
    file: 'packages/evals/src/fault-injection.ts',
    find: '      maxInFlightExposureUsd: 0.0001,',
    replace: '      maxInFlightExposureUsd: 1e9,',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'audit-page-only-field',
    doctrine:
      'the rates comparator fails closed on a billable page rate the seed never declared (RV902, published home RV909): the one-directional skip is exactly where the 1h underpricing hid behind a printed match',
    file: 'packages/core/src/model/pricing.ts',
    find: '    if (seedValue === undefined) {\n      if (pageValue !== undefined) {\n        findings.push(\n          `${field}: the page shows ${String(pageValue)} but the seed declares no such rate`,\n        );\n      }\n      continue;\n    }',
    replace: '    if (seedValue === undefined) {\n      continue;\n    }',
    test: 'packages/core/src/model/pricing.test.ts',
  },
  {
    id: 'anthropic-1h-seed-rate',
    doctrine:
      'the Anthropic seed declares the documented 2x-input 1h cache-write premium (RV901): a seed that quietly reverts Sonnet 5 to the 5m rate underbills every 1h write token by $1.50/MTok',
    file: 'packages/anthropic/src/caps.ts',
    find: '    { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5, cacheWrite1h: 4 },',
    replace: '    { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5, cacheWrite1h: 2.5 },',
    test: 'packages/anthropic/src/pricing.test.ts',
  },
  {
    id: 'openai-terra-cut',
    doctrine:
      "the Terra row carries the provider's 2026-07-30 documented price cut under a distinct pricingVersion (RV911): a seed that silently reverts to the pre-cut rate reprices recorded history without any declared drift",
    file: 'packages/openai/src/caps.ts',
    find: '    inputUsdPerMTok: 2,\n    outputUsdPerMTok: 12,',
    replace: '    inputUsdPerMTok: 2.5,\n    outputUsdPerMTok: 12,',
    test: 'packages/openai/src/index.test.ts',
  },
  {
    id: 'reconcile-nan-intake',
    doctrine:
      "statement dollars that cannot be summed refuse typed at intake (RV903): with the finiteness gate gone, usd NaN flows through the totals, Math.abs(NaN) > tolerance is false, and a corrupted export reads verdict 'match' with NaN deltas",
    file: 'packages/openai/src/reconcile.ts',
    find: '  if (!Number.isFinite(value)) {\n    throw new ConfigError(\n      `statement reconciliation refused: ${where} carries ${field} ${String(value)}, which ` +',
    replace:
      '  if (false) {\n    throw new ConfigError(\n      `statement reconciliation refused: ${where} carries ${field} ${String(value)}, which ` +',
    test: 'packages/openai/src/reconcile.test.ts',
  },
  {
    id: 'reconcile-token-verdict',
    doctrine:
      'provider-reported token disagreements decide the verdict by default (RV903): with the branch disarmed, an export describing different requests than the wire served still reads match whenever its dollars happen to agree',
    file: 'packages/openai/src/reconcile.ts',
    find: "  const tokensDivergent = tokenComparison === 'verdict' && tokenMismatches > 0;",
    replace:
      "  const tokensDivergent = false && tokenComparison === 'verdict' && tokenMismatches > 0;",
    test: 'packages/openai/src/reconcile.test.ts',
  },
  {
    id: 'count-admission-floor',
    doctrine:
      'the pre-egress admission feasibility check runs against the real reserve floor (RV904): collapsed to zero, a spawn the budget could never admit sends the full child prompt to the provider count endpoint before the refusal',
    file: 'packages/core/src/engine/ctx.ts',
    find: '      internals.budget.refuseSpawnIfInfeasible(\n        floorHeadroomUsd === undefined\n          ? floorReserveUsd\n          : Math.min(floorReserveUsd, floorHeadroomUsd),\n        budgetAccount,\n      );',
    replace: '      internals.budget.refuseSpawnIfInfeasible(0, budgetAccount);',
    test: 'packages/core/src/engine/ctx-count-admission.test.ts',
  },
  {
    id: 'count-signal-thread',
    doctrine:
      "the admission count is egress like any dispatch and must honor the caller's abort (RV904): an adapter that drops the signal leaves an uncancellable full-prompt request behind a cancelled spawn",
    file: 'packages/anthropic/src/adapter.ts',
    find: '      const result = await client.messages.countTokens(\n        body,\n        opts?.signal === undefined ? undefined : { signal: opts.signal },\n      );',
    replace: '      const result = await client.messages.countTokens(body, undefined);',
    test: 'packages/anthropic/src/index.test.ts',
  },
  {
    id: 'spawn-admission-shared-arm',
    doctrine:
      'admitSpawn decides through the same refusal arithmetic the RV904 pre-check runs (refuseSpawnIfInfeasible): with the shared arm unwired, every spawn admits past any ceiling and the two admission layers can disagree about a refusal',
    file: 'packages/core/src/engine/budget.ts',
    find: '  admitSpawn(reserveUsd: number, accountScope: string = ROOT_ACCOUNT): void {\n    this.refuseSpawnIfInfeasible(reserveUsd, accountScope);',
    replace: '  admitSpawn(reserveUsd: number, accountScope: string = ROOT_ACCOUNT): void {',
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'wire-request-set',
    doctrine:
      'a pause_turn absorption names its whole wire request set on the finish metadata (RV905): with the field disarmed, up to six wire calls read as one to quota, the call record, and the statement join',
    file: 'packages/anthropic/src/wire.ts',
    find: '        if (options?.wirePrior !== undefined) {',
    replace: '        if (false) {',
    test: 'packages/anthropic/src/index.test.ts',
  },
  {
    id: 'wire-window-settle',
    doctrine:
      'the request window settles at the true wire count through the shared delta arithmetic (RV905): collapsed to zero, a pause_turn-heavy workload overruns the provider RPM cap by the continuation factor on every reference limiter',
    file: 'packages/core/src/model/quota.ts',
    find: "  return typeof requests === 'number' && Number.isInteger(requests) && requests > 1\n    ? requests - 1\n    : 0;",
    replace:
      "  return typeof requests === 'number' && Number.isInteger(requests) && requests > 1\n    ? 0\n    : 0;",
    test: 'packages/core/src/engine/wire-units.test.ts',
  },
  {
    id: 'wire-loop-actual',
    doctrine:
      'the loop passes the finish-reported wire count into the quota settlement (RV905): dropped on the floor, the reservation stays at one request and the window undercount survives every limiter fix',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "              typeof wireCount === 'number' && Number.isInteger(wireCount) && wireCount > 1\n                ? { requests: wireCount }\n                : undefined,",
    replace: '              undefined,',
    test: 'packages/core/src/engine/wire-units.test.ts',
  },
  {
    id: 'wire-join-all-or-nothing',
    doctrine:
      'a multi-wire dispatch joins its statement segments all-or-nothing (RV905): joined on any subset, a partially delivered export compares a fragment against the whole dispatch and manufactures divergence out of incomplete delivery',
    file: 'packages/openai/src/reconcile.ts',
    find: '      if (rowIds.length === 0 || hits.length !== rowIds.length) {',
    replace: '      if (rowIds.length === 0 || hits.length === 0) {',
    test: 'packages/openai/src/reconcile.test.ts',
  },
  {
    id: 'forced-finish-partial',
    build: '@rulvar/core',
    doctrine:
      "a forced finish never impersonates a full success (RV906): stamped 'complete', a consumer reading the completion pair executes a truncated plan as done",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "          completion: contractComplete ? 'complete' : 'partial',",
    replace: "          completion: 'complete',",
    test: 'packages/plan/src/orchestrator-budget.test.ts',
  },
  {
    id: 'forced-finish-acceptance-unproven',
    build: '@rulvar/core',
    doctrine:
      "a declared acceptance policy keeps the capped terminal 'partial' (RV906): acceptance is never judged at the cap, so dropping the guard claims a contract nothing evaluated",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '          validationSpec !== undefined &&\n          opts?.acceptance === undefined &&',
    replace: '          validationSpec !== undefined &&',
    test: 'packages/plan/src/orchestrator-budget.test.ts',
  },
  {
    id: 'finalize-validators-bound',
    build: '@rulvar/core',
    doctrine:
      'the declared finish validators bind the reserved finalizer (RV906): unbound, a capped run returns output the declared contract would have rejected',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        // dispatch keeps its exact historical bytes.\n        [kTerminalTool]: {\n          name: FINISH_TOOL_NAME,\n          ...(validationSpec === undefined\n            ? {}\n            : {\n                validate: validateFinish,\n                ...(validationSpec.repairTurnReserve === undefined\n                  ? {}\n                  : { repairTurnReserve: validationSpec.repairTurnReserve }),\n              }),\n        },',
    replace:
      '        // dispatch keeps its exact historical bytes.\n        [kTerminalTool]: { name: FINISH_TOOL_NAME },',
    test: 'packages/plan/src/orchestrator-budget.test.ts',
  },
  {
    id: 'finalize-effect-rollforward',
    build: '@rulvar/core',
    doctrine:
      'the journaled finalize effect rolls forward on resume (RV906): re-dispatching mints a fresh agent identity from the drifted live digest and re-pays the reserve on every resume of a settled capped run',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        priorFinalize !== undefined || priorFallback !== undefined\n          ? {',
    replace: '        false\n          ? {',
    test: 'packages/plan/src/orchestrator-budget.test.ts',
  },
  {
    id: 'runend-settled-mark',
    doctrine:
      'a failed settlement marks run:end settled false (RV907): unmarked, an event-only consumer reads a green terminal that exists in no durable record',
    file: 'packages/core/src/engine/engine.ts',
    find: "          ...(settlementFailure !== undefined\n            ? { settled: false as const }\n            : supersededBy !== undefined\n              ? { settled: false as const, settledReason: 'superseded' as const }\n              : {}),",
    replace: '          ...{},',
    test: 'packages/core/src/engine/settlement.test.ts',
  },
  {
    id: 'runend-settled-absent',
    doctrine:
      'an ordinary settled terminal carries no settled field (RV907 byte doctrine): stamping every run flags healthy terminals and breaks the absent-field contract',
    file: 'packages/core/src/engine/engine.ts',
    find: "          ...(settlementFailure !== undefined\n            ? { settled: false as const }\n            : supersededBy !== undefined\n              ? { settled: false as const, settledReason: 'superseded' as const }\n              : {}),",
    replace: '          ...{ settled: false as const },',
    test: 'packages/core/src/engine/settlement.test.ts',
  },
  {
    id: 'tool-event-call-id',
    doctrine:
      'every live tool event names its call (RV908): without the id, consumers are back to FIFO-guessing which of two same-name executions failed',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "        type: 'tool:start',\n        toolName: call.name,\n        toolCallId: call.id,",
    replace: "        type: 'tool:start',\n        toolName: call.name,",
    test: 'packages/core/src/runtime/tool-dispatch.test.ts',
  },
  {
    id: 'replay-tool-id',
    doctrine:
      'the replayed tool reconstruction names the same call id as the live stream (RV908): dropped, a resumed stream pairs worse than the run it replays',
    file: 'packages/core/src/engine/ctx.ts',
    find: "          { type: 'tool:start', toolName: toolResult.name, toolCallId: toolResult.id },",
    replace: "          { type: 'tool:start', toolName: toolResult.name },",
    test: 'packages/core/src/engine/invocation-events.test.ts',
  },
  {
    id: 'otel-tool-id-pairing',
    doctrine:
      'the OTel exporter pairs tool spans exactly by toolCallId (RV908): degraded to FIFO, concurrent same-name calls finishing out of order swap durations and outcomes',
    file: 'packages/cli/src/otel.ts',
    find: '          key = openToolById.get(idKey);\n          if (key !== undefined) {\n            openToolById.delete(idKey);\n          }',
    replace: '          key = undefined;',
    test: 'packages/cli/src/otel.test.ts',
  },
  {
    id: 'otel-fifo-fallback',
    doctrine:
      'streams without the id keep the historical FIFO pairing (RV908): removed, every pre-RV908 journal renders its tool executions as orphan span events',
    file: 'packages/cli/src/otel.ts',
    find: '        key ??= openToolPairs.get(toolPairOf(event.spanId, event.toolName))?.shift();',
    replace: '        key ??= undefined;',
    test: 'packages/cli/src/otel.test.ts',
  },
  {
    id: 'fault-kit-nan-drive',
    doctrine:
      'the nan-statement scenario actually FEEDS unsummable dollars (RV909): with the fault swapped for a clean amount, the intake refusal never fires and the scenario must report matched false instead of vouching for a branch it never entered',
    file: 'packages/evals/src/fault-injection.ts',
    find: "        { kind: 'requests', rows: [{ responseId: 'resp-1', usd: Number.NaN }] },",
    replace: "        { kind: 'requests', rows: [{ responseId: 'resp-1', usd: 0.006 }] },",
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'fault-kit-token-mismatch-drive',
    doctrine:
      'the token-mismatch scenario actually DISAGREES with the wire (RV909): with the statement echoing our recorded count, no mismatch exists, the default verdict reads match, and the scenario must fail closed',
    file: 'packages/evals/src/fault-injection.ts',
    find: "      rows: [{ responseId: 'resp-1', usd: 0.006, usage: { inputTokens: 999, outputTokens: 200 } }],",
    replace:
      "      rows: [{ responseId: 'resp-1', usd: 0.006, usage: { inputTokens: 1000, outputTokens: 200 } }],",
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'fault-kit-audit-direction-drive',
    doctrine:
      'the audit scenario actually PROBES the page-only direction (RV909): comparing the full seed against itself produces no seed-gap finding and the scenario must report matched false',
    file: 'packages/evals/src/fault-injection.ts',
    find: '    const seedGap = compareRates(withoutPremium, withPremium);',
    replace: '    const seedGap = compareRates(withPremium, withPremium);',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'fault-kit-1h-split-drive',
    doctrine:
      'the 1h-premium scenario actually SHIPS the TTL split (RV909): without the split fields the whole write count folds at the 5m rate exactly like the pre-RV810 wire, and the scenario must report matched false instead of praising the undifferentiated fold',
    file: 'packages/evals/src/fault-injection.ts',
    find: '      cacheWriteTokens: 300_000,\n      cacheWrite5mTokens: 200_000,\n      cacheWrite1hTokens: 100_000,\n    };',
    replace: '      cacheWriteTokens: 300_000,\n    };',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'fault-kit-pause-units-drive',
    doctrine:
      'the pause-turn scenario actually ABSORBS continuations (RV909): with the wireRequests metadata gone the dispatch is single-wire, no segment set reaches the invoice or the quota window, and the scenario must fail closed',
    file: 'packages/evals/src/fault-injection.ts',
    find: "        metadata: {\n          responseId: 'seg-1',\n          wireRequests: { count: 3, responseIds: ['seg-1', 'seg-2', 'seg-3'] },\n        },",
    replace: "        metadata: {\n          responseId: 'seg-1',\n        },",
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'fault-kit-count-egress-drive',
    doctrine:
      'the pre-admission scenario actually STARVES the ceiling (RV909): with a boundless budget nothing refuses, the run settles ok, and the scenario must report matched false instead of claiming a refusal that never happened',
    file: 'packages/evals/src/fault-injection.ts',
    find: "      runId: 'fault-count',\n      budgetUsd: 0.001,",
    replace: "      runId: 'fault-count',\n      budgetUsd: 1e9,",
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'fault-kit-forced-finish-drive',
    doctrine:
      'the forced-finish scenario actually FINISHES through the reserved wake (RV909): a finalizer that burns its turns without calling finish falls back to the synthesized partial on the exhausted outcome, and the ok-envelope claim must fail closed',
    file: 'packages/evals/src/fault-injection.ts',
    find: "            ? fakeToolCalls({ name: 'finish', args: { result: 'partial but honest' } })",
    replace: "            ? fakeToolCalls({ name: 'plan_view', args: {} })",
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'fault-kit-settlement-drive',
    doctrine:
      'the settlement scenario actually INJECTS the outage (RV909): disarmed, the run settles clean, no SettlementError rejects and no settled=false mark exists, so the scenario must report matched false',
    file: 'packages/evals/src/fault-injection.ts',
    find: 'class RunSettleOutageStore extends InMemoryStore {\n  armed = true;',
    replace: 'class RunSettleOutageStore extends InMemoryStore {\n  armed = false;',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'ttl-live-cleaner-split',
    doctrine:
      'the mid-stream usage inlet carries the cache-write TTL split to the live debit (RV1001): dropped, the ledger prices a differentiated write at the plain 5m rate and a $4 ceiling holds against $3.75 while settlement records $4.50',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "            'reasoningTokens',\n            'cacheWrite5mTokens',\n            'cacheWrite1hTokens',\n          ] as const) {",
    replace: "            'reasoningTokens',\n          ] as const) {",
    test: 'packages/core/src/engine/ttl-live-parity.test.ts',
  },
  {
    id: 'ttl-aggregate-split',
    doctrine:
      'the canonical usage adder keeps the TTL split aggregates were billed under (RV1001): dropped, run:end usage and every fold silently lose the 1h attribution the money named',
    file: 'packages/core/src/l0/usage.ts',
    find: '  if (\n    total.cacheWrite5mTokens !== undefined ||\n    total.cacheWrite1hTokens !== undefined ||\n    turn.cacheWrite5mTokens !== undefined ||\n    turn.cacheWrite1hTokens !== undefined\n  ) {',
    replace: '  if (false as boolean) {',
    test: 'packages/core/src/l0/usage.test.ts',
  },
  {
    id: 'ttl-remainder-split',
    doctrine:
      'the finish remainder keeps the TTL attribution when no mid-stream event reported it (RV1001): dropped, a finish-only differentiated write live-debits its 1h share at the plain write rate and the two money paths disagree again',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '    const write1hRemainder = Math.max(\n      0,\n      (safe.cacheWrite1hTokens ?? 0) - (reported.cacheWrite1hTokens ?? 0),\n    );',
    replace: '    const write1hRemainder = 0;',
    test: 'packages/core/src/engine/ttl-live-parity.test.ts',
  },
  {
    id: 'fault-kit-ttl-parity-drive',
    doctrine:
      'the parity scenario actually DRIVES a differentiated write against the live ledger (RV1002): with the split dropped from the fixture both readings collapse to $3.75, the expected $4.50 never appears, and the scenario must report matched false',
    file: 'packages/evals/src/fault-injection.ts',
    find: '  cacheWriteTokens: 300_000,\n  cacheWrite5mTokens: 200_000,\n  cacheWrite1hTokens: 100_000,\n};\n\nconst ttlLiveBudgetParity: FaultScenario = {',
    replace: '  cacheWriteTokens: 300_000,\n};\n\nconst ttlLiveBudgetParity: FaultScenario = {',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'pause-usage-accumulation',
    doctrine:
      'the terminal finish speaks for the WHOLE pause_turn absorption (RV1003): with the prior-segment fold dropped, the finish carries only the last segment, core reads mid-stream 11 over finish 6, and a legitimate continuation dies on the usage invariant with its paid segments lost from the money',
    file: 'packages/anthropic/src/wire.ts',
    find: '          usage: options?.usagePrior === undefined ? usage : sumUsage(options.usagePrior, usage),',
    replace: '          usage,',
    test: 'packages/anthropic/src/pause-turn-usage.test.ts',
  },
  {
    id: 'pause-cap-validation',
    doctrine:
      'an invalid pauseTurnMaxContinuations refuses typed before the first wire (RV1004): disarmed, NaN silently removes the continuation bound (continuations > NaN is always false) and every unbounded continuation is a paid provider request',
    file: 'packages/anthropic/src/adapter.ts',
    find: '      if (\n        rawPauseCap !== undefined &&',
    replace: '      if (\n        (false as boolean) &&\n        rawPauseCap !== undefined &&',
    test: 'packages/anthropic/src/pause-turn-usage.test.ts',
  },
  {
    id: 'fault-kit-pause-real-drive',
    doctrine:
      'the real-adapter scenario actually DRIVES a two-segment pause_turn (RV1003): with the first segment finishing instead of pausing, one wire serves the whole turn, the expected 11/2 usage and two-id wire set never appear, and the scenario must report matched false',
    file: 'packages/evals/src/fault-injection.ts',
    find: "                { type: 'message_delta', delta: { stop_reason: 'pause_turn' }, usage: {} },",
    replace:
      "                { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: {} },",
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'statement-contradiction-intake',
    doctrine:
      'an export row carrying a total that contradicts its own component split refuses typed at intake (RV1005): disarmed, usd 100 beside components summing 1 reads verdict match because each claim sits inside its own tolerance and nothing compares them to each other',
    file: 'packages/openai/src/reconcile.ts',
    find: '        if (\n          row.usd !== undefined &&\n          componentsSeen > 0 &&',
    replace:
      '        if (\n          (false as boolean) &&\n          row.usd !== undefined &&\n          componentsSeen > 0 &&',
    test: 'packages/openai/src/reconcile.test.ts',
  },
  {
    id: 'statement-totals-unsuppressed',
    doctrine:
      'presence of a component split no longer suppresses the totals comparison (RV1005): with the historical guard restored, a total drifting 5 USD beside agreeing components reads verdict match and the one comparison that can see the drift never runs',
    file: 'packages/openai/src/reconcile.ts',
    find: '  const totalsDivergent =\n    totalsComparable && totalsDelta !== undefined && Math.abs(totalsDelta) > totalToleranceUsd;',
    replace:
      '  const totalsDivergent =\n    statementComponents === undefined &&\n    totalsComparable && totalsDelta !== undefined && Math.abs(totalsDelta) > totalToleranceUsd;',
    test: 'packages/openai/src/reconcile.test.ts',
  },
  {
    id: 'statement-settleable-predicate',
    doctrine:
      'settleable is the full settlement-grade composite (RV1006): with the usage-unknown condition dropped, a match over a ledger still holding unattributed money reads settleable true and the predicate stops naming exactly the money a match cannot vouch for',
    file: 'packages/openai/src/reconcile.ts',
    find: "    settleable:\n      verdict === 'match' &&\n      coverageComplete &&\n      usageUnknownRows === 0 &&\n      unpricedModels.size === 0,",
    replace:
      "    settleable:\n      verdict === 'match' &&\n      coverageComplete &&\n      unpricedModels.size === 0,",
    test: 'packages/openai/src/reconcile.test.ts',
  },
  {
    id: 'fault-kit-settleable-drive',
    doctrine:
      'the settleable scenario actually DRIVES a real unknown-usage attempt (RV1006): with the scripted pre-usage failure dropped, no ledger row settles usageUnknown, the guarded report stops reading match with settleable false, and the scenario must report matched false',
    file: 'packages/evals/src/fault-injection.ts',
    find: "      {\n        text: 'never delivered',\n        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },\n        failBeforeUsage: true,\n      },",
    replace:
      "      {\n        text: 'never delivered',\n        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },\n      },",
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'rates-page-only-tier',
    doctrine:
      'a long-context tier the page documents and the seed never declared is a finding (RV1007): disarmed, the tier loop runs only when the SEED declares tiers and a page-only premium is the silent underpricing channel the RV902 doctrine names',
    file: 'packages/core/src/model/pricing.ts',
    find: '    if (Array.isArray(pageTiers) && pageTiers.length > 0) {',
    replace: '    if ((false as boolean) && Array.isArray(pageTiers) && pageTiers.length > 0) {',
    test: 'packages/core/src/model/pricing.test.ts',
  },
  {
    id: 'rates-nan-scalar',
    doctrine:
      'NaN on either side of a scalar rate is a finding, never agreement (RV1007): with the positive comparison form restored, a page extraction that stops parsing yields NaN, NaN > epsilon is false, and the audit reads a broken extraction as a clean pass',
    file: 'packages/core/src/model/pricing.ts',
    find: '    } else if (!(Math.abs(seedValue - pageValue) <= 1e-9)) {',
    replace: '    } else if (Math.abs(seedValue - pageValue) > 1e-9) {',
    test: 'packages/core/src/model/pricing.test.ts',
  },
  {
    id: 'checkpoint-top-level-guard',
    doctrine:
      'a checkpoint whose top-level payload is not an object decodes to undefined, never a raw TypeError (RV1008): disarmed, JSON.parse of null passes the try/catch and parsed.v throws out of a function whose contract is never-throws',
    file: 'packages/core/src/journal/checkpoint.ts',
    find: "  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {",
    replace: '  if (false as boolean) {',
    test: 'packages/core/src/journal/checkpoint.test.ts',
  },
  {
    id: 'superseded-settle-rejection',
    doctrine:
      'a superseded segment rejects typed instead of resolving a green terminal (RV1009): with the historical swallow restored, a settle append bouncing off the fence resolves ok silently and the caller acts on an outcome no durable store records',
    file: 'packages/core/src/engine/engine.ts',
    find: '          } catch (settleErr) {\n            if (settleErr instanceof LeaseHeldError) {\n              supersededBy = settleErr;\n            } else {',
    replace:
      '          } catch (settleErr) {\n            if (settleErr instanceof LeaseHeldError) {\n              /* historical swallow */\n            } else {',
    test: 'packages/core/src/engine/settlement.test.ts',
  },
  {
    id: 'superseded-terminal-reason',
    doctrine:
      'the superseded terminal names its DISTINCT reason on run:end (RV1009): with the reason dropped, an event-only consumer cannot tell a superseded segment from a settlement write failure and the resume hint becomes wrong advice',
    file: 'packages/core/src/engine/engine.ts',
    find: "            : supersededBy !== undefined\n              ? { settled: false as const, settledReason: 'superseded' as const }\n              : {}),",
    replace:
      '            : supersededBy !== undefined\n              ? { settled: false as const }\n              : {}),',
    test: 'packages/core/src/engine/settlement.test.ts',
  },
  {
    id: 'fault-kit-superseded-drive',
    doctrine:
      'the superseded scenario actually DRIVES a fencing rejection (RV1009): with the bounce downgraded to a plain error, the run takes the SettlementError path, the expected SupersededError and superseded reason never appear, and the scenario must report matched false',
    file: 'packages/evals/src/fault-injection.ts',
    find: "      return Promise.reject(new LeaseHeldError('stale fencing epoch: a successor holds the lease'));\n    }\n    return super.append(runId, entry);",
    replace:
      "      return Promise.reject(new Error('stale fencing epoch: a successor holds the lease'));\n    }\n    return super.append(runId, entry);",
    test: 'packages/evals/src/fault-injection.test.ts',
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
    // scripts/ doctrine lives outside the vitest projects: its tests
    // run under the same node:test runner the docs-lint CI job uses.
    const result = mutation.test.endsWith('.test.mjs')
      ? run('node', ['--test', mutation.test])
      : run('npx', ['vitest', 'run', mutation.test]);
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
