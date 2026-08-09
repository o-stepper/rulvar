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
    find: "  if (probe.test('')) {\n    throw new ConfigError(\n      `evidencePreservedValidator pattern must not be able to match the empty string `",
    replace:
      '  if (false) {\n    throw new ConfigError(\n      `evidencePreservedValidator pattern must not be able to match the empty string `',
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
    find: '    return settleSnapshot === undefined\n      ? currentPriceUsd\n      : settleSnapshot.composedPriceUsd(currentPriceUsd);',
    replace: '    return settleSnapshot?.priceUsd ?? currentPriceUsd;',
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
    find: '      this.settleExposureRelease(amount);\n    };',
    replace: '      void amount;\n    };',
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
    find: '      usd += priceEntryBilling(entry, priceUsd).usd;',
    replace: '      usd += priceUsd(entry.servedBy, entry.usage) ?? 0;',
    test: 'packages/core/src/journal/replayer.test.ts',
  },
  {
    id: 'parallel-fanout-partial',
    doctrine:
      'a mid-loop admission refusal in parallel_agents returns the started handles as a typed result: a throw loses the wave while the children keep spending (RV805)',
    file: 'packages/core/src/orchestrator/spawn-tools.ts',
    find: '        } catch (thrown) {\n          const failure = {',
    replace: '        } catch (thrown) {\n          throw thrown;\n          const failure = {',
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
    file: 'packages/core/src/engine/reconcile-statement.ts',
    find: '    covered = matched;\n    matchedRows = matched.length;',
    replace: '    covered = billable;\n    matchedRows = matched.length;',
    test: 'packages/core/src/engine/reconcile-statement.test.ts',
  },
  {
    id: 'headline-aggregate-refusal',
    doctrine:
      'a statement with no rows (a headline total) is refused typed: eventually consistent dashboard aggregates are not reconciliation evidence (RV812, the 4.45-vs-7.30 lesson)',
    file: 'packages/core/src/engine/reconcile-statement.ts',
    find: '  if (statement.rows.length === 0) {',
    replace: '  if (false) {',
    test: 'packages/core/src/engine/reconcile-statement.test.ts',
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
      'the EVIDENCE INDEX extracts citations ONLY from the accepted roster (RV808b, RV1403): an indexed citation from a failed child is one the validators would reject as fabricated',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "                const eligible =\n                  acceptedRoster === undefined\n                    ? settled.status === 'ok'\n                    : acceptedRoster.has(record.nodeId);",
    replace: '                const eligible = true;',
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
    file: 'packages/core/src/engine/reconcile-statement.ts',
    find: '  if (!Number.isFinite(value)) {\n    throw new ConfigError(\n      `statement reconciliation refused: ${where} carries ${field} ${String(value)}, which ` +',
    replace:
      '  if (false) {\n    throw new ConfigError(\n      `statement reconciliation refused: ${where} carries ${field} ${String(value)}, which ` +',
    test: 'packages/core/src/engine/reconcile-statement.test.ts',
  },
  {
    id: 'reconcile-token-verdict',
    doctrine:
      'provider-reported token disagreements decide the verdict by default (RV903): with the branch disarmed, an export describing different requests than the wire served still reads match whenever its dollars happen to agree',
    file: 'packages/core/src/engine/reconcile-statement.ts',
    find: "  const tokensDivergent = tokenComparison === 'verdict' && tokenMismatches > 0;",
    replace:
      "  const tokensDivergent = false && tokenComparison === 'verdict' && tokenMismatches > 0;",
    test: 'packages/core/src/engine/reconcile-statement.test.ts',
  },
  {
    id: 'count-admission-floor',
    doctrine:
      'the pre-egress admission feasibility check runs against the real reserve floor (RV904): collapsed to zero, a spawn the budget could never admit sends the full child prompt to the provider count endpoint before the refusal',
    file: 'packages/core/src/engine/ctx.ts',
    find: '        internals.budget.refuseSpawnIfInfeasible(\n          floorHeadroomUsd === undefined\n            ? floorReserveUsd\n            : Math.min(floorReserveUsd, floorHeadroomUsd),\n          budgetAccount,\n        );',
    replace: '        internals.budget.refuseSpawnIfInfeasible(0, budgetAccount);',
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
    find: '              : wireCount !== undefined\n                ? { requests: wireCount }\n                : undefined;',
    replace: '              : undefined;',
    test: 'packages/core/src/engine/wire-units.test.ts',
  },
  {
    id: 'wire-join-all-or-nothing',
    doctrine:
      'a multi-wire dispatch joins its statement segments all-or-nothing (RV905): joined on any subset, a partially delivered export compares a fragment against the whole dispatch and manufactures divergence out of incomplete delivery',
    file: 'packages/core/src/engine/reconcile-statement.ts',
    find: '      if (rowIds.length === 0 || hits.length !== rowIds.length) {',
    replace: '      if (rowIds.length === 0 || hits.length === 0) {',
    test: 'packages/core/src/engine/reconcile-statement.test.ts',
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
    file: 'packages/core/src/engine/reconcile-statement.ts',
    find: '        if (\n          row.usd !== undefined &&\n          componentsSeen > 0 &&',
    replace:
      '        if (\n          (false as boolean) &&\n          row.usd !== undefined &&\n          componentsSeen > 0 &&',
    test: 'packages/core/src/engine/reconcile-statement.test.ts',
  },
  {
    id: 'statement-totals-unsuppressed',
    doctrine:
      'presence of a component split no longer suppresses the totals comparison (RV1005): with the historical guard restored, a total drifting 5 USD beside agreeing components reads verdict match and the one comparison that can see the drift never runs',
    file: 'packages/core/src/engine/reconcile-statement.ts',
    find: '  const totalsDivergent =\n    totalsComparable && totalsDelta !== undefined && Math.abs(totalsDelta) > totalToleranceUsd;',
    replace:
      '  const totalsDivergent =\n    statementComponents === undefined &&\n    totalsComparable && totalsDelta !== undefined && Math.abs(totalsDelta) > totalToleranceUsd;',
    test: 'packages/core/src/engine/reconcile-statement.test.ts',
  },
  {
    id: 'statement-settleable-predicate',
    doctrine:
      'settleable is the full settlement-grade composite (RV1006): with the usage-unknown condition dropped, a match over a ledger still holding unattributed money reads settleable true and the predicate stops naming exactly the money a match cannot vouch for',
    file: 'packages/core/src/engine/reconcile-statement.ts',
    find: "    settleable:\n      verdict === 'match' &&\n      coverageComplete &&\n      usageUnknownRows === 0 &&\n      unpricedModels.size === 0,",
    replace:
      "    settleable:\n      verdict === 'match' &&\n      coverageComplete &&\n      unpricedModels.size === 0,",
    test: 'packages/core/src/engine/reconcile-statement.test.ts',
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
  {
    id: 'import-ref-namespace',
    doctrine:
      'every bundle blob ref must live in the bundle runId namespace (RV1010): disarmed, a crafted bundle for run A imports a ref into run B and overwrites another run blobs through the import surface',
    file: 'packages/core/src/engine/engine.ts',
    find: "      if (typeof ref !== 'string' || !ref.startsWith(`${runId}/`)) {",
    replace: '      if (false as boolean) {',
    test: 'packages/core/src/engine/data-protection.test.ts',
  },
  {
    id: 'import-entry-validation',
    doctrine:
      'every imported entry passes the journal codec shape validation before the first write (RV1010): disarmed, a bundle carrying garbage entries appends them and bricks the run it claims to restore',
    file: 'packages/core/src/engine/engine.ts',
    find: '      const issues = validateEntryShape(entry);',
    replace: '      const issues = [] as ReturnType<typeof validateEntryShape>;',
    test: 'packages/core/src/engine/data-protection.test.ts',
  },
  {
    id: 'import-rollback',
    doctrine:
      'a failed import rolls back its partial writes so the retry stays open (RV1010): with the journal rollback dropped, a mid-import failure leaves entries behind and the exists-refusal bricks every retry',
    file: 'packages/core/src/engine/engine.ts',
    find: '        await journal.delete(runId);',
    replace: '        void runId;',
    test: 'packages/core/src/engine/data-protection.test.ts',
  },
  {
    id: 'spawn-profiles-allowlist',
    doctrine:
      'opts.profiles is an enforced allowlist at dispatch (RV1011): disarmed, a spawn naming a registered-but-hidden profile by a guessed name proceeds to admission and widens the vocabulary the host limited',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        if (opts?.profiles !== undefined && !Object.hasOwn(advertisedProfiles, params.agentType)) {',
    replace: '        if (false as boolean) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'runid-mask-intake',
    doctrine:
      'a secret-shaped runId refuses typed at intake under an active masking policy (RV1012): disarmed, the id rides every event envelope unmasked and the host masking policy is bypassed by the correlation key itself',
    file: 'packages/core/src/engine/engine.ts',
    find: '    if (maskEvents) {',
    replace: '    if (false as boolean && maskEvents) {',
    test: 'packages/core/src/engine/config-validation.test.ts',
  },
  {
    id: 'segment-prewire-admission',
    build: '@rulvar/core',
    doctrine:
      'under quota.reserveContinuations each provider-side continuation is admitted BEFORE its egress (RV1013): disarmed, the hard mode silently degrades to post-hoc accounting and the over-cap wire leaves anyway',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '          if (quota.reserveContinuations !== true) {\n            return streamTurn(target.adapter, req, meteredOptionsFor(target));\n          }',
    replace:
      '          if (true as boolean || quota.reserveContinuations !== true) {\n            return streamTurn(target.adapter, req, meteredOptionsFor(target));\n          }',
    test: 'packages/anthropic/src/pause-turn-usage.test.ts',
  },
  {
    id: 'segment-main-no-double-count',
    build: '@rulvar/core',
    doctrine:
      'the main settlement never re-adds individually admitted segments (RV1013): with the granted count ignored, one absorbed dispatch counts its continuations twice and the window overstates the true wire count',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '            options.quota.reserveContinuations === true\n              ? wireCount !== undefined && wireCount - granted > 1\n                ? { requests: wireCount - granted }\n                : undefined',
    replace:
      '            options.quota.reserveContinuations === true\n              ? wireCount !== undefined && wireCount > 1\n                ? { requests: wireCount }\n                : undefined',
    test: 'packages/anthropic/src/pause-turn-usage.test.ts',
  },
  {
    id: 'segment-release-unused',
    doctrine:
      'a granted admission whose wire never left releases back to the window (RV1013): with the flown count inflated to cover every grant, unused admissions stay consumed and the window overstates capacity forever',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '            const flown = wireCount === undefined ? granted : wireCount - 1;',
    replace: '            const flown = segmentReservations.length;',
    test: 'packages/core/src/engine/quota-segments.test.ts',
  },
  {
    id: 'invariant-finish-gate',
    build: '@rulvar/core',
    doctrine:
      'the midstream<=finish confirmation fires only when a finish claim exists (RV1013): ungated, an error-terminal absorption manufactures a violation that shadows the real wire error, exactly the class of kill RV1003 removed',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '      if (sawFinish === true && reportedCount > safeCount) {',
    replace: '      if (reportedCount > safeCount) {',
    test: 'packages/anthropic/src/pause-turn-usage.test.ts',
  },
  {
    id: 'limiter-release-return',
    doctrine:
      'memoryQuotaLimiter.release returns exactly what admission consumed (RV1013): a no-op release leaves the cancelled request in the window and the next legitimate admission is denied capacity that was never used',
    file: 'packages/core/src/model/quota.ts',
    find: '          bucket.requests = Math.max(0, bucket.requests - reservation.requests);',
    replace: '          bucket.requests = Math.max(0, bucket.requests);',
    test: 'packages/core/src/model/quota.test.ts',
  },
  {
    id: 'kit-empty-only-refusal',
    doctrine:
      'runFaultInjection refuses an empty only selection typed (RV1014): disarmed, a gate that runs zero scenarios reports allMatched true, vacuous success from a suite that verified nothing',
    file: 'packages/evals/src/fault-injection.ts',
    find: '  if (options?.only !== undefined && options.only.length === 0) {',
    replace: '  if (false as boolean) {',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'audit-rv1007-arcs',
    doctrine:
      'the audit scenario actually DRIVES the RV1007 branches (RV1014): with the page-only tier arc collapsed to tiers on both sides, the finding never appears and the scenario must report matched false',
    file: 'packages/evals/src/fault-injection.ts',
    find: '    const tierGap = compareRates(withPremium, { ...withPremium, tiers: [tier] });',
    replace:
      '    const tierGap = compareRates({ ...withPremium, tiers: [tier] }, { ...withPremium, tiers: [tier] });',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'meter-marginal-pricing',
    doctrine:
      'the per-call meter prices the ACCUMULATION, never the slice alone (RV1101): priced per slice, a long-context tier crossed by the call sum that no single slice reached debits the cheap reading and the live ledger disagrees with the settled fold again',
    file: 'packages/core/src/engine/budget.ts',
    find: '      const total = this.debitableUsd(servedBy, accumulated);',
    replace: '      const total = pricedUsd + this.debitableUsd(servedBy, safe);',
    test: 'packages/core/src/engine/tier-live-parity.test.ts',
  },
  {
    id: 'meter-no-credit',
    doctrine:
      'a marginal debit never credits (RV1101): without the clamp, a price function that shrinks as usage grows subtracts money from spentUsd and the budget stops being monotone',
    file: 'packages/core/src/engine/budget.ts',
    find: '      const marginal = Math.max(0, total - pricedUsd);',
    replace: '      const marginal = total - pricedUsd;',
    test: 'packages/core/src/engine/tier-live-parity.test.ts',
  },
  {
    id: 'meter-remainder-route',
    doctrine:
      'the settle remainder debits through the SAME meter as the mid-stream deltas (RV1101): routed to the per-slice inlet instead, a crossing completed by the finish prices the remainder as a fresh slice and the two money paths disagree on the output premium',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '      if (meter !== undefined) {\n        meter(remainder);\n      } else {\n        options.budget?.onUsage(remainder, ref);\n      }',
    replace: '      options.budget?.onUsage(remainder, ref);',
    test: 'packages/core/src/engine/tier-live-parity.test.ts',
  },
  {
    id: 'meter-dispatch-wiring',
    doctrine:
      'the dispatch chokepoint opens one meter per provider call (RV1101): never opened, every site keeps the historical per-slice callback and the tier crossing under-debits live exactly as before the fix',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '          callMeter = options.budget?.openCallMeter?.(dispatched.resolved.ref);',
    replace: '          callMeter = undefined;',
    test: 'packages/core/src/engine/tier-live-parity.test.ts',
  },
  {
    id: 'ctx-meter-scope',
    doctrine:
      'the engine budget hooks expose the per-call meter with the account scope bound (RV1101): dropped from the wrapper, the loop falls back to per-slice debits and the live parity the docs call proven silently narrows to linear pricing',
    file: 'packages/core/src/engine/ctx.ts',
    find: '        openCallMeter: (servedBy) => internals.budget.openCallMeter(servedBy, budgetAccount),',
    replace: '',
    test: 'packages/core/src/engine/tier-live-parity.test.ts',
  },
  {
    id: 'kit-tier-parity-drive',
    doctrine:
      'the tier parity scenario actually DRIVES a crossing (RV1102): with the tier dropped from the fixture row both readings collapse to $3.00, the expected $5.75 and the marginal ladder never appear, and the scenario must report matched false',
    file: 'packages/evals/src/fault-injection.ts',
    find: '      tiers: [{ aboveInputTokens: 200_000, inputMultiplier: 2, outputMultiplier: 1.5 }],',
    replace: '',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'kit-tier-slices-drive',
    doctrine:
      'the tier parity scenario drives the crossing through MID-STREAM slices (RV1102): with the slices dropped the whole call arrives as one finish remainder, the $1.50 and $5.00 ladder readings never appear, and a scenario that stopped driving the live path must report matched false',
    file: 'packages/evals/src/fault-injection.ts',
    find: '  usageSlices: [\n    { inputTokens: 150_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },\n    { inputTokens: 100_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },\n  ],',
    replace: '',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'sqlite-release-return',
    doctrine:
      'a release returns EXACTLY what admission consumed to the window (RV1103): returning nothing, the cancelled reservation keeps its slot consumed and a hard RPM cap starves on admissions that never flew',
    file: 'packages/store-sqlite/src/quota.ts',
    find: '          giveBack.run(row.requests, row.estimate_tokens, key, windowStart);',
    replace: '          giveBack.run(0, 0, key, windowStart);',
    test: 'packages/store-sqlite/src/quota.test.ts',
  },
  {
    id: 'sqlite-release-tombstone',
    doctrine:
      'a released reservation row is deleted so the id settles NOTHING afterwards (RV1103): left in place, a late reconcile over the released id re-adds actual usage the window already gave back and the cap double-counts',
    file: 'packages/store-sqlite/src/quota.ts',
    find: "      this.db.prepare('DELETE FROM quota_reservations WHERE id = ?').run(reservationId);\n      if (row.window_start === windowStart) {\n        const giveBack = this.db.prepare(",
    replace:
      '      if (row.window_start === windowStart) {\n        const giveBack = this.db.prepare(',
    test: 'packages/store-sqlite/src/quota.test.ts',
  },
  {
    id: 'sqlite-release-migration-default',
    doctrine:
      'the legacy-schema migration defaults the requests column to the ONE request every engine admission reserves (RV1103): defaulted to zero, a pre-release reservation releases its tokens but keeps the request consumed and the window under-returns',
    file: 'packages/store-sqlite/src/quota.ts',
    find: "          'ALTER TABLE quota_reservations ADD COLUMN requests INTEGER NOT NULL DEFAULT 1',",
    replace:
      "          'ALTER TABLE quota_reservations ADD COLUMN requests INTEGER NOT NULL DEFAULT 0',",
    test: 'packages/store-sqlite/src/quota.test.ts',
  },
  {
    id: 'envelope-settlement-verdict',
    doctrine:
      'the terminal envelope is assembled AFTER the settlement verdict (RV1105): assembled settled-true always, a superseded or unsettled terminal reads green inside the one shape every consumer trusts',
    file: 'packages/core/src/engine/engine.ts',
    find: "        ...(settlementFailure !== undefined\n          ? { settlement: {} }\n          : supersededBy !== undefined\n            ? { settlement: { settledReason: 'superseded' as const } }\n            : {}),",
    replace: '',
    test: 'packages/core/src/engine/terminal-envelope.test.ts',
  },
  {
    id: 'envelope-event-mirror',
    doctrine:
      'run:end carries the SAME envelope object the outcome resolves with (RV1105): dropped from the event, an event-only consumer is back to assembling terminal facts from surface-specific fields',
    file: 'packages/core/src/engine/engine.ts',
    find: '          envelope,\n        },\n        rootSpanId,\n      );\n      bus.end();',
    replace: '        },\n        rootSpanId,\n      );\n      bus.end();',
    test: 'packages/core/src/engine/terminal-envelope.test.ts',
  },
  {
    id: 'envelope-error-passthrough',
    doctrine:
      'the envelope carries the typed error exactly (RV1105): dropped, an error terminal reads status error with no error inside the one shape that promised every fact',
    file: 'packages/core/src/engine/terminal-envelope.ts',
    find: '    envelope.error = detachedError(outcome.error);\n',
    replace: '',
    test: 'packages/core/src/engine/terminal-envelope.test.ts',
  },
  {
    id: 'envelope-detached-split',
    doctrine:
      'the per-model split is DETACHED from the cost report (RV1105): shared by reference, a consumer mutating the envelope rewrites the settled cost report behind every other reader',
    file: 'packages/core/src/engine/terminal-envelope.ts',
    find: '    costByModel: { ...outcome.cost.byModel },',
    replace: '    costByModel: outcome.cost.byModel,',
    test: 'packages/core/src/engine/terminal-envelope.test.ts',
  },
  {
    id: 'otel-envelope-mirror',
    doctrine:
      'the run span mirrors the envelope money and agent facts (RV1105): dropped, the trace and the SDK outcome disagree about what the run cost',
    file: 'packages/cli/src/otel.ts',
    find: "        const envelope = event.envelope as typeof event.envelope | undefined;\n        if (runOpen !== undefined && envelope !== undefined) {\n          runOpen.span.setAttribute('rulvar.run.total_usd', envelope.totalUsd);\n          runOpen.span.setAttribute('rulvar.run.agents_spawned', envelope.agentsSpawned);\n        }",
    replace: '',
    test: 'packages/cli/src/otel.test.ts',
  },
  {
    id: 'server-envelope-surface',
    doctrine:
      'the HTTP run status carries the envelope verbatim (RV1105): dropped, the HTTP consumer is the one surface still assembling terminal facts by hand',
    file: 'packages/cli/src/server.ts',
    find: '        // The unified terminal envelope (RV1105): the same facts the\n        // SDK outcome resolves with, so an HTTP consumer assembles\n        // nothing from surface-specific fields.\n        envelope: outcome.envelope,',
    replace: '',
    test: 'packages/cli/src/server.test.ts',
  },
  {
    id: 'otel-terminal-export-total',
    doctrine:
      'toOtel exports EVERY terminal path (RV1106): with the rejection tolerance reverted, an unsettled terminal whose stream already carried the refusal fails the whole export instead of completing it',
    file: 'packages/cli/src/otel.ts',
    find: "  const settledOk = await run.result.then(\n    (outcome) => outcome.status === 'ok',\n    () => false,\n  );",
    replace: "  const settledOk = (await run.result).status === 'ok';",
    test: 'packages/cli/src/envelope-conformance.test.ts',
  },
  {
    id: 'otel-refusal-reason',
    doctrine:
      'the run span names WHICH refusal ended it (RV1009/RV1106): with the superseded arm collapsed into the outage message, a fenced-out segment and a settlement write fault become indistinguishable on the trace',
    file: 'packages/cli/src/otel.ts',
    find: "          event.settled === false\n            ? event.settledReason === 'superseded'\n              ? 'superseded: a successor owns settlement; this stale terminal is withheld'\n              : 'settlement failed: nothing durable records this terminal; resume re-settles'\n            : undefined,",
    replace:
      "          event.settled === false\n            ? 'settlement failed: nothing durable records this terminal; resume re-settles'\n            : undefined,",
    test: 'packages/cli/src/envelope-conformance.test.ts',
  },
  {
    id: 'envelope-agents-ledger',
    doctrine:
      'the envelope agent counter is the budget ledger of admissions (RV1105/RV1106): hardcoded to zero, every surface agrees on a number no admission ever produced and the conformance table must catch the lie',
    file: 'packages/core/src/engine/engine.ts',
    find: '        agentsSpawned: budget.spent().agentsSpawned,',
    replace: '        agentsSpawned: 0,',
    test: 'packages/cli/src/envelope-conformance.test.ts',
    build: '@rulvar/core',
  },
  {
    id: 'runend-sibling-status',
    doctrine:
      'the run:end sibling status is the computed status, never an optimistic literal (RV1106): forced green, the event disagrees with the envelope it carries and the sibling coherence pins must go red',
    file: 'packages/core/src/engine/engine.ts',
    find: "          type: 'run:end',\n          status,",
    replace: "          type: 'run:end',\n          status: 'ok' as const,",
    test: 'packages/cli/src/envelope-conformance.test.ts',
    build: '@rulvar/core',
  },
  {
    id: 'approval-deadline-thread',
    doctrine:
      'the opt-in approval deadline is journaled ON the suspension entry (RV1107): with the threading dropped, no entry carries a deadline, no timer ever arms, and the approval silently reverts to the indefinite wait the host opted out of',
    file: 'packages/core/src/engine/external.ts',
    find: '        ...(options.deadlineAt === undefined ? {} : { deadlineAt: options.deadlineAt }),\n',
    replace: '',
    test: 'packages/core/src/engine/approval-deadline.test.ts',
  },
  {
    id: 'approval-timeout-failopen',
    doctrine:
      'the approval deadline fails CLOSED (RV1107): flipped to allow, an unattended approval quietly authorizes the tool at the deadline, the exact inversion of what a deadline on an approval means',
    file: 'packages/core/src/engine/external.ts',
    find: "              value: {\n                decision: 'deny',\n                reason: `the approval deadline ${entry.deadlineAt ?? ''} crossed; denied by timeout`,\n              },",
    replace:
      "              value: {\n                decision: 'allow',\n                reason: `the approval deadline ${entry.deadlineAt ?? ''} crossed; denied by timeout`,\n              },",
    test: 'packages/core/src/engine/approval-deadline.test.ts',
  },
  {
    id: 'approval-timer-rearm',
    doctrine:
      'the deadline timer arms FROM THE ENTRY, live and re-parked alike (RV1107): with the arming block dropped, the journaled deadline never fires in any process and the suspension waits forever despite the opt-in',
    file: 'packages/core/src/engine/external.ts',
    find: "      if (entry.deadlineAt !== undefined) {\n        // requireParsableDeadline validated the parse before parking.\n        const dueAt = Date.parse(entry.deadlineAt);\n        waiter.timer = setLongTimeout(\n          () => {\n            void this.submitResolution(entry.seq, {\n              by: 'timeout',\n              value: {\n                decision: 'deny',\n                reason: `the approval deadline ${entry.deadlineAt ?? ''} crossed; denied by timeout`,\n              },\n            }).catch(() => undefined);\n          },\n          dueAt,\n          this.now,\n        );\n      }\n",
    replace: '',
    test: 'packages/core/src/engine/approval-deadline.test.ts',
  },
  {
    id: 'approval-deadline-merge',
    doctrine:
      'the profile deadline overrides the engine default, most specific wins (RV1107): with the merge inverted, a profile that tightened its approvals to seconds silently waits on the engine-wide deadline instead',
    file: 'packages/core/src/runtime/permission-chain.ts',
    find: '  const approvalDeadlineMs = profile?.approvalDeadlineMs ?? engine?.approvalDeadlineMs;',
    replace:
      '  const approvalDeadlineMs = engine?.approvalDeadlineMs ?? profile?.approvalDeadlineMs;',
    test: 'packages/core/src/engine/approval-deadline.test.ts',
  },
  {
    id: 'approval-detached-flavor',
    doctrine:
      "the detached resolver validates by the suspension's FLAVOR, never by the deadline's presence (RV1203): with the deadline ternary resurrected, every timed tool approval detached-rejects the plain ApprovalDecision as an escalation decision and the parked approval is unresolvable until its deny-by-timeout (the sixteenth experiment, judge repro R2)",
    file: 'packages/core/src/engine/external.ts',
    find: "  const value = entry.value as { toolName?: unknown; flavor?: unknown } | null | undefined;\n  if (value?.flavor === 'approval') {\n    return 'approval';\n  }\n  return entry.deadlineAt !== undefined && value?.toolName === 'escalate' ? 'decision' : 'approval';\n",
    replace: "  return entry.deadlineAt !== undefined ? 'decision' : 'approval';\n",
    test: 'packages/core/src/engine/approval-deadline.test.ts',
  },
  {
    id: 'approval-flavor-marker',
    doctrine:
      "every new suspension names its own flavor in the payload (RV1203): with the approval marker dropped, a timed approval on a tool literally named 'escalate' falls to the legacy classification and detached-rejects the ApprovalDecision it must take",
    file: 'packages/core/src/engine/external.ts',
    find: "        flavor: 'approval',\n",
    replace: '',
    test: 'packages/core/src/engine/approval-deadline.test.ts',
  },
  {
    id: 'deadline-ceiling',
    doctrine:
      "a deadline interval over the ceiling cannot journal as a valid absolute date (RV1204): with the ceiling check disabled, Number.MAX_SAFE_INTEGER compiles and the run dies at the Date conversion with a generic 'Invalid time value' instead of the typed refusal",
    file: 'packages/core/src/l0/validate-numbers.ts',
    find: '  if (value > MAX_DEADLINE_MS) {',
    replace: '  if (false) {',
    test: 'packages/core/src/engine/approval-deadline.test.ts',
  },
  {
    id: 'escalation-deadline-ceiling',
    doctrine:
      'the flavor B escalation deadlineMs shares the deadline ceiling (RV1204): with the site validation dropped, an over-range escalation deadline passes intake and dies generic at the ISO conversion instead of refusing typed before any call',
    file: 'packages/core/src/engine/ctx.ts',
    find: "        requireDeadlineMs(escalation.deadlineMs, 'escalation.deadlineMs');",
    replace: '',
    test: 'packages/core/src/engine/approval-deadline.test.ts',
  },
  {
    id: 'deadline-corruption-swallow',
    doctrine:
      'a journaled deadline that does not parse is corruption and refuses typed before parking (RV1204): with the guard disabled, the mangled byte reaches Date.parse as NaN and the suspension resolves immediately, a silent deny for an approval and a silent default decision for an escalation',
    file: 'packages/core/src/engine/external.ts',
    find: '    if (entry.deadlineAt !== undefined && Number.isNaN(Date.parse(entry.deadlineAt))) {',
    replace: '    if (false) {',
    test: 'packages/core/src/engine/approval-deadline.test.ts',
  },
  {
    id: 'deadline-shape-parse',
    doctrine:
      'the journal shape gate refuses a deadline that does not parse where the bundle enters (RV1204): with the rule dropped, importRun accepts a mangled deadlineAt and the corruption is discovered only when a resumed process tries to arm the timer',
    file: 'packages/core/src/journal/kinds.ts',
    find: '  if (entry.deadlineAt !== undefined && Number.isNaN(Date.parse(entry.deadlineAt))) {\n    // A deadline that does not parse can never fire correctly: the\n    // shape gate refuses it where the bundle enters (importRun) instead\n    // of letting the corrupt byte reach a timer (RV1204).\n    issues.push(issue(`deadlineAt ${JSON.stringify(entry.deadlineAt)} does not parse as a date`));\n  }\n',
    replace: '',
    test: 'packages/core/src/engine/approval-deadline.test.ts',
  },
  {
    id: 'statement-empty-usage',
    doctrine:
      "an affirmatively declared usage object with zero token counts is not settlement evidence (RV1201): with the rule disabled, `usage: {}` reads verdict match with complete coverage and settleable true on the object's mere presence, the sixteenth experiment's judge repro R1",
    file: 'packages/core/src/engine/reconcile-statement.ts',
    find: '        if (usageSeen === 0) {',
    replace: '        if (false) {',
    test: 'packages/core/src/engine/reconcile-statement.test.ts',
  },
  {
    id: 'statement-empty-components',
    doctrine:
      'an affirmatively declared componentsUsd split with zero figures is not settlement evidence (RV1201): with the rule disabled, `componentsUsd: {}` counts as a dollar claim while claiming nothing and the statement settles over it',
    file: 'packages/core/src/engine/reconcile-statement.ts',
    find: '        if (componentsSeen === 0) {',
    replace: '        if (false) {',
    test: 'packages/core/src/engine/reconcile-statement.test.ts',
  },
  {
    id: 'profile-filter-prototype',
    doctrine:
      'the advertised profile set is built from OWN registry properties (RV1205): with the bare index read restored, an allowlist naming a prototype member copies Object.prototype into the advertised vocabulary and the knowledge card offers it as a spawnable agentType',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '    if (Object.hasOwn(registered, name) && registered[name] !== undefined) {',
    replace: '    if (registered[name] !== undefined) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'agenttype-prototype',
    doctrine:
      "ctx.agent resolves agentType against OWN profile properties (RV1205): with the bare index read restored, agentType 'toString' resolves a function as its profile and the run dies on an unrelated error instead of the typed unknown-agentType refusal",
    file: 'packages/core/src/engine/ctx.ts',
    find: '        registry !== undefined && Object.hasOwn(registry, opts.agentType)',
    replace: '        registry !== undefined && registry[opts.agentType] !== undefined',
    test: 'packages/core/src/engine/ctx.test.ts',
  },
  {
    id: 'preflight-profile-prototype',
    doctrine:
      'preflight resolves a spawn spec profile against OWN properties (RV1205): with the bare index read restored, a spec naming a prototype member reads as a RESOLVED profile and the unknown-profile finding never fires, so the estimate silently plans a spawn that cannot run',
    file: 'packages/core/src/engine/preflight.ts',
    find: '      !Object.hasOwn(defaults.profiles, spec.profile)',
    replace: '      defaults.profiles[spec.profile] === undefined',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'evidence-floor-binding',
    doctrine:
      "acceptance.requireEvidenceFloor makes a declared evidence floor binding (RV1207): with the check disabled, a child below its declared floor is promoted by a salvage arm exactly as before and an 'all-ok' run reports ok over an unmet contract (the sixteenth experiment: 10 of 14 entries, waived, completion partial)",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        return requireFloor && evidence !== undefined && !evidence.met;',
    replace: '        return false;',
    test: 'packages/core/src/orchestrator/salvage.test.ts',
  },
  {
    id: 'evidence-deficit-reserve',
    doctrine:
      'the finalization window reserve covers the outstanding evidence deficit under the opt-in (RV1208): with the widening dropped, the window keeps its fixed tail, the loop searches until the deficit is unclosable, and the child settles below its floor exactly as the sixteenth experiment recorded',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '    return deficit === 0\n      ? finalizationWindow.reserveCalls\n      : Math.max(finalizationWindow.reserveCalls, deficit + 1);',
    replace: '    return finalizationWindow.reserveCalls;',
    test: 'packages/core/src/runtime/finalization-window.test.ts',
  },
  {
    id: 'import-runid-guard',
    doctrine:
      "importRun applies the one safe runId guard at its boundary (RV1206): with the guard dropped, a bundle claiming '..', a slashed path, or an over-length id reaches the stores raw, while engine.run and resume refuse the same id typed",
    file: 'packages/core/src/engine/engine.ts',
    find: "    assertSafeRunId(runId, 'importRun');\n",
    replace: '',
    test: 'packages/core/src/engine/data-protection.test.ts',
  },
  {
    id: 'persisted-terminal-settle-authority',
    doctrine:
      'the persisted terminal reads the JOURNALED settle, not the meta projection (RV1209): fall back to the meta status and a fenced-out segment that settled nothing durable reports a terminal it never had, which is the exact honesty the superseded row exists to pin',
    file: 'packages/core/src/engine/persisted-terminal.ts',
    find: "  const settle = lastRunSettle(input.entries);\n  if (settle === undefined) {\n    return refuse('unsettled');\n  }",
    replace:
      "  const settle = lastRunSettle(input.entries) ?? { runStatus: input.meta?.status ?? 'ok' };",
    test: 'packages/core/src/engine/persisted-terminal.test.ts',
  },
  {
    id: 'persisted-terminal-provenance',
    doctrine:
      'a journal-rebuilt envelope declares that it was rebuilt (RV1209): unmarked, its absent completion and error read as facts the run reported, so a restart silently converts "not recorded" into "the workflow claimed nothing" and "the run did not fail"',
    file: 'packages/core/src/engine/persisted-terminal.ts',
    find: "    provenance: 'journal',\n",
    replace: '',
    test: 'packages/core/src/engine/persisted-terminal.test.ts',
  },
  {
    id: 'wire-record-reported-count',
    doctrine:
      'the provider call record carries the REPORTED wire count, never the id count (RV1210): derived from the ids, an absorption whose segments the provider left unnamed understates its own cardinality, and the invoice then contradicts the quota window that settled on the same count',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '            record.wireRequests = wireCountReported;',
    replace: '            record.wireRequests = wireIds?.length ?? wireCountReported;',
    test: 'packages/core/src/engine/wire-units.test.ts',
  },
  {
    id: 'invoice-cardinality-wires',
    doctrine:
      'the invoice cardinality counts the requests the provider billed (RV1210): counted off the recorded ids instead, the declaration understates by exactly the unnamed segments and a host reconciling row count against statement lines is handed a mismatch dressed as agreement',
    file: 'packages/core/src/engine/invoice.ts',
    find: '    const wires = row.wireRequests ?? 1;',
    replace: '    const wires = row.wireResponseIds?.length ?? 1;',
    test: 'packages/core/src/engine/wire-units.test.ts',
  },
  {
    id: 'quota-abort-after-reserve',
    doctrine:
      'an abort landing inside the awaited quota reservation stops the wire (RV1210): without the recheck, a limiter that queues holds the call past the abort and the wire leaves anyway, so an aborted run pays for a call it was already told not to make',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '          const abandoned = await abortedAfterReserve(quota, decision.reservationId);\n          if (abandoned !== undefined) {\n            return abandoned;\n          }\n',
    replace: '',
    test: 'packages/core/src/engine/quota-segments.test.ts',
  },
  {
    id: 'segment-release-fail-closed',
    doctrine:
      'an unreported wire count releases NOTHING (RV1210): read as one flown wire, every granted continuation returns to the window, handing a hook-granting adapter that names no count back exactly the capacity RV1013 admitted before its wires left',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '            const flown = wireCount === undefined ? granted : wireCount - 1;',
    replace: '            const flown = (wireCount ?? 1) - 1;',
    test: 'packages/core/src/engine/quota-segments.test.ts',
  },
  {
    id: 'envelope-error-detached',
    doctrine:
      'the terminal envelope detaches the typed error it carries (RV1213): aliased, a consumer annotating the envelope reaches into the outcome the engine still owns, exactly the aliasing costByModel was detached to prevent',
    file: 'packages/core/src/engine/terminal-envelope.ts',
    find: '    envelope.error = detachedError(outcome.error);',
    replace: '    envelope.error = outcome.error;',
    test: 'packages/core/src/engine/terminal-envelope.test.ts',
  },
  {
    id: 'postfanin-model-only',
    doctrine:
      'the post-fan-in model bucket reports thinking time with the nested tool executions removed (RV1211): left as raw activation wall, the tail reads as pure model time and the tool share is counted twice over',
    file: 'packages/core/src/l0/telemetry-reduce.ts',
    find: '      coordinationModelOnlyMs: modelOnlyMs,',
    replace: '      coordinationModelOnlyMs: lengthOf(modelClipped),',
    test: 'packages/core/src/orchestrator/synthesis.test.ts',
  },
  {
    id: 'postfanin-model-by-phase',
    doctrine:
      'the post-fan-in model bucket splits by the activation role that spent it (RV1211): collapsed to nothing, a tail spent compacting is indistinguishable from a tail spent drafting, which is exactly what the sixteenth experiment could not tell',
    file: 'packages/core/src/l0/telemetry-reduce.ts',
    find: '      byPhase[interval.phase] = (byPhase[interval.phase] ?? 0) + (clipped.to - clipped.from);',
    replace: '',
    test: 'packages/core/src/orchestrator/critical-path-breakdown.test.ts',
  },
  {
    id: 'postfanin-tool-calls',
    doctrine:
      'the post-fan-in window counts tool EXECUTIONS beside their milliseconds (RV1211): dropped, one slow pagination and twenty fast ones read as the same tail',
    file: 'packages/core/src/l0/telemetry-reduce.ts',
    find: '      callsByName[interval.name] = (callsByName[interval.name] ?? 0) + 1;',
    replace: '',
    test: 'packages/core/src/orchestrator/critical-path-breakdown.test.ts',
  },
  {
    id: 'evidence-grade-sentence-scope',
    doctrine:
      'an evidence-grade claim must cite its artifact in its OWN sentence (RV1212): widened to the whole answer, one run id anywhere in the text licenses every live-observed claim in it, which is the shape the sixteenth run shipped',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: "          new RegExp(artifactPattern, '').test(sentence) ||",
    replace: "          new RegExp(artifactPattern, '').test(input.text) ||",
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'cited-value-window-forward',
    doctrine:
      'the cited-value window only ever reaches FORWARD from the cited line (RV1212): walked backwards too, a citation is satisfied by a value it points past, and the judge repro (an interface line credited with a default nine lines below it) passes in reverse',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '            const source = options.resolve({ path: citation.path, line: citation.line + offset });',
    replace:
      '            const source = options.resolve({ path: citation.path, line: citation.line - offset });',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'cited-value-unresolved',
    doctrine:
      'a citation nothing resolves is a failure, not a pass (RV1212): tolerated, a fabricated file:line satisfies the value check by being unverifiable, which inverts the whole contract',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '            reasons.push(`citation ${where} resolves to no source line`);\n            continue;',
    replace: '            continue;',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'contradiction-cross-child',
    doctrine:
      'a pool contradiction needs two DIFFERENT children (RV1301): counted within one child too, an author narrating "it was 3, it is now 5" reads as a pool dispute, and the pass floods the very window it was built to shorten',
    file: 'packages/core/src/orchestrator/contradictions.ts',
    find: '      if (left.length > 1 || right.length > 1 || left[0] !== right[0]) {',
    replace: '      if (true) {',
    test: 'packages/core/src/orchestrator/contradictions.test.ts',
  },
  {
    id: 'contradiction-shared-key',
    doctrine:
      'two readings conflict only under the SAME key (RV1301): grouped by anchor alone, `attempts: 3` and `backoffMs: 100` on one line are reported as a dispute, which is two aspects of a line, not a disagreement about it',
    file: 'packages/core/src/orchestrator/contradictions.ts',
    find: '        const key = collapse(keyed[1]);',
    replace: "        const key = '';",
    test: 'packages/core/src/orchestrator/contradictions.test.ts',
  },
  {
    id: 'contradiction-output-bound',
    doctrine:
      'the fold is bounded by max (RV1301): unbounded, a pool that disputes everything puts an unbounded list into the synthesis prompt and the terminal envelope, which is the post-fan-in tail this pass exists to protect',
    file: 'packages/core/src/orchestrator/contradictions.ts',
    find: '      if (found.length === max) {\n        return found;\n      }',
    replace: '',
    test: 'packages/core/src/orchestrator/contradictions.test.ts',
  },
  {
    id: 'contradiction-empty-pattern',
    doctrine:
      'an anchor pattern that can match the empty string is refused fail closed (RV1301): admitted, every inline span becomes an anchor and the pass floods instead of arming, the RV610 posture',
    file: 'packages/core/src/orchestrator/contradictions.ts',
    find: "  if (new RegExp(pattern, '').test('')) {",
    replace: '  if (false) {',
    test: 'packages/core/src/orchestrator/contradictions.test.ts',
  },
  {
    id: 'contradiction-evidence-pool',
    doctrine:
      "the pass judges the ACCEPTED roster only (RV1302, RV1403): widened to every settled child, a dead child's error text disputes a real finding, and a run fails on a claim nothing accepted",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "        const accepted =\n          acceptedRoster === undefined\n            ? settled.status === 'ok'\n            : acceptedRoster.has(record.nodeId);",
    replace: '        const accepted = true;',
    test: 'packages/core/src/orchestrator/contradiction-pass.test.ts',
  },
  {
    id: 'contradiction-fail-posture',
    doctrine:
      "the 'fail' posture actually fails the run BEFORE the synthesis dispatch (RV1302): degraded to a report, a self-contradicting pool pays for the invocation that composes the disagreement away and settles ok",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "      if (onFound !== 'fail' || contradictionsFound.length === 0) {\n        return;\n      }",
    replace: '      return;',
    test: 'packages/core/src/orchestrator/contradiction-pass.test.ts',
  },
  {
    id: 'contradiction-carry-line',
    doctrine:
      "the 'carry' posture actually names the findings in the synthesis prompt (RV1302): dropped, the composing model is asked to resolve a disagreement it was never told about, which is exactly the blind re-derivation carryDraftGaps was built to end",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "        ...(opts?.contradictions?.onFound !== 'carry' ||",
    replace: '        ...(true ||',
    test: 'packages/core/src/orchestrator/contradiction-pass.test.ts',
  },
  {
    id: 'contradiction-empty-is-a-fact',
    doctrine:
      'an EMPTY findings list rides the envelope (RV1302): dropped as if absent, "the pass ran and the pool agreed" becomes indistinguishable from "nothing looked", which is exactly the absence doctrine RV1209 pinned',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      ...(contradictionsFound === undefined\n        ? {}\n        : {\n            contradictions: contradictionsFound,\n            contradictionsMeta: contradictionsMeta as unknown as Json,\n          }),',
    replace:
      '      ...(contradictionsFound === undefined || contradictionsFound.length === 0\n        ? {}\n        : {\n            contradictions: contradictionsFound,\n            contradictionsMeta: contradictionsMeta as unknown as Json,\n          }),',
    test: 'packages/core/src/orchestrator/contradiction-pass.test.ts',
  },
  {
    id: 'contradiction-accepted-partial',
    doctrine:
      'a structured partial the acceptance policy counted is IN the pool (RV1403): dropped from the roster, the seventeenth run judges five of six accepted children again and a rival partial can never dispute anything',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      for (const node of acceptedSalvage.partial) {\n        roster.add(node);\n      }',
    replace: '      for (const node of acceptedSalvage.partial) {\n        void node;\n      }',
    test: 'packages/core/src/orchestrator/contradiction-pass.test.ts',
  },
  {
    id: 'contradiction-floor-blocked-out',
    doctrine:
      'a floor-blocked child stays OUT of the pool (RV1403): let back in, a reading the acceptance policy refused to count disputes the accepted pool, which is a promotion RV1207 exists to forbid',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        if (!accepted) {\n          continue;\n        }',
    replace:
      "        if (!accepted && settled.status !== 'limit') {\n          continue;\n        }",
    test: 'packages/core/src/orchestrator/contradiction-pass.test.ts',
  },
  {
    id: 'contradiction-carry-locks-skip',
    doctrine:
      "non-empty findings under 'carry' disable the valid-draft skip (RV1404): skipped anyway, the carry promise silently no-ops because nothing was ever asked to resolve the dispute",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "          const carryBlocked =\n            opts?.contradictions?.onFound === 'carry' &&\n            contradictionsFound !== undefined &&\n            contradictionsFound.length > 0;",
    replace:
      "          const carryBlocked =\n            opts?.contradictions?.onFound === 'carry' &&\n            contradictionsFound !== undefined &&\n            contradictionsFound.length > 9999;",
    test: 'packages/core/src/orchestrator/contradiction-pass.test.ts',
  },
  {
    id: 'contradiction-truncated-marker',
    doctrine:
      'the truncation the max bound applies is NAMED (RV1404): silenced, a capped findings list is indistinguishable from a complete one and the bound quietly hides the remainder',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      const truncated = found.length > limit;',
    replace: '      const truncated = false;',
    test: 'packages/core/src/orchestrator/contradiction-pass.test.ts',
  },
  {
    id: 'salvage-prediction-floor',
    doctrine:
      'the salvage prediction respects the binding floor (RV1403): ignored, a below-floor child the arms will never count is marked salvageable and its text enters the validators cited evidence pool',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      if (\n        opts?.acceptance?.requireEvidenceFloor === true &&\n        settled.evidence !== undefined &&\n        !settled.evidence.met\n      ) {',
    replace:
      '      if (\n        opts?.acceptance?.requireEvidenceFloor === true &&\n        settled.evidence !== undefined &&\n        !settled.evidence.met &&\n        false\n      ) {',
    test: 'packages/core/src/orchestrator/salvage-output.test.ts',
  },
  {
    id: 'salvage-prediction-partial',
    doctrine:
      'the partial arm is predicted like the output arm (RV1403): dropped, an accepted partial child is never marked and an orchestrator quoting the partial the policy accepted reads as fabricating citations',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "      if (opts?.acceptance?.acceptPartialChildren === true && settled.partial !== undefined) {\n        return 'partial';\n      }",
    replace:
      '      if (opts?.acceptance?.acceptPartialChildren === true && settled.partial !== undefined) {\n        return undefined;\n      }',
    test: 'packages/core/src/orchestrator/salvage.test.ts',
  },
  {
    id: 'salvageable-partial-pool',
    doctrine:
      "evidencePreservedValidator pools a marked salvageablePartial child (RV1403): unpooled, the accepted partial's citations stay unknown and requireKnown flags an honest quote as fabricated",
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: "        if (\n          child.status !== 'ok' &&\n          child.salvageableOutput !== true &&\n          child.salvageablePartial !== true\n        ) {",
    replace: "        if (child.status !== 'ok' && child.salvageableOutput !== true) {",
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'citation-targets-unresolved',
    doctrine:
      'a citation the resolver does not know is REFUSED (RV1401): waved through, a fabricated location like ghost.ts:12 counts as provenance again and licenses the valid-draft skip',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '        if (options.resolve({ path: parsed[1], line }) === undefined) {\n          unresolved.push(match);\n        }',
    replace:
      '        if (options.resolve({ path: parsed[1], line }) === undefined) {\n          void match;\n        }',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'citation-targets-line-floor',
    doctrine:
      'a line below 1 is refused BEFORE the resolver runs (RV1401): source lines are 1-based, and a sloppy resolver might well answer ghost.ts:0 with a string',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '        if (line < 1) {\n          belowOne.push(match);\n          continue;\n        }',
    replace:
      '        if (line < 0) {\n          belowOne.push(match);\n          continue;\n        }',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'citation-targets-unparsable-skip',
    doctrine:
      'a pattern match that does not parse as path:line with a safe line is refused, never skipped (RV1401): skipped, a custom-pattern citation nothing can resolve sails through as provenance',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '        if (parsed === null || !Number.isSafeInteger(line)) {\n          unparsable.push(match);\n          continue;\n        }',
    replace:
      '        if (parsed === null || !Number.isSafeInteger(line)) {\n          continue;\n        }',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'citation-targets-empty-pattern-intake',
    doctrine:
      'a pattern able to match the empty string is refused at intake (RV1401, the RV610 posture): admitted, an empty match can never name a source line and the validator either refuses every text or silently skips',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: "  if (probe.test('')) {\n    throw new ConfigError(\n      `citationTargetsValidator pattern must not be able to match the empty string `",
    replace:
      '  if (false) {\n    throw new ConfigError(\n      `citationTargetsValidator pattern must not be able to match the empty string `',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'cited-value-whole-token',
    doctrine:
      'an asserted value must sit in the cited line as a WHOLE token (RV1402): back on substring `includes`, a claim of `3` is satisfied by a line saying `30`, the seventeenth comparison judge repro',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '          const missing = values.filter((value) => !containsToken(haystack, value));',
    replace: '          const missing = values.filter((value) => !haystack.includes(value));',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'finalization-turns-dimension',
    doctrine:
      'remaining turns at or under reserveTurns enter the finalization window (RV1405): with the dimension dead, a turn-capped worker burns maxTurns mid-work with no finalize phase, the seventeenth experiment shape',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '      const remaining = Math.max(0, limits.maxTurns - turns);\n      if (\n        remaining <= finalizationTurns.reserveTurns &&',
    replace:
      '      const remaining = Math.max(0, limits.maxTurns - turns);\n      if (\n        false &&\n        remaining <= finalizationTurns.reserveTurns &&',
    test: 'packages/core/src/runtime/finalization-turns.test.ts',
  },
  {
    id: 'finalization-turns-own-reserve',
    doctrine:
      'the notice, the refusal, and the journal entry name the BINDING dimension its own reserve (RV1405): collapsed to the calls reserve, a turns entry reports arithmetic that never applied',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "  const reserveFor = (budget: FinalizationWindowBudget): number =>\n    budget === 'turns' ? (finalizationTurns?.reserveTurns ?? 0) : effectiveReserveCalls();",
    replace:
      '  const reserveFor = (budget: FinalizationWindowBudget): number =>\n    effectiveReserveCalls();',
    test: 'packages/core/src/runtime/finalization-turns.test.ts',
  },
  {
    id: 'finalization-turns-allow-fallback',
    doctrine:
      "the turns reserve's own allowlist governs when the window declares none (RV1405): dropped, a turns-only worker cannot record evidence inside its reserved tail and the posture walls off the bookkeeping it exists for",
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '    const allow = finalizationWindow?.allow ?? finalizationTurns?.allow;',
    replace: '    const allow = finalizationWindow?.allow;',
    test: 'packages/core/src/runtime/finalization-turns.test.ts',
  },
  {
    id: 'finalization-turns-presence',
    doctrine:
      'configuring the turns reserve alone makes the toolBudget snapshot present (RV1405): dropped, a turns-only run has no home for finalizationWindowEntered and the entered regime is invisible on the envelope',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '    extension !== undefined ||\n    finalizationTurns !== undefined\n  ) {',
    replace: '    extension !== undefined\n  ) {',
    test: 'packages/core/src/runtime/finalization-turns.test.ts',
  },
  {
    id: 'finalization-turns-resume',
    doctrine:
      'a segment restored inside the turns reserve re-arms silently (RV1405, the RV302 posture): with the live re-derivation dead, the resumed loop re-announces the notice the pre-kill segment already carried',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '    if (\n      windowActive() !== undefined ||\n      (windowConfigured && durableRestored?.finalizationWindowEntered === true)\n    ) {',
    replace:
      '    if (\n      (windowConfigured && durableRestored?.finalizationWindowEntered === true)\n    ) {',
    test: 'packages/core/src/runtime/finalization-turns.test.ts',
  },
  {
    id: 'finalization-turns-intake',
    doctrine:
      'a malformed reserveTurns is a typed ConfigError at intake (RV1405, the intake posture): waved through, a zero or fractional reserve reaches the loop arithmetic instead of failing before any journal entry',
    file: 'packages/core/src/runtime/usage-limits.ts',
    find: '    const { reserveTurns, allow } = reserve as { reserveTurns?: unknown; allow?: unknown };\n    requirePositiveInteger(reserveTurns as number, `${site}.finalizationTurns.reserveTurns`);',
    replace:
      '    const { reserveTurns, allow } = reserve as { reserveTurns?: unknown; allow?: unknown };\n    void reserveTurns;',
    test: 'packages/core/src/runtime/finalization-turns.test.ts',
  },
  {
    id: 'turns-bind-projection',
    doctrine:
      'preflight projects the turns axis per spawn (RV1406): silenced, maxTurns 28 against a 96-call ceiling is invisible before the paid run, exactly the seventeenth experiment hole',
    file: 'packages/core/src/engine/preflight.ts',
    find: '    if (\n      executedToolCallCeiling !== null &&\n      executedToolCallCeiling > 0 &&\n      limits.maxTurns < executedToolCallCeiling + 1\n    ) {',
    replace:
      '    if (\n      executedToolCallCeiling !== null &&\n      executedToolCallCeiling > 0 &&\n      limits.maxTurns < executedToolCallCeiling - 9999\n    ) {',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'turns-bind-severity',
    doctrine:
      'the turns projection WARNS while no turns reserve exists and is transparency once one does (RV1406): flattened to info, the silent mid-work limit reads as fine print',
    file: 'packages/core/src/engine/preflight.ts',
    find: "        severity: limits.finalizationTurns === undefined ? 'warning' : 'info',\n        code: 'turns-bind-before-tool-budget',",
    replace: "        severity: 'info',\n        code: 'turns-bind-before-tool-budget',",
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'finalization-turns-covers-boundary',
    doctrine:
      'a turns reserve EQUAL to maxTurns already governs from the very first turn (RV1405): relaxed to strictly-above, the boundary config ships silently postured for its whole life',
    file: 'packages/core/src/engine/preflight.ts',
    find: '      limits.finalizationTurns !== undefined &&\n      limits.finalizationTurns.reserveTurns >= limits.maxTurns\n    ) {',
    replace:
      '      limits.finalizationTurns !== undefined &&\n      limits.finalizationTurns.reserveTurns > limits.maxTurns\n    ) {',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'persisted-terminal-tail',
    doctrine:
      'a settle the journal ran PAST is a stale claim, not the terminal (RV1407): served anyway, a restarted reader holds yesterday envelope over a run a detached resolution already destined to continue, while auditRun derives non-terminal from the same bytes',
    file: 'packages/core/src/engine/persisted-terminal.ts',
    find: '  const tail = input.entries.filter((entry) => entry.seq > settle.seq).length;\n  if (tail > 0) {',
    replace:
      '  const tail = input.entries.filter((entry) => entry.seq > settle.seq).length;\n  if (tail > 9999) {',
    test: 'packages/core/src/engine/persisted-terminal.test.ts',
  },
  {
    id: 'detached-resolution-flavor',
    doctrine:
      'the detached validator classifies a kind-approval entry by its RV1203 flavor (RV1408): collapsed to the plain arm, a flavor B escalation is unresolvable offline and a wrong-shaped approval payload poisons the journal, the sixteenth experiment R2 shape at the exported surface',
    file: 'packages/core/src/engine/external.ts',
    find: "    target.kind === 'approval' ? detachedApprovalFlavor(target) : 'external',",
    replace: "    target.kind === 'approval' ? 'approval' : 'external',",
    test: 'packages/core/src/engine/detached-resolution.test.ts',
  },
  {
    id: 'detached-resolution-schema-arm',
    doctrine:
      'the pinned schema guards every resolution surface through the ONE shared arms implementation (RV1408): dropped there, a payload violating the suspension-time schema appends on every path at once',
    file: 'packages/core/src/engine/external.ts',
    find: '  if (schemaSpec !== undefined) {\n    const validation = await validateSchemaSpec(schemaSpec, value);',
    replace: '  if (false) {\n    const validation = await validateSchemaSpec(schemaSpec, value);',
    test: 'packages/core/src/engine/detached-resolution.test.ts',
  },
  {
    id: 'offline-resolve-engine-validator',
    doctrine:
      "the CLI offline append applies the ENGINE'S detached validation, not a lookalike (RV1408): skipped, a wrong-shaped payload lands in the journal and the escalation consumer meets it at resume",
    file: 'packages/cli/src/server.ts',
    find: '      await validateDetachedResolution(target, key, value);\n      const outcome: ResolutionOutcome = await replayer.resolveSuspended(target.seq, {',
    replace:
      '      void value;\n      const outcome: ResolutionOutcome = await replayer.resolveSuspended(target.seq, {',
    test: 'packages/cli/src/server.test.ts',
  },
  {
    id: 'checkpoint-counter-guard',
    doctrine:
      'the decoder refuses garbage restored counters instead of seeding limit arithmetic with them (RV1409): waved through, a negative turns credits the maxTurns ceiling with turns nobody paid and the dispatch resumes on numbers no boundary write produced',
    file: 'packages/core/src/journal/checkpoint.ts',
    find: '  if (\n    !countLike(parsed.turns) ||\n    !countLike(parsed.toolCallsUsed) ||\n    !countLike(parsed.schemaAttempts)\n  ) {\n    return undefined;\n  }',
    replace: '  if (false) {\n    return undefined;\n  }',
    test: 'packages/core/src/journal/checkpoint.test.ts',
  },
  {
    id: 'checkpoint-usage-guard',
    doctrine:
      'the decoder validates every required usage field of a restored checkpoint (RV1409): skipped, garbage token counts flow into the budget as paid spend instead of refusing the blob and rerunning from the top',
    file: 'packages/core/src/journal/checkpoint.ts',
    find: "  for (const field of ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens']) {\n    if (!countLike(usageRecord[field])) {\n      return undefined;\n    }\n  }",
    replace:
      '  for (const field of [] as string[]) {\n    if (!countLike(usageRecord[field])) {\n      return undefined;\n    }\n  }',
    test: 'packages/core/src/journal/checkpoint.test.ts',
  },
  {
    id: 'invoice-cardinality-single-wire',
    doctrine:
      'an id-less single-wire row is one wire request with no join key (RV1410): skipped, a fleet of single-wire dispatches with no recorded response ids reads as fully joined while every row-level verdict says missing-provider-id',
    file: 'packages/core/src/engine/invoice.ts',
    find: '    } else if (row.responseId === undefined && (row.wireResponseIds?.length ?? 0) === 0) {\n      cardinality.wireIdsMissing += 1;\n    }',
    replace:
      '    } else if (row.responseId === undefined && false) {\n      cardinality.wireIdsMissing += 1;\n    }',
    test: 'packages/core/src/engine/wire-units.test.ts',
  },
  {
    id: 'run-profile-own-property',
    doctrine:
      'the shipped preset lookup is own-property only (RV1411): a prototype lookup hands back inherited object names as if they were profiles, and the CLI silently accepts --profile toString instead of the typed unknown-profile refusal',
    file: 'packages/core/src/engine/run-profiles.ts',
    find: '  return Object.hasOwn(RUN_PROFILES, name) ? RUN_PROFILES[name] : undefined;',
    replace: '  return RUN_PROFILES[name];',
    test: 'packages/core/src/engine/run-profiles.test.ts',
  },
  {
    id: 'acceptance-ok-floor-visibility',
    doctrine:
      "an ok child below its DECLARED evidence floor is a degradation the headline must name (RV1412): skipped, completion claims 'complete' and degradedReasons stays empty over an unmet contract, the roster row alone whispering met: false",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '          const evidence = record.settled?.evidence;\n          if (evidence !== undefined && !evidence.met) {\n            belowFloorOk.push(record.nodeId);',
    replace:
      '          const evidence = record.settled?.evidence;\n          if (false && evidence !== undefined && !evidence.met) {\n            belowFloorOk.push(record.nodeId);',
    test: 'packages/core/src/orchestrator/salvage.test.ts',
  },
  {
    id: 'acceptance-ok-floor-gate',
    doctrine:
      "requireEvidenceFloor binds the declared floor for OK children exactly like the salvage arms (RV1412): with the gate arm dead, a below-floor ok child counts as a policy success, 'all-ok' accepts and minSuccessful counts it",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '            belowFloorOk.push(record.nodeId);\n            if (requireFloor) {\n              hardDegraded += 1;\n              okGatedBelowFloor += 1;',
    replace:
      '            belowFloorOk.push(record.nodeId);\n            if (requireFloor && false) {\n              hardDegraded += 1;\n              okGatedBelowFloor += 1;',
    test: 'packages/core/src/orchestrator/salvage.test.ts',
  },
  {
    id: 'accepted-pool-floor-exclusion',
    doctrine:
      'an ok child the policy refused to count must not steer what composes the result (RV1412, the RV1403 line): with the exclusion dead, its reading re-enters the contradiction pool and the synthesis evidence index of an accepted run',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      for (const node of acceptedSalvage.excludedOk) {\n        roster.delete(node);\n      }',
    replace: '      for (const node of [] as string[]) {\n        roster.delete(node);\n      }',
    test: 'packages/core/src/orchestrator/salvage.test.ts',
  },
  {
    id: 'cost-report-basis',
    doctrine:
      "the cost report declares its dollars locally estimated at the caller's table (RV1413): unstamped, a management estimate reads as an invoice figure, the seventeenth run's $4.79 defect",
    file: 'packages/core/src/engine/cost-report.ts',
    find: "    // The provenance marker (RV1413): both builders stamp the same\n    // literal, so a journal fold and a live accumulation report their\n    // dollars under the same declared basis.\n    basis: 'locally-estimated',",
    replace:
      "    // The provenance marker (RV1413): both builders stamp the same\n    // literal, so a journal fold and a live accumulation report their\n    // dollars under the same declared basis.\n    basis: 'locally-guessed' as never,",
    test: 'packages/core/src/engine/cost-report.test.ts',
  },
  {
    id: 'envelope-cost-basis',
    doctrine:
      'the terminal envelope carries the cost basis on every surface through its ONE producer (RV1413): unstamped there, the outcome, the event, the HTTP response, and the journal rebuild all serve dollars with no declared provenance',
    file: 'packages/core/src/engine/terminal-envelope.ts',
    find: "    costBasis: 'locally-estimated',",
    replace: "    costBasis: 'locally-guessed' as never,",
    test: 'packages/core/src/engine/terminal-envelope.test.ts',
  },
  {
    id: 'claim-pair-intersection',
    doctrine:
      'a claim pair requires INTERSECTING spans of the same file (RV1501): without the guard, a draft sentence pairs with every sentence citing the file anywhere, and the judge drowns in non-pairs',
    file: 'packages/core/src/orchestrator/consistency.ts',
    find: '        if (reading.end < anchor.start || reading.start > anchor.end) {\n          continue;\n        }',
    replace:
      '        if (false && (reading.end < anchor.start || reading.start > anchor.end)) {\n          continue;\n        }',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'claim-pair-agreement-drop',
    doctrine:
      'verbatim agreement is no pair (RV1501): a draft sentence containing the pool sentence restates it, and paying a judge to confirm a copy is the flood the caps exist to prevent',
    file: 'packages/core/src/orchestrator/consistency.ts',
    find: '        if (full.includes(reading.full) || reading.full.includes(full)) {\n          continue;\n        }',
    replace:
      '        if (false && (full.includes(reading.full) || reading.full.includes(full))) {\n          continue;\n        }',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'claim-judge-empty-pairs',
    doctrine:
      'no pairs means no judge dispatch (RV1502): the fold looked and paired nothing, and paying a model to confirm an empty list would bill every clean run for the pass',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      if (allPairs.length === 0) {',
    replace: '      if (false) {',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'claim-fail-before-synthesis',
    doctrine:
      "judged findings under 'fail' stop the run BEFORE any synthesis dispatch (RV1502): a draft contradicting its own pool never pays to have the inversion composed away",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "      if (onFound !== 'fail' || findings.length === 0) {\n        return;\n      }",
    replace: '      if (true) {\n        return;\n      }',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'claim-carry-skip-block',
    doctrine:
      "non-empty claim findings under 'carry' disable the valid-draft skip (RV1502, the RV1404 invariant): the draft was composed without the CLAIM CONTRADICTIONS line, so skipping the synthesis means nothing was ever asked to resolve the inversion",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "          const claimCarryBlocked =\n            opts?.claimConsistency?.onFound === 'carry' &&\n            claimFindingsFound !== undefined &&\n            claimFindingsFound.length > 0;",
    replace:
      "          const claimCarryBlocked =\n            opts?.claimConsistency?.onFound === 'carry' &&\n            claimFindingsFound !== undefined &&\n            claimFindingsFound.length > 9999;",
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'claim-judge-failure-honesty',
    doctrine:
      'a dead judge is named on the meta, never converted into agreement (RV1502): without the guard, a failed invocation reports an empty finding list, which claims the pool agreed when nothing was judged',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "      if (judged.status !== 'ok' || judged.output === null || judged.output === undefined) {",
    replace:
      "      if (false && (judged.status !== 'ok' || judged.output === null || judged.output === undefined)) {",
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'execution-facts-opt-in',
    doctrine:
      'execution facts appear ONLY under the executionFacts opt-in (RV1503): tool result bytes enter the window and the window is journal identity, so unauthorized facts change every historical byte',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '    const executionFactsEnabled = opts?.executionFacts === true;',
    replace: '    const executionFactsEnabled = true;',
    test: 'packages/core/src/orchestrator/runfacts.test.ts',
  },
  {
    id: 'exposure-cap-genesis-record',
    doctrine:
      'the in-flight exposure cap is recorded in RunMeta at genesis (RV1504): unrecorded, every resumed segment silently drops the bound the original invocation declared',
    file: 'packages/core/src/engine/engine.ts',
    find: '              ...(ceilingUsd === undefined ? {} : { budgetUsd: ceilingUsd }),\n              ...(exposureCapUsd === undefined ? {} : { maxInFlightExposureUsd: exposureCapUsd }),',
    replace: '              ...(ceilingUsd === undefined ? {} : { budgetUsd: ceilingUsd }),',
    test: 'packages/core/src/engine/in-flight-exposure.test.ts',
  },
  {
    id: 'exposure-cap-resume-restore',
    doctrine:
      'the recorded exposure cap travels back in on resume (RV1504): without the restore, the meta field is decoration and the resumed segment runs uncapped exactly as before the fix',
    file: 'packages/core/src/engine/engine.ts',
    find: "        ...(typeof meta?.maxInFlightExposureUsd === 'number'\n          ? { maxInFlightExposureUsd: meta.maxInFlightExposureUsd }\n          : {}),",
    replace: '        ...({}),',
    test: 'packages/core/src/engine/in-flight-exposure.test.ts',
  },
  {
    id: 'account-fold-inclusive',
    doctrine:
      "the per-account fold is INCLUSIVE up the admission tree (RV1505): without the parent walk, an orchestrator cap's audited spend omits every child it paid for",
    file: 'packages/core/src/engine/cost-report.ts',
    find: '      cursor = cursor === ROOT_ACCOUNT ? undefined : (parents.get(cursor) ?? ROOT_ACCOUNT);',
    replace: '      cursor = undefined;',
    test: 'packages/core/src/engine/cost-report.test.ts',
  },
  {
    id: 'flavorb-default-required',
    doctrine:
      "flavor B requires an explicit defaultDecision at intake (RV1506): without the refusal, the deadline's expiry applies an engine-invented accept and an unattended scope escalation resolves fail open",
    file: 'packages/core/src/engine/ctx.ts',
    find: "      if (escalation.flavor === 'B' && escalation.defaultDecision === undefined) {",
    replace: '      if (false && escalation.defaultDecision === undefined) {',
    test: 'packages/core/src/engine/ctx-escalation.test.ts',
  },
  {
    id: 'strict-approvals-hold',
    doctrine:
      'strictApprovals makes a generic allow fall through for needsApproval tools (RV1507): disarmed, one blanket canUseTool silently retires every declared approval requirement',
    file: 'packages/core/src/runtime/permission-chain.ts',
    find: '  const strictHold = chain.strictApprovals === true && def.needsApproval === true;',
    replace: '  const strictHold = false;',
    test: 'packages/core/src/runtime/permission-chain.test.ts',
  },
  {
    id: 'strict-approvals-monotonic-or',
    doctrine:
      'the strict flag merges as OR across layers (RV1507): under AND, a profile without the flag silently loosens an engine-armed safety posture',
    file: 'packages/core/src/runtime/permission-chain.ts',
    find: '  const strictApprovals = engine?.strictApprovals === true || profile?.strictApprovals === true;',
    replace:
      '  const strictApprovals = engine?.strictApprovals === true && profile?.strictApprovals === true;',
    test: 'packages/core/src/runtime/permission-chain.test.ts',
  },
  {
    id: 'pricing-gate-armed',
    doctrine:
      'the strict pricing gate binds when armed (RV1508): disarmed, an unpriced model keeps debiting nothing and every ceiling silently fails to bound it',
    file: 'packages/core/src/engine/budget.ts',
    find: '    const config = this.strictPricing;\n    if (config === undefined || this.pricedDispatchVetted.has(servedBy)) {\n      return;\n    }',
    replace: '    const config = this.strictPricing;\n    if (true) {\n      return;\n    }',
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'pricing-gate-chokepoint',
    doctrine:
      'the gate fires at the dispatch chokepoint BEFORE the wire call (RV1508): unwired there, the unit surface passes while every real dispatch sails through unpriced',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '          options.budget?.assertPricedDispatch?.(target.resolved.ref);',
    replace: '          void target.resolved.ref;',
    test: 'packages/core/src/engine/pricinggate.test.ts',
  },
  {
    id: 'pricing-gate-meta-record',
    doctrine:
      'the pricing posture is recorded in RunMeta at genesis (RV1508): unrecorded, a resumed segment silently drops the gate, the exposure-cap failure mode exactly',
    file: 'packages/core/src/engine/engine.ts',
    find: '              ...(strictPricing === undefined ? {} : { strictPricing }),',
    replace: '              ...({}),',
    test: 'packages/core/src/engine/pricinggate.test.ts',
  },
  {
    id: 'format-characters-category',
    doctrine:
      'the format-character lint scans the whole Cf category (RV1509): narrowed, an invisible byte beside a citation passes every check while the literal path stops resolving',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '      for (const match of input.text.matchAll(/\\p{Cf}/gu)) {',
    replace: '      for (const match of input.text.matchAll(/\\p{Cs}/gu)) {',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'quota-denial-dimension-split',
    doctrine:
      'pre-wire quota denials split by dimension (RV1510): conflated, a requests-window wait is indistinguishable from a token-window wait and both read as provider retries',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "          if (typeof denialReason === 'string' && denialReason.includes('requestsPerMinute')) {\n            quotaDenialsRequests += 1;\n          } else {\n            quotaDenialsTokens += 1;\n          }",
    replace: '          quotaDenialsTokens += 1;\n          void denialReason;',
    test: 'packages/core/src/engine/quota.test.ts',
  },
  {
    id: 'quota-denials-live-surface',
    doctrine:
      'the denial namespaces ride the result only when denials happened (RV1510): unconditionally present, every clean result grows a zero block and the absence doctrine breaks',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '  if (quotaDenials > 0) {',
    replace: '  if (false) {',
    test: 'packages/core/src/engine/quota.test.ts',
  },
  {
    id: 'import-closure-strict',
    doctrine:
      'requireClosure refuses an unresolved ref BEFORE any write (RV1511): disarmed, a torn bundle imports whole and the missing transcript surfaces only when something later reads it',
    file: 'packages/core/src/engine/engine.ts',
    find: '    if (options?.requireClosure === true && unresolvedRefs.length > 0) {',
    replace: '    if (false) {',
    test: 'packages/core/src/engine/data-protection.test.ts',
  },
  {
    id: 'import-duplicate-blob-ref',
    doctrine:
      'a duplicate blob ref refuses always (RV1511): last-write-wins over transcript bytes is a torn or edited bundle, never a valid export',
    file: 'packages/core/src/engine/engine.ts',
    find: '      if (availableRefs.has(ref)) {',
    replace: '      if (false) {',
    test: 'packages/core/src/engine/data-protection.test.ts',
  },
  {
    id: 'jsonl-verify-only-load',
    doctrine:
      'repairOnLoad: false serves the salvage WITHOUT rewriting the file (RV1512): forced on, an audit read destroys the evidence of the very tear it found',
    file: 'packages/core/src/stores/jsonl.ts',
    find: '          if (this.repairOnLoad) {\n            this.repairTornTail(runId, entries);\n          }',
    replace: '          this.repairTornTail(runId, entries);',
    test: 'packages/core/src/stores/jsonl.test.ts',
  },
  {
    id: 'rerun-recovered-dispatch',
    doctrine:
      'a rerun of a journaled invocation re-admits as recovered (RV1505): forced through fresh projected admission, the seeded spend of its own prior attempt refuses the continuation of paid work at a tight ceiling',
    file: 'packages/core/src/engine/ctx.ts',
    find: '    if (journaledRerun) {',
    replace: '    if (false) {',
    test: 'packages/core/src/engine/accountseed.test.ts',
  },
  {
    id: 'rerun-floor-gate-scope',
    doctrine:
      'the pre-count feasibility floor gates NEW work only (RV1505): forced onto journaled reruns, the seeded spend of its own prior attempt fails the floor before the count and the recovered admission is never reached',
    file: 'packages/core/src/engine/ctx.ts',
    find: '      if (!journaledRerun) {',
    replace: '      if (true) {',
    test: 'packages/core/src/engine/accountseed.test.ts',
  },
  {
    id: 'budget-account-seed',
    doctrine:
      'a re-opened sub-account resumes from its journaled inclusive spend (RV1505): reset to zero, a resumed child silently overspends the very allowance its admission verdict recorded',
    file: 'packages/core/src/engine/budget.ts',
    find: "      spentUsd: options.kind === 'orchestrator-cap' ? 0 : (this.seededAccountSpend.get(scope) ?? 0),",
    replace: '      spentUsd: 0,',
    test: 'packages/core/src/engine/accountseed.test.ts',
  },
  {
    id: 'orchestrator-cap-seed-exemption',
    doctrine:
      'the orchestrator cap re-arms per segment (RV1505): seeded like an ordinary account, the documented resume after a budget-cancelled root refuses the very recovery it exists for',
    file: 'packages/core/src/engine/budget.ts',
    find: "      spentUsd: options.kind === 'orchestrator-cap' ? 0 : (this.seededAccountSpend.get(scope) ?? 0),",
    replace: '      spentUsd: this.seededAccountSpend.get(scope) ?? 0,',
    test: 'packages/core/src/orchestrator/resume-orchestrate.test.ts',
  },
  {
    id: 'engine-account-seed',
    doctrine:
      'the engine wires the per-account rows of the settled fold into every resume (RV1505): dropped, sub-account history is per-process amnesia exactly as before the fix',
    file: 'packages/core/src/engine/engine.ts',
    find: '        accounts: accountSpendFromJournal(replayer.snapshot(), priorPriceUsd),',
    replace: '',
    test: 'packages/core/src/engine/accountseed.test.ts',
  },
  {
    id: 'entries-window-collection',
    doctrine:
      'the loop collects the recorded evidence entry content from the same window as the counter (RV1501 entries plumbing): collapsed, the terminal carries nothing and no claim pool can pair against what the child recorded',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '  const collectedEvidence = collectRecordedEvidence(messages);',
    replace: '  const collectedEvidence = [];',
    test: 'packages/core/src/orchestrator/evidenceentries.test.ts',
  },
  {
    id: 'entries-terminal-value',
    doctrine:
      'the recorded entry content rides the agent terminal (RV1501 entries plumbing): dropped, replay has nothing to restore and a resumed pool silently loses what the child recorded',
    file: 'packages/core/src/engine/ctx.ts',
    find: `    if (result.evidenceEntries !== undefined) {
      terminalPatch.evidenceEntries = [...result.evidenceEntries];
    }`,
    replace: '',
    test: 'packages/core/src/orchestrator/evidenceentries.test.ts',
  },
  {
    id: 'entries-replay-restore',
    doctrine:
      'replay restores the recorded entry content verbatim (RV1501 entries plumbing): dropped, a resumed orchestrate pairs a poorer pool than the live run it replays',
    file: 'packages/core/src/engine/ctx.ts',
    find: `      if (terminal?.evidenceEntries !== undefined) {
        result.evidenceEntries = terminal.evidenceEntries;
      }`,
    replace: '',
    test: 'packages/core/src/orchestrator/evidenceentries.test.ts',
  },
  {
    id: 'entries-pool-source',
    doctrine:
      'the claim pool reads a second source per accepted child from its recorded entries (RV1501 entries plumbing): dropped, a draft contradicting the recorded reading pairs nothing when the composed output paraphrased it away, the benchmark inversion shape',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        const recorded = settled.evidenceEntries ?? [];',
    replace: '        const recorded = [];',
    test: 'packages/core/src/orchestrator/evidenceentries.test.ts',
  },
  {
    id: 'settle-records-lift',
    doctrine:
      'the run settle records the semantic completion lift beside its output digest (the persisted-terminal tail): dropped, an offline reader can never recover the completion the live consumer saw and the persisted envelope silently reverts to the pre-lift amnesia',
    file: 'packages/core/src/engine/engine.ts',
    find: '                ...(lifted === undefined ? {} : lifted),',
    replace: '',
    test: 'packages/core/src/engine/persisted-terminal.test.ts',
  },
  {
    id: 'persisted-reads-lift',
    doctrine:
      'the persisted terminal reads the recorded completion back from the settle (the persisted-terminal tail): dropped, the journal records the claim and the rebuilt envelope still withholds it',
    file: 'packages/core/src/engine/persisted-terminal.ts',
    find: '      ...(settle.completion === undefined ? {} : { completion: settle.completion }),',
    replace: '',
    test: 'packages/core/src/engine/persisted-terminal.test.ts',
  },
  {
    id: 'server-events-capability',
    doctrine:
      'the status body answers the SSE capability machine-readably (the P1 tail): events are process-local, and a non-live status claiming events support sends every client into an empty stream it was promised would carry telemetry',
    file: 'packages/cli/src/server.ts',
    find: '      capabilities: { events: false },',
    replace: '      capabilities: { events: true },',
    test: 'packages/cli/src/server.test.ts',
  },
  {
    id: 'attestation-spawn-binding',
    doctrine:
      "an attested profile's spawn is HELD to the pin at the resolveToolset seam (RV1514): dropping the enforcement call lets a drifted (poisoned) toolset reach the model under a new content key, which is exactly the silent re-key the attestation exists to refuse",
    file: 'packages/core/src/engine/ctx.ts',
    find: '      enforceToolsetAttestation(agentType, profile.toolsetAttestation, toolset);',
    replace: '      void toolset;',
    test: 'packages/core/src/tools/attestation.test.ts',
  },
  {
    id: 'attestation-hash-comparison',
    doctrine:
      'the attestation refuses on the AGGREGATE hash comparison itself (RV1514): inverting it to always-match turns the pin into decoration and every drifted toolset spawns cleanly',
    file: 'packages/core/src/tools/toolset-hash.ts',
    find: '  if (resolved.hash === attestation.hash) {',
    replace: '  if (true) {',
    test: 'packages/core/src/tools/attestation.test.ts',
  },
  {
    id: 'attestation-diff-naming',
    doctrine:
      'a drift refusal NAMES the changed tool with both contract hashes (RV1514): a bare name hides which side moved, and the operator cannot correct a stale pin from the refusal',
    file: 'packages/core/src/tools/toolset-hash.ts',
    find: '        changed.push(`${name} (attested ${hash}, resolved ${now})`);',
    replace: '        changed.push(name);',
    test: 'packages/core/src/tools/attestation.test.ts',
  },
  {
    id: 'mcp-list-sweep-cap',
    doctrine:
      'maxTools bounds the tools/list sweep ITSELF, pre-filter (RV1515): neutering the page check lets a hostile server stream pages forever, and an allow list is powerless because filtering happens after the sweep',
    file: 'packages/core/src/tools/mcp.ts',
    find: '      if (cfg.maxTools !== undefined && tools.length > cfg.maxTools) {',
    replace: '      if (false) {',
    test: 'packages/core/src/tools/mcp-bounds.test.ts',
  },
  {
    id: 'mcp-schema-byte-cap',
    doctrine:
      "maxSchemaBytes refuses an admitted tool's oversized schema typed (RV1515): neutering the comparison ships the schema bomb into the toolset snapshot and every prompt that renders it",
    file: 'packages/core/src/tools/mcp.ts',
    find: '    if (bytes > cfg.maxSchemaBytes) {',
    replace: '    if (false) {',
    test: 'packages/core/src/tools/mcp-bounds.test.ts',
  },
  {
    id: 'mcp-call-timeout',
    doctrine:
      "callMs rides the SDK request timeout per tools/call (RV1515): dropping the passthrough leaves a hanging tool on the SDK's 60s default, which burns the finalization window before the model ever sees the error",
    file: 'packages/core/src/tools/mcp.ts',
    find: '          cfg.timeouts?.callMs === undefined ? undefined : { timeout: cfg.timeouts.callMs },',
    replace: '          undefined,',
    test: 'packages/core/src/tools/mcp-bounds.test.ts',
  },
  {
    id: 'mcp-connect-timeout',
    doctrine:
      'connectMs races the transport handshake and releases the client on expiry (RV1515): dropping the race leaves a silent server holding the handshake (and a stdio child) for the SDK default instead of the declared bound',
    file: 'packages/core/src/tools/mcp.ts',
    find: '          await Promise.race([attach(), expired]);',
    replace: '          await attach();',
    test: 'packages/core/src/tools/mcp-bounds.test.ts',
  },
  {
    id: 'mcp-auth-refresh',
    doctrine:
      'the http.headers hook is consulted per REQUEST before send (RV1516): freezing it to an empty record strips authentication from the wire and kills the rotation contract that makes token refresh reconnect-free',
    file: 'packages/core/src/tools/mcp.ts',
    find: "    const extra = typeof headersOption === 'function' ? await headersOption() : headersOption;",
    replace: '    const extra = {};',
    test: 'packages/core/src/tools/mcp-posture.test.ts',
  },
  {
    id: 'mcp-drift-refuse',
    doctrine:
      "drift 'refuse' poisons the source on a listChanged (RV1516): dropping the poison write turns fail-closed into silent re-keying, and a swapped tool list imports on the next spawn as if the host had approved it",
    file: 'packages/core/src/tools/mcp.ts',
    find: '        poisoned = true;',
    replace: '        poisoned = poisoned;',
    test: 'packages/core/src/tools/mcp-posture.test.ts',
  },
  {
    id: 'attestation-shape-validation',
    doctrine:
      'a malformed attestation is refused typed at createEngine (RV1514): skipping the hash shape check lets a truncated or uppercased pin ride into every spawn and refuse each one with a mismatch that no re-recording can satisfy',
    file: 'packages/core/src/tools/toolset-hash.ts',
    find: "  if (typeof attestation.hash !== 'string' || !SHA256_HEX_PATTERN.test(attestation.hash)) {",
    replace: '  if (false) {',
    test: 'packages/core/src/tools/attestation.test.ts',
  },
  {
    id: 'retry-namespace-transport-gate',
    doctrine:
      'a pre-wire quota denial never increments transportRetries (RV1601): dropping the gate re-exports denials as agent:end retryCount, the exact conflation the eighteenth comparison benchmark caught against an invoice with zero provider error rows',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '            if (outcome.quotaDenied !== true) {\n              // A denial stays in the quotaDenials namespace alone:\n              // retryCount reads clean against the provider ledger.\n              transportRetries += 1;\n            }',
    replace: '            transportRetries += 1;',
    test: 'packages/core/src/engine/quota.test.ts',
  },
  {
    id: 'retry-namespace-attempt-ordinal',
    doctrine:
      'a denied turn advances the denial budget, never `tries` (RV1601): reverting to the unconditional increment shifts ProviderCallRecord.attempt past 1 with no attempt-1 sibling and lets a busy window exhaust the transport budget before the wire ever opens',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '        if (outcome.quotaDenied === true) {\n          denialTurns += 1;\n        } else {\n          tries += 1;\n        }',
    replace:
      '        tries += 1;\n        if (outcome.quotaDenied === true) {\n          denialTurns += 1;\n        }',
    test: 'packages/core/src/engine/quota.test.ts',
  },
  {
    id: 'mcp-cursor-echo-cycle',
    doctrine:
      'a page answering the cursor it was queried with makes no pagination progress (RV1602): dropping the unconditional refusal lets a protocol violating server feed the sweep its whole echo series, every wire call comfortably inside listMs, and only the test fixture page net keeps this mutant from spinning forever',
    file: 'packages/core/src/tools/mcp.ts',
    find: "      if (page.nextCursor !== undefined && page.nextCursor !== '' && page.nextCursor === cursor) {",
    replace: '      if (false) {',
    test: 'packages/core/src/tools/mcp-bounds.test.ts',
  },
  {
    id: 'mcp-max-pages-bound',
    doctrine:
      "maxPages caps the sweep's wire call count fail closed (RV1602): an off-by-one admits one page past the declared cap and the reservation count stops matching the declaration",
    file: 'packages/core/src/tools/mcp.ts',
    find: '        pages >= cfg.maxPages &&',
    replace: '        pages > cfg.maxPages &&',
    test: 'packages/core/src/tools/mcp-bounds.test.ts',
  },
  {
    id: 'retry-namespace-denial-bound',
    doctrine:
      'denied turns retry against their OWN maxDenials budget (RV1601): an off-by-one on the bound makes the loop tolerate one extra denial per target, and the reservation count stops matching the declared budget',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '          outcome.quotaDenied === true ? denialTurns < maxDenials : tries < retryPolicy.attempts;',
    replace:
      '          outcome.quotaDenied === true ? denialTurns <= maxDenials : tries < retryPolicy.attempts;',
    test: 'packages/core/src/engine/quota.test.ts',
  },
  {
    id: 'claim-critical-priority',
    doctrine:
      'critical pairs sort before the max cap applies (RV1603): dropping the partition sends the bounded judge budget back to draft order and the declared claims lose their precedence under truncation',
    file: 'packages/core/src/orchestrator/consistency.ts',
    find: '    critical === undefined\n      ? candidates\n      : [\n          ...candidates.filter((candidate) => candidate.critical),\n          ...candidates.filter((candidate) => !candidate.critical),\n        ];',
    replace: '    candidates;',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'claim-uncovered-critical-gate',
    doctrine:
      'the armed onUncoveredCritical posture fails BEFORE the judge dispatch (RV1603): disabling the gate pays for a partial verdict over a draft whose declared claims cannot even be paired for verification',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "        spec.onUncoveredCritical === 'fail' &&",
    replace: '        false &&',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'claim-runfacts-number-trigger',
    doctrine:
      "a standalone recorded value of two or more digits pairs a run claim with the fact sheet (RV1603): dropping the numeric trigger lets a benchmark grade falsehood like '18-20 evidence' sail past the judge unpaired",
    file: 'packages/core/src/orchestrator/consistency.ts',
    find: '      for (const match of full.matchAll(RUN_FACT_NUMBER)) {',
    replace: '      for (const match of [] as RegExpMatchArray[]) {',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'critical-path-judge-split',
    doctrine:
      'the synthesize wall splits by the claim judge label (RV1604): erasing the label check folds the judge wall back into finalCompositionMs and the benchmark misread of a slow composer returns',
    file: 'packages/core/src/l0/telemetry-reduce.ts',
    find: '          const judge = started.label === CLAIM_JUDGE_LABEL;',
    replace: '          const judge = false;',
    test: 'packages/core/src/orchestrator/synthesis.test.ts',
  },
  {
    id: 'spawn-spec-adoption',
    doctrine:
      'a regenerated spawn turn adopts a recovered decision by full canonical spec (RV1605): disabling the claim re-decides and re-pays every child of a checkpointless resume',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        const recoveredOrdinal = unclaimedRecoveredBySpec.get(specKey)?.shift();',
    replace: '        const recoveredOrdinal = undefined;',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'pilot-risk-deny',
    doctrine:
      'the pilot preset hard denies every risk class outside declared reads (RV1606): dropping the rule lets a smuggled write tool execute before any effect gate sees it',
    file: 'packages/core/src/engine/profile-templates.ts',
    find: "        deny: [{ risk: ['write', 'network', 'execute', 'destructive', 'undeclared'] }],",
    replace: '        deny: [],',
    test: 'packages/core/src/engine/pilot-profile.test.ts',
  },
  {
    id: 'pilot-attestation-pin',
    doctrine:
      'the pilot profile pins its resolved toolset by attestation (RV1606): dropping the pin lets a drifted registration import silently under the same profile name',
    file: 'packages/core/src/engine/profile-templates.ts',
    find: '      toolsetAttestation: attestation,\n',
    replace: '',
    test: 'packages/core/src/engine/pilot-profile.test.ts',
  },
  {
    id: 'progressive-prompt-nudge',
    doctrine:
      'the progressive drafting nudge rides the child result opt in (RV1607): dropping the conditional erases the pattern from the prompt and the benchmark sequential tail returns as the default posture',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      ...(opts?.exposeChildResultTools === true',
    replace: '      ...(false',
    test: 'packages/core/src/orchestrator/progressive-drafting.test.ts',
  },
  {
    id: 'decision-chain-authority-filter',
    doctrine:
      'the decision chain folds ONLY the authority-bearing kinds (RV1705): admitting work entries drowns the who-allowed-what record in agent and step noise, and an auditor reading the chain as authorizations would read paid work as permission',
    file: 'packages/core/src/l0/decision-chain.ts',
    find: '  if (!DECISION_CHAIN_KINDS.includes(entry.kind)) {',
    replace: '  if (false) {',
    test: 'packages/core/src/l0/decision-chain.test.ts',
  },
  {
    id: 'decision-chain-seq-order',
    doctrine:
      "the decision chain sorts by seq, the journal's own total order (RV1705): trusting input order lets a store that returns entries out of order present a resolution BEFORE the ask it closed, inverting the audit narrative",
    file: 'packages/core/src/l0/decision-chain.ts',
    find: '  return rows.sort((a, b) => a.seq - b.seq);',
    replace: '  return rows;',
    test: 'packages/core/src/l0/decision-chain.test.ts',
  },
  {
    id: 'quota-denied-event-namespace',
    doctrine:
      "recoverable quota waits speak their own event type (RV1810): folding them back into agent:error makes every healthy token-window wait read as a failing run to any consumer keyed on the type, the twentieth benchmark's 13-for-13 false alarm",
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '            if (outcome.quotaDenied === true) {\n              // The recoverable pre-wire wait speaks its own type',
    replace:
      '            if (false) {\n              // The recoverable pre-wire wait speaks its own type',
    test: 'packages/core/src/engine/quota.test.ts',
  },
  {
    id: 'coverage-ratio-floor',
    doctrine:
      'the declared coverage floor trips on the fold ratio (RV1809): disarming the comparison lets a run that verified half its declared minimum stamp no block, fail no gate, and read green under strict, the exact externalized arithmetic the floors exist to internalize',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '          const belowCoverage =\n            spec.minimumCoverageRatio !== undefined &&\n            fold.draftCitingSentences > 0 &&\n            coverageRatio < spec.minimumCoverageRatio;',
    replace: '          const belowCoverage = false;',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'corpus-modality-class',
    doctrine:
      "the modality-overclaim corpus case keeps forming its pair (RV1809): the nineteenth benchmark's recurring failure was a mitigation stated as an unconditional guarantee, and a corpus that stops pairing that shape green-washes the blindness it exists to detect",
    file: 'packages/evals/src/claim-corpus.ts',
    find: "      'unconditionally: a changed tool always refuses at spawn time ' +\n      '(packages/core/src/tools/toolset-hash.ts:85).',",
    replace: "      'unconditionally: a changed tool always refuses at spawn time.',",
    test: 'packages/evals/src/claim-corpus.test.ts',
  },
  {
    id: 'mcp-visited-cursor-cycle',
    doctrine:
      'the MCP sweep refuses any cursor it already queried with (RV1808): the echo guard sees only the immediate self-echo, so an alternating pair paginates forever under no maxPages, each wire call comfortably inside listMs',
    file: 'packages/core/src/tools/mcp.ts',
    find: ' && visited.has(page.nextCursor)) {',
    replace: ' && false) {',
    test: 'packages/core/src/tools/mcp-bounds.test.ts',
  },
  {
    id: 'mcp-total-deadline',
    doctrine:
      'the MCP discovery deadline bounds the whole sweep as a unit (RV1808): per-page listMs cannot stop a crawl of promptly answered pages, and maxPages binds only when declared, so dropping the wall clock reopens the unbounded discovery',
    file: 'packages/core/src/tools/mcp.ts',
    find: '      if (discoveryMs !== undefined && Date.now() - startedAt > discoveryMs) {',
    replace: '      if (false) {',
    test: 'packages/core/src/tools/mcp-bounds.test.ts',
  },
  {
    id: 'settled-handles-no-probing',
    doctrine:
      "the await_any digest names the settled subset (RV1807): without settledHandles the model discovers settlement by probing get_child_result and collects not-settled errors as control flow, exactly the nineteenth benchmark's eight speculative failures",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        return { ...digest, settledHandles };',
    replace: '        return digest;',
    test: 'packages/core/src/orchestrator/progressive-drafting.test.ts',
  },
  {
    id: 'runfacts-scope-label',
    doctrine:
      'the RUN FACTS sheet names its child-only scope in the quoted bytes (RV1807): without the label the composing model honestly reprints settled-children totals as the whole workflow and a reader diffs them against the terminal invoice into invented drift',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "                  scope: 'settled-children-only',",
    replace: '',
    test: 'packages/core/src/orchestrator/runfacts.test.ts',
  },
  {
    id: 'unsettled-at-finish-roster',
    doctrine:
      'a finish over a still-running child records it machine-readably (RV1807): dropping unsettledAtFinish leaves the late-child boundary as prose only, and a consumer gating on structure reads an early finish as if the pools saw every child',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "        if (status === 'running') {\n          unsettledAtFinish.push(record.nodeId);\n        }",
    replace: '        void status;',
    test: 'packages/core/src/orchestrator/progressive-drafting.test.ts',
  },
  {
    id: 'provider-executed-deny-terminal',
    doctrine:
      'the bridge refuses provider-executed tools under the default deny (RV1806): those calls never pass the ToolDef registry, risk classes, or approvals, so silently absorbing them is an effect surface the permission chain cannot see',
    file: 'packages/bridge-ai-sdk/src/bridge.ts',
    find: "        if (part.providerExecuted === true) {\n          if (this.providerExecutedPolicy === 'deny') {\n            return this.denyProviderExecuted(part.toolName);\n          }\n          this.providerExecutedWireIds.add(part.id);",
    replace:
      '        if (part.providerExecuted === true) {\n          this.providerExecutedWireIds.add(part.id);',
    test: 'packages/bridge-ai-sdk/src/bridge.test.ts',
  },
  {
    id: 'anthropic-error-carries-segments',
    doctrine:
      'every anthropic error arm names the absorbed pause_turn segments (RV1805): the successful finish carries the whole wire set, so an error that yields bare orphans exactly the paid wires a statement join needs most',
    file: 'packages/anthropic/src/adapter.ts',
    find: '      const withAbsorbed = (error: WireError): WireError => {',
    replace: '      const withAbsorbed = (error: WireError): WireError => {\n        return error;',
    test: 'packages/anthropic/src/pause-turn-usage.test.ts',
  },
  {
    id: 'record-error-wire-intake',
    doctrine:
      'the provider call record reads the absorbed wire set off an error (RV1805): the finish that would name the segments never came, so dropping the error-data arm leaves the paid wires unjoinable on every severed continuation',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "          if (wireIds === undefined && record.outcome === 'error') {",
    replace: '          if (false) {',
    test: 'packages/core/src/engine/wire-units.test.ts',
  },
  {
    id: 'counttokens-policy-deny',
    doctrine:
      "the countTokens policy gates the admission probe (RV1804): the probe carries the FULL child prompt as provider egress billed to no invoice row, so a deny that still counts is a privacy hole wearing a policy's name",
    file: 'packages/core/src/engine/ctx.ts',
    find: "      countTokensPolicy !== 'deny'",
    replace: '      true',
    test: 'packages/core/src/engine/ctx-count-admission.test.ts',
  },
  {
    id: 'rates-future-clamp',
    doctrine:
      "strict pricing clamps future ratesVerifiedAt (RV1804): a stale-only check reads any future date as eternally fresh, so a typo'd year vouches for rates forever and the declared freshness bound never binds again",
    file: 'packages/core/src/engine/budget.ts',
    find: '      if (ageMs < -FUTURE_RATES_TOLERANCE_MS) {',
    replace: '      if (false) {',
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'local-duplicate-id-fail-closed',
    doctrine:
      "statement reconciliation refuses duplicate LOCAL response ids (RV1804): two local rows claiming one provider response make the join ambiguous, and a usage-only export settles 'match' with the double-booked row silently absorbed",
    file: 'packages/core/src/engine/reconcile-statement.ts',
    find: '      if (localIds.has(id)) {',
    replace: '      if (false) {',
    test: 'packages/core/src/engine/reconcile-statement.test.ts',
  },
  {
    id: 'finalize-workflow-layer-trigger',
    doctrine:
      'the finalize trigger reads the same four layers resolution reads (RV1803): dropping the workflow layer from the trigger array makes a workflow-level finalize route resolve its model and then never fire, a paid synthesis silently skipped',
    file: 'packages/core/src/engine/ctx.ts',
    find: '    const layers = [callLayer, profileLayer, workflowLayer, engineLayer];',
    replace: '    const layers = [callLayer, profileLayer, engineLayer];',
    test: 'packages/core/src/engine/ctx-roles.test.ts',
  },
  {
    id: 'decision-chain-canonical-resolution',
    doctrine:
      "the decision chain reads the canonical entry.resolution payload first (RV1801): the engine journals who resolved and the decision value there with no entry value at all, so a fold reading only value reconstructs a live run's authority record without its authority",
    file: 'packages/core/src/l0/decision-chain.ts',
    find: "    const by = resolution?.by ?? (stringField(entry.value, 'by') as ResolutionBy | undefined);",
    replace: "    const by = stringField(entry.value, 'by') as ResolutionBy | undefined;",
    test: 'packages/core/src/l0/decision-chain.test.ts',
  },
  {
    id: 'authority-hash-risk-field',
    doctrine:
      'the tool authority record carries risk (RV1802): a risk flip from read to write is exactly the drift that changes what the ask rules will do while never moving the contract hash, so dropping risk from the projection lets a write tool ride a read pin',
    file: 'packages/core/src/tools/toolset-hash.ts',
    find: '  if (def.risk !== undefined) {\n    record.risk = def.risk;\n  }',
    replace: '  void def.risk;',
    test: 'packages/core/src/tools/toolset-hash.test.ts',
  },
  {
    id: 'authority-hash-needs-approval',
    doctrine:
      'the tool authority record carries needsApproval (RV1802): a dropped approval gate under an unchanged contract is an ungated effect the attestation exists to refuse, so the projection must move when the gate moves',
    file: 'packages/core/src/tools/toolset-hash.ts',
    find: '    needsApproval: def.needsApproval,',
    replace: '    needsApproval: false,',
    test: 'packages/core/src/tools/toolset-hash.test.ts',
  },
  {
    id: 'decision-chain-abandon-authorizedby',
    doctrine:
      'the decision chain reads the canonical entry.abandon payload first (RV1801): authorizedBy is the seq of the entry that sanctioned the abandon, and losing it turns an authorized teardown into an unexplained one on every live journal',
    file: 'packages/core/src/l0/decision-chain.ts',
    find: "    const authorizedBy = abandon?.authorizedBy ?? numberField(entry.value, 'authorizedBy');",
    replace: "    const authorizedBy = numberField(entry.value, 'authorizedBy');",
    test: 'packages/core/src/l0/decision-chain.test.ts',
  },
  {
    id: 'host-effect-idempotency',
    doctrine:
      'the reference guarded effect suppresses a re-fired side effect under a claimed idempotency key (RV1705): dropping the claim check is exactly the duplicate external effect the redelivery acceptance exists to refuse',
    file: 'examples/src/operational-host.ts',
    find: '      const alreadyFired = effects.fired.includes(key);',
    replace: '      const alreadyFired = false;',
    test: 'examples/src/operational-host.test.ts',
  },
  {
    id: 'claim-corpus-verdict-honesty',
    doctrine:
      'the claim corpus reports an unmet expectation as a failed case (RV1704): a runner that stops comparing formed pairs against the expectation green-washes the exact blindness the corpus exists to detect, and every named failure class silently passes forever',
    file: 'packages/evals/src/claim-corpus.ts',
    find: '    if (expected.minPairs !== undefined && fold.pairs.length < expected.minPairs) {',
    replace: '    if (false) {',
    test: 'packages/evals/src/claim-corpus.test.ts',
  },
  {
    id: 'claim-corpus-runfacts-arm',
    doctrine:
      "the corpus exercises the run-facts arm with a real fact sheet per run-claim class (RV1704): dropping the arm leaves 'real models were not run' unpairable, the live-fact class the eighteenth benchmark shipped",
    file: 'packages/evals/src/claim-corpus.ts',
    find: '      corpusCase.runFacts === undefined',
    replace: '      true',
    test: 'packages/evals/src/claim-corpus.test.ts',
  },
  {
    id: 'statement-normalizer-cell-refusal',
    doctrine:
      'the statement normalizer refuses a dollar cell that cannot be evidence at the cell, naming row and column (RV1703): tolerating a non-finite or negative figure flows a NaN or a guess into the reconciliation and the report closes on numbers nobody billed',
    file: 'packages/core/src/engine/reconcile-statement.ts',
    find: '  if (!Number.isFinite(parsed) || parsed < 0) {',
    replace: '  if (false) {',
    test: 'packages/core/src/engine/reconcile-statement.test.ts',
  },
  {
    id: 'statement-normalizer-evidence-floor',
    doctrine:
      'a normalized requests row must carry dollars, a component split, or usage (RV1703): admitting an evidence-free row makes it count toward coverage while being unable to confirm or deny anything, the exact false-comfort shape the coverage counters exist to prevent',
    file: 'packages/core/src/engine/reconcile-statement.ts',
    find: '    if (usd === undefined && componentsUsd === undefined && !usageSeen) {',
    replace: '    if (false) {',
    test: 'packages/core/src/engine/reconcile-statement.test.ts',
  },
  {
    id: 'docs-package-unknown-name',
    doctrine:
      'every @rulvar/<name> token in the docs names a real workspace package (RV1701): a check that stops consulting the manifest set lets a typo or a nonexistent package be documented into existence, the class the eighteenth benchmark shipped as prose',
    file: 'scripts/docs-lint.mjs',
    find: '      if (!knownNames.has(match[0])) {',
    replace: '      if (false) {',
    test: 'scripts/docs-lint.test.mjs',
  },
  {
    id: 'docs-import-symbol-gate',
    doctrine:
      "named root imports in docs fences are symbols the committed dts rollup exports (RV1701): dropping the layer lets `import { planRunner } from '@rulvar/planner'` ship as documentation, the exact plan/planner conflation the benchmark dossier failed on",
    file: 'scripts/docs-lint.mjs',
    find: "    if (subpath === '.' && binding.names.length > 0 && info.symbols !== null) {",
    replace: '    if (false) {',
    test: 'scripts/docs-lint.test.mjs',
  },
  {
    id: 'claim-coverage-declined-judge',
    doctrine:
      'a judge refused ADMISSION judged nothing, and the grade must say so (RV2508 over RV2106): without this branch the declined flag is invisible to the grade, the counts of a pass that never happened decide the word, and a declined judge over a citation-free draft graded the strongest word in the vocabulary',
    file: 'packages/core/src/orchestrator/consistency.ts',
    find: '  if (meta.judgeDeclined === true) {',
    replace: '  if (false) {',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'claim-coverage-vacuous-denominator',
    doctrine:
      "a zero denominator is not full coverage (RV2508): a configured claim-consistency pass over a draft carrying no citing sentence verified nothing, and grading that 'full' is the same silent green RV1702 exists to abolish, at its extreme",
    file: 'packages/core/src/orchestrator/consistency.ts',
    find: '  if (meta.draftCitingSentences === 0) {',
    replace: '  if (false) {',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'strict-claim-coverage-declined-exit',
    doctrine:
      "--strict exits nonzero on a declined judge exactly as on a failed one (RV2508): nothing was judged either way, and a run that reads 'complete' with an unjudged draft is the mechanical green the strict grade reading exists to catch",
    file: 'packages/cli/src/drive.ts',
    find: "  if (grade === 'judge-failed' || grade === 'judge-declined' || grade === 'critical-uncovered') {",
    replace: "  if (grade === 'judge-failed' || grade === 'critical-uncovered') {",
    test: 'packages/cli/src/index.test.ts',
  },
  {
    id: 'claim-coverage-critical-precedence',
    doctrine:
      "the claim-coverage grade ranks an unjudged DECLARED claim above ordinary truncation (RV1702): skipping the critical branch grades a run with named-but-unverified claims as merely 'partial' or even 'full', and the caller's own declaration is what the grade exists to honor",
    file: 'packages/core/src/orchestrator/consistency.ts',
    find: '  if ((meta.criticalUncoveredTotal ?? 0) > 0) {',
    replace: '  if (false) {',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'claim-coverage-envelope',
    doctrine:
      "every assembly of the claim-consistency meta derives its grade from its own counts (RV1702): hardcoding 'full' resurrects the benchmark's exact failure, completion 'complete' plus contradictions [] reading as semantic green over 40 of 144 citing sentences",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '          coverage: claimCoverageOf(bare),',
    replace: "          coverage: 'full' as const,",
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'strict-claim-coverage-exit',
    doctrine:
      "the CLI strict gate exits nonzero on 'judge-failed' and 'critical-uncovered' coverage (RV1702, widened to 'judge-declined' by RV2508): dropping the branch returns strict to the posture where a dead judge and unverified declared claims pass as green, the states the flag exists to refuse",
    file: 'packages/cli/src/drive.ts',
    find: "  if (grade === 'judge-failed' || grade === 'judge-declined' || grade === 'critical-uncovered') {",
    replace: '  if (false) {',
    test: 'packages/cli/src/index.test.ts',
  },
  {
    id: 'docs-fixed-group-parity',
    doctrine:
      "the versioning page's fixed-group list stays in set equality with .changeset/config.json (RV1701): without the missing-member direction, adding a sixteenth fixed package leaves the documented group silently one short, exactly how the installation table lost store-postgres and executor",
    file: 'scripts/docs-lint.mjs',
    find: '      if (!listed.has(name)) {',
    replace: '      if (false) {',
    test: 'scripts/docs-lint.test.mjs',
  },
  {
    id: 'preflight-wave-synthesis-hold',
    doctrine:
      "the admission projection holds the synthesis payload reserve against the run root exactly like the live gates (RV1901): dropping the hold resurrects the four-role benchmark's defect, a 5/5 green wave the live gate refuses at the third child because refuseSpawnIfInfeasible and remainderOf both count synthesisReserveUsd",
    file: 'packages/core/src/engine/preflight.ts',
    find: '      synthesisHoldUsd = Math.max(0, spec?.synthesisReserveUsd ?? 0);',
    replace: '      synthesisHoldUsd = 0;',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'preflight-roster-floor-finding',
    doctrine:
      "with a declared acceptance floor, a wave whose budget seats fewer children is a projected settle rejection and must say so before the first wire (RV1901): silencing admission-below-roster-floor lets the run pay for the seated work and still reject at minSpawnedChildren, the primary arm's exact loss",
    file: 'packages/core/src/engine/preflight.ts',
    find: '    if (rosterFloor > 0 && children < rosterFloor && childrenDeniedByBudget > 0) {',
    replace: '    if (false) {',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'root-exposure-wait',
    doctrine:
      "an orchestrate-owned root dispatch waits out a transient in-flight exposure refusal instead of settling a budget error (RV1902): dropping the wait resurrects the recovery arm's death, a root refused pre-wire while its admitted children were still finalizing, tearing the run down around its own funded work",
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "            if (\n              (options.exposureWait !== true && options.exposureWait !== 'child') ||\n              refusalData?.reason !== 'in-flight-exposure' ||\n              awaitRelease === undefined\n            ) {",
    replace: '            if (true) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'terminal-child-barrier',
    doctrine:
      "every orchestration exit awaits a journaled terminal for every spawned child before the workflow settles (RV1903): dropping the await resurrects the recovery journal's shape, run_settle at sequence 18 with three child terminals appended at 19..21 and four mutually inconsistent cost views",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      await Promise.allSettled(live.map((record) => record.result));',
    replace: '      void live;',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'barrier-live-roster',
    doctrine:
      'the exit barrier walks the LIVE roster, one record per admitted spawn with no settled terminal (RV1903): emptying the walk leaves the stragglers running past the settle, so the cancelled terminals the default policy promises never journal',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      const live = [...byOrdinal.values()].filter((record) => record.settled === undefined);',
    replace: '      const live = [...byOrdinal.values()].filter(() => false);',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'settle-drain',
    doctrine:
      "the engine terminates every live agent invocation to a journaled entry before run_settle exists (RV1904): dropping the drain lets a plain workflow's un-awaited ctx.agent strand a child writing past the settle, the recovery benchmark's exact shape at the engine level",
    file: 'packages/core/src/engine/engine.ts',
    find: "        if (status !== 'suspended' && internals.liveAgentCalls.size > 0) {",
    replace: '        if (false) {',
    test: 'packages/core/src/engine/settle-drain.test.ts',
  },
  {
    id: 'journal-seal',
    doctrine:
      'the billing lanes of a settled journal refuse further appends typed (RV1904): disarming the seal returns the silent post-settle mutation that split the recovery run into four mutually inconsistent cost views',
    file: 'packages/core/src/journal/replayer.ts',
    find: '    if (!this.sealedInternal) {\n      return undefined;\n    }',
    replace: '    if (true) {\n      return undefined;\n    }',
    test: 'packages/core/src/engine/settle-drain.test.ts',
  },
  {
    id: 'cost-audit-roster-check',
    doctrine:
      'the cost audit flags a running agent entry with no terminal instead of averaging over it (RV1910): silencing roster-closed lets the benchmark recovery journal read as one clean denominator while its roster was still moving',
    file: 'packages/cli/src/commands.ts',
    find: "      name: 'roster-closed',\n      pass: openAgents.length === 0,",
    replace: "      name: 'roster-closed',\n      pass: true,",
    test: 'packages/cli/src/index.test.ts',
  },
  {
    id: 'cost-audit-settle-boundary',
    doctrine:
      'the cost audit verifies that no agent entry follows run_settle (RV1910): silencing settle-is-billing-boundary lets the exact recovery shape, three child terminals after the settle, pass as audited truth',
    file: 'packages/cli/src/commands.ts',
    find: "      name: 'settle-is-billing-boundary',\n      pass: agentsAfterSettle.length === 0,",
    replace: "      name: 'settle-is-billing-boundary',\n      pass: true,",
    test: 'packages/cli/src/index.test.ts',
  },
  {
    id: 'batch-atomic-precheck',
    doctrine:
      "all-or-none projects the whole batch against the live remainder before any admission (RV1908): dropping the pre-check pays for a partial seat under a policy whose name promises zero-or-everything, and the mid-batch rollback cannot refund the admitted siblings' spend",
    file: 'packages/core/src/orchestrator/spawn-tools.ts',
    find: "          if (policy === 'all-or-none' && feasible < tasks.length) {",
    replace: '          if (false) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'roster-floor-precheck',
    doctrine:
      'a batch that cannot reach the declared acceptance floor is refused before the first child is paid (RV1908): dropping the pre-check returns the primary arm, two workers paid in full under a floor of four the wave could never reach',
    file: 'packages/core/src/orchestrator/spawn-tools.ts',
    find: '          if (\n            floor !== undefined &&\n            admittedSoFar + tasks.length >= floor &&\n            admittedSoFar + feasible < floor\n          ) {',
    replace: '          if (false) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'exposure-cap-tight-finding',
    doctrine:
      "the projection warns when the declared exposure cap sits below the wave's breathing floor (RV1907): silencing exposure-cap-tight lets the recovery arm's $3.20 stall configuration read clean, where the coordinating turn beside a full child wave parks on every dispatch",
    file: 'packages/core/src/engine/preflight.ts',
    find: "      code: 'exposure-cap-tight',",
    replace: "      code: 'exposure-cap-noted',",
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'required-minimum-ceiling',
    doctrine:
      'the report prices the whole-wave ceiling floor (RV1907): zeroing requiredMinimumCeilingUsd returns the operator to solving the wave by hand, the benchmark shape where $6.00 read viable while the wave needed strictly above 6.98',
    file: 'packages/core/src/engine/preflight.ts',
    find: '      : wave.reduce((sum, row) => sum + row.reserveUsd, 0) +\n        reservedForFinalizationUsd +\n        synthesisHoldUsd +',
    replace:
      '      : 0 +\n        0 * reservedForFinalizationUsd +\n        0 * synthesisHoldUsd +\n        0 *',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'acceptance-verdict-event',
    doctrine:
      "the acceptance verdict speaks on the event stream between the root's agent:end and run:end (RV1906): dropping the emission returns the benchmark's silent gap, where an operator saw ok then error and had to reconstruct the policy fold by hand",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "        type: 'orchestrator:acceptance',",
    replace: "        type: 'log',\n        level: 'info',\n        msg: 'acceptance',",
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'semantic-passes-summary',
    doctrine:
      'every semantic pass reports an explicit {ran, reason} on the envelope and the rejection data (RV1906): silencing the summary returns the null ambiguity the benchmark judge had to annotate by hand, where an absent findings field read as anything the reader wanted',
    file: 'packages/core/src/engine/engine.ts',
    find: '        if (lifted.semanticPasses !== undefined) {\n          outcomeFacts.semanticPasses = lifted.semanticPasses;\n        }',
    replace: '        void lifted.semanticPasses;',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'benchmark-cassette-roster',
    doctrine:
      'the two four-role benchmark cassettes stay registered in the fault kit (RV1905): dropping them from the scenario roster silently un-gates the exact primary and recovery shapes the twenty-second plan fixed, and the kit exists so a fixed defect can never become untested again',
    file: 'packages/evals/src/fault-injection.ts',
    find: '  benchmarkPrimaryPreflightParity,\n  benchmarkRecoveryRootExposure,\n  parityQuiescenceDeadlock,',
    replace: '  parityQuiescenceDeadlock,',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'benchmark-cassette-verdict',
    doctrine:
      "the recovery cassette's matched verdict derives from its observed surfaces (RV1905): inverting the first observed term must flip the whole gate to matched:false, proving the predicate is consulted rather than decorative",
    file: 'packages/evals/src/fault-injection.ts',
    find: "    const matched =\n      outcome.status === 'ok' &&\n      outcome.value === 'joined after the wait' &&",
    replace:
      "    const matched =\n      outcome.status !== 'ok' &&\n      outcome.value === 'joined after the wait' &&",
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'exposure-drained-partial',
    doctrine:
      "a drained exposure refusal on the root settles the documented forced-finish partial, never a bare escape (RV1902; the guard widened by RV2101 and re-widened by RV2205 to the root and run crossings): dropping the orchestrate catch returns the run to a null-valued exhausted with no journaled fallback decision, the recovery arm's exact terminal",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "      if (\n        budgetReason !== 'in-flight-exposure' &&\n        budgetReason !== 'output-floor' &&\n        crossed?.source !== 'root' &&\n        crossed?.account !== 'run'\n      ) {",
    replace: '      if (true) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'exposure-terminal-release',
    doctrine:
      "an agent terminal returns every live dispatch estimate its holder still has (RV2001): dropping the release re-parks the parity rerun's 0.478 USD of dead children's estimates against the cap forever, and the exposure wait starves on money no live dispatch is holding",
    file: 'packages/core/src/engine/budget.ts',
    find: '    this.exposureHolds.delete(holderScope);\n    this.settleExposureRelease(held);\n    return held;',
    replace: '    this.exposureHolds.delete(holderScope);\n    return held;',
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'exposure-late-closure-guard',
    doctrine:
      'a late attempt closure frees at most what its holder still holds (RV2001): dropping the clamp lets a closure firing after the terminal backstop eat the live estimates of OTHER holders, and the under-counted cap admits dispatches past the exposure bound',
    file: 'packages/core/src/engine/budget.ts',
    find: '          const held = this.exposureHolds.get(holderScope) ?? 0;\n          amount = Math.min(amount, held);',
    replace:
      '          const held = this.exposureHolds.get(holderScope) ?? 0;\n          void held;',
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'exposure-zero-holders-snap',
    doctrine:
      'the live exposure scalar snaps to exactly zero when the last hold of any kind releases (RV2001): dropping the snap leaves float residue parked against the cap, the epsilon-scale rebirth of the deadlock where the exposure wait starves on money nobody holds',
    file: 'packages/core/src/engine/budget.ts',
    find: '    if (this.exposureHolds.size === 0 && this.unattributedHoldCount === 0) {\n      this.inFlightExposureUsd = 0;\n    }',
    replace: '    void this.unattributedHoldCount;',
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'child-exposure-park',
    doctrine:
      "a spawned child waits out a pre-wire exposure refusal exactly like the root (RV2002): dropping the child flavor returns the parity rerun's terminal child death, three workers killed mid-research by a refusal that parks the root",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "        [kExposureWait]: 'child',",
    replace: '',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'child-exposure-drained-typed',
    doctrine:
      "a drained child refusal dies as the typed cheap 'exposure-drained' seat the orchestrator can re-spawn (RV2002): dropping the arm settles the raw budget error, indistinguishable from a crashed child and unjournaled as a starved seat",
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "              if (waitScope === 'child') {",
    replace: '              if (false) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'exposure-wait-keepalive',
    doctrine:
      "a parked exposure waiter REFs the event loop for exactly as long as any waiter exists (RV2003): disarming the keepalive returns the parity rerun's silent exit, a process ending mid-run with the parked root's unsettled await as its only remaining work",
    file: 'packages/core/src/engine/budget.ts',
    find: '    if (this.exposureWaiters.size > 0) {\n      if (this.waitKeepalive === undefined) {',
    replace: '    if (false) {\n      if (this.waitKeepalive === undefined) {',
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'exposure-drained-sweep',
    doctrine:
      'each keepalive tick sweeps for the drained state and wakes waiters (RV2003): dropping the sweep strands a waiter forever when a future leak loses the event-driven wake, the defense in depth behind the RV2001 backstop',
    file: 'packages/core/src/engine/budget.ts',
    find: '        this.waitKeepalive = setInterval(() => {\n          if (this.exposureHolds.size === 0 && this.unattributedHoldCount === 0) {',
    replace: '        this.waitKeepalive = setInterval(() => {\n          if (false) {',
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'quiescence-watchdog-force',
    doctrine:
      'the beforeExit watchdog forces every unsettled run through the cancel path to a journaled terminal (RV2003): silencing the force lets the event loop die with a forever-running root, no run_settle and no cost report, the parity journal verbatim',
    file: 'packages/core/src/engine/engine.ts',
    find: "      requestCancel('rulvar:quiescence-watchdog');",
    replace: '      void 0;',
    test: 'packages/core/src/engine/quiescence-watchdog.test.ts',
  },
  {
    id: 'quiescence-watchdog-race-arm',
    doctrine:
      'the watchdog arm settles the run race even when the body is stuck on a bare promise no signal reaches (RV2003): dropping the arm leaves the cancel unable to settle exactly the runs the watchdog exists for',
    file: 'packages/core/src/engine/engine.ts',
    find: "          watchdogForced.then(() => ({ kind: 'watchdog-forced' as const })),",
    replace: '',
    test: 'packages/core/src/engine/quiescence-watchdog.test.ts',
  },
  {
    id: 'spawn-verdict-projection',
    doctrine:
      "the spawn-tool verdict reserve IS the dispatch projection (RV2004): re-enabling the fraction clamp on that path journals the parity rerun's 0.50 under a declared 0.70 that dispatch commits, and resume rolls the lie forward",
    file: 'packages/core/src/orchestrator/admission.ts',
    find: "    const spawnToolOrigin = spec.origin === 'spawn_agent' || spec.origin === 'parallel_agents';",
    replace: '    const spawnToolOrigin = false;',
    test: 'packages/core/src/orchestrator/admission.test.ts',
  },
  {
    id: 'reserve-derivation-journaled',
    doctrine:
      'every admission verdict names the derivation of its reserve (RV2004): dropping the source field returns the journal a reader must reverse-engineer, exactly how the 0.50-versus-0.70 divergence went unexplained in the parity journal',
    file: 'packages/core/src/orchestrator/admission.ts',
    find: '    const reserve: BudgetReserve = { reserveUsd, source };',
    replace: '    const reserve: BudgetReserve = { reserveUsd };',
    test: 'packages/core/src/orchestrator/admission.test.ts',
  },
  {
    id: 'preflight-live-root-exposure',
    doctrine:
      "preflight's embedded gate and required minimum carry the live-root-exposure term (RV2004): zeroing it re-admits the parity envelope's fourth seat offline (5.95 under 6.00) that live coordination money then refuses",
    file: 'packages/core/src/engine/preflight.ts',
    find: "  const liveRootExposureTermUsd = orchestrateWave\n    ? (units.find((unit) => unit.label === 'orchestrator')?.turnFloorUsd ?? 0)\n    : 0;",
    replace: '  const liveRootExposureTermUsd = orchestrateWave ? 0 : 0;',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'sequential-roster-feasibility',
    doctrine:
      'every single spawn_agent admission under a declared acceptance floor projects the whole remaining roster before paying the seat (RV2005): dropping the check returns the parity shape, three seats paid in full under a floor of four the money could never reach',
    file: 'packages/core/src/orchestrator/admission.ts',
    find: '    if (spec.roster !== undefined) {',
    replace: '    if (false) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'cache-policy-compiles',
    doctrine:
      'the loop compiles CacheHint on every turn of an explicit-caching adapter (RV2006): dropping the compilation returns the parity economics, every turn of a 550k-token context re-paying the full input rate with cacheReadTokens 0',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "  if (caching !== 'explicit') {\n    return req;\n  }",
    replace: '  if (true) {\n    return req;\n  }',
    test: 'packages/core/src/engine/cache-policy.test.ts',
  },
  {
    id: 'cache-policy-sliding-deepest',
    doctrine:
      'the deepest cache breakpoint slides with the growing history (RV2006): freezing it caches only the first prefix and every later turn re-pays the whole extension, the long-cycle economics the policy exists for',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '  if (req.messages.length > 0) {\n    breakpoints.push({ after: { messageIndex: req.messages.length - 1 }, ttl });\n  }',
    replace: '  void 0;',
    test: 'packages/core/src/engine/cache-policy.test.ts',
  },
  {
    id: 'cache-hint-cassette-neutral',
    doctrine:
      'requestHash strips cacheHint (RV2006): keying cassettes on a transport-only hint would re-key every recorded row the moment the cache policy toggles, and the hint contract says it MUST NOT enter identity',
    file: 'packages/testing/src/vcr.ts',
    find: '  const { providerOptions, cacheHint, ...rest } = req;\n  void cacheHint;',
    replace: '  const { providerOptions, ...rest } = req;',
    test: 'packages/testing/src/vcr.test.ts',
  },
  {
    id: 'cached-loop-floor-priced',
    doctrine:
      'preflight prices the cached loop input floor beside the uncached one (RV2007): dropping the cached figure leaves the operator sizing envelopes at the parity economics, a 550k-token prefix re-billed at the full input rate every turn with no number saying it need not be',
    file: 'packages/core/src/engine/preflight.ts',
    find: '      if (pricing.cacheReadUsdPerMTok !== undefined && pricing.cacheWriteUsdPerMTok !== undefined) {',
    replace: '      if (false) {',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'uncached-long-loop-warning',
    doctrine:
      "the 'uncached-long-loop' warning names a long cycle about to run with the cache policy off on an explicit-caching adapter (RV2007): silencing it lets the opt-out ride into exactly the envelope the parity rerun burned",
    file: 'packages/core/src/engine/preflight.ts',
    find: "    if (\n      caps?.promptCaching === 'explicit' &&\n      engine.defaults?.cache?.mode === 'off' &&",
    replace: "    if (\n      false &&\n      engine.defaults?.cache?.mode === 'off' &&",
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'incremental-billing-rows',
    doctrine:
      "every ProviderCallRecord journals the moment its wire call settles (RV2008): dropping the seam returns the parity crash window, an invocation's whole dispatch history living only in process memory until a terminal that may never come",
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '          options.billing?.onProviderCall(record);',
    replace: '          void record;',
    test: 'packages/core/src/engine/billing-rows.test.ts',
  },
  {
    id: 'invoice-unsettled-lane',
    doctrine:
      'the invoice prices the unsettled lane from the incremental rows (RV2008): dropping it makes a crash journal fold to the settled money alone, hiding exactly the preserved dispatches the lane exists to recover',
    file: 'packages/core/src/engine/invoice.ts',
    find: "    if (\n      value?.decisionType !== 'provider-call' ||\n      typeof value.agentRef !== 'number' ||\n      terminalRefs.has(value.agentRef)\n    ) {",
    replace: '    if (true) {',
    test: 'packages/core/src/engine/billing-rows.test.ts',
  },
  {
    id: 'cost-audit-incremental-check',
    doctrine:
      'cost-audit verifies terminal dispatch sets against the incremental rows (RV2008): silencing incremental-rows-match lets a poisoned or half-lost row lane read as audited truth beside a disagreeing terminal',
    file: 'packages/cli/src/commands.ts',
    find: "      name: 'incremental-rows-match',\n      pass: incrementalMismatches.length === 0,",
    replace: "      name: 'incremental-rows-match',\n      pass: true,",
    test: 'packages/cli/src/index.test.ts',
  },
  {
    id: 'parity-shapes-registered',
    doctrine:
      'the two parity crash shapes stay registered in the fault kit (RV2009): dropping them silently un-gates the exact quiescence deadlock and sequential roster shapes the twenty-third plan fixed, and the kit exists so a fixed defect can never become untested again',
    file: 'packages/evals/src/fault-injection.ts',
    find: '  parityQuiescenceDeadlock,\n  paritySequentialRosterFloor,\n  parityReserveLineRedemption,',
    replace: '  parityReserveLineRedemption,',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'parity-deadlock-verdict',
    doctrine:
      "the parity deadlock gate's matched verdict derives from its observed surfaces (RV2009): inverting the first observed term must flip the whole gate to matched:false, proving the predicate is consulted rather than decorative",
    file: 'packages/evals/src/fault-injection.ts',
    find: "    const matched =\n      outcome.status === 'exhausted' &&\n      envelope?.forcedFinishFallback === true &&",
    replace:
      "    const matched =\n      outcome.status !== 'exhausted' &&\n      envelope?.forcedFinishFallback === true &&",
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'require-batch-spawn-gate',
    doctrine:
      "requireBatchSpawn 'reject-spawn-agent' refuses every single spawn_agent call typed so model disobedience cannot split the batch policy (RV2005): dropping the gate lets the seat-by-seat path bypass the batchGate the host demanded",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "        if (origin === 'spawn_agent' && opts?.requireBatchSpawn === 'reject-spawn-agent') {",
    replace: '        if (false) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'exposure-committed-excludes-tail-reserves',
    doctrine:
      'the in-flight exposure admission counts spent money plus live estimates alone (RV2101): the tail reserves are fenced by the budget chain, and restoring them to the sum makes the cap bind at cap minus reserves, refusing wire work while the actual exposure is far below the cap, exactly the third parity run death',
    file: 'packages/core/src/engine/budget.ts',
    find: '    const committed = root.spentUsd + this.inFlightExposureUsd;',
    replace:
      '    const committed =\n      root.spentUsd + root.finalizeReserveUsd + root.synthesisReserveUsd + this.inFlightExposureUsd;',
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'output-floor-reason-survives-ctx',
    doctrine:
      "the coordination loop's output-floor refusal keeps its typed reason across the ctx boundary (RV2101): re-minting the error generic there was how the fourth parity run's root died bare one turn short of its funded synthesis",
    file: 'packages/core/src/engine/ctx.ts',
    find: "        result.error.reason === 'output-floor' &&",
    replace: "        result.error.reason === 'never-output-floor' &&",
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'reserve-line-redeems-synthesis',
    doctrine:
      'a coordination turn refused at the reserve line settles the documented forced-finish partial and redeems the held synthesis promise from its own reserve (RV2101): severing the floor arm alone (the RV2205 crossing arms stay in place) lets the budget-floor refusal escape bare with the reserve intact and unreachable',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "      if (\n        budgetReason !== 'in-flight-exposure' &&\n        budgetReason !== 'output-floor' &&\n        crossed?.source !== 'root' &&\n        crossed?.account !== 'run'\n      ) {",
    replace:
      "      if (\n        budgetReason !== 'in-flight-exposure' &&\n        crossed?.source !== 'root' &&\n        crossed?.account !== 'run'\n      ) {",
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'reserve-line-headroom-finding',
    doctrine:
      "preflight warns when the admitted wave's steady state sits within two coordination turn floors of the reserve line (RV2101): silencing the finding hides the trajectory both parity runs died on while every static minimum read green",
    file: 'packages/core/src/engine/preflight.ts',
    find: '    reserveLineHeadroomUsd < headroomTurns * Math.max(liveRootExposureTermUsd, 0.0001)',
    replace: '    reserveLineHeadroomUsd < 0 * Math.max(liveRootExposureTermUsd, 0.0001)',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'redemption-drains-stragglers',
    doctrine:
      "the redemption aborts and awaits every unsettled child BEFORE the synthesis dispatch (RV2102): a straggler's committed admission reserve and in-flight wire otherwise block the synthesis spawn the redemption exists for, exactly the fifth parity pair's death one layer under RV2101",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        const stragglers = [...byOrdinal.values()].filter((record) => record.settled === undefined);',
    replace: '        const stragglers = [...byOrdinal.values()].filter(() => false);',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'redemption-declined-journaled',
    doctrine:
      'a redemption that cannot fund the synthesis journals its verdict with the refusal arithmetic (RV2102): silencing the decision returns the declined tail to an unauditable swallowed throw',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "            if (\n              !internals.replayer\n                .snapshot()\n                .some((entry) => entry.kind === 'decision' && entry.key === declineKey)\n            ) {",
    replace: '            if (false) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'redemption-terminal-truth',
    doctrine:
      "the declined verdict's reason carries the synthesis terminal's own message when the attempt died on the wire (RV2103): the exhausted flag is armed at the fallback by design, so without the entryRef lookup the verdict journals the ctx boundary's generic budget re-mint, exactly the sixth parity run's misleading record",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '                  reason: (\n                    terminal?.error?.message ??\n                    (declined instanceof Error ? declined.message : String(declined))\n                  ).slice(0, 300),',
    replace:
      '                  reason: (declined instanceof Error ? declined.message : String(declined)).slice(0, 300),',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'before-turn-refusal-message',
    doctrine:
      "the beforeTurn refusal's own message rides the agent terminal (RV2104): the seventh parity run's synthesis died between a granted repair verdict and its dispatch as a bare 'agent terminated with status error' while the thrown text named the crossed account and the exact arithmetic",
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "      errorMessage =\n        (repairPending ? 'the granted repair turn could not be funded: ' : '') +\n        (thrown instanceof Error ? thrown.message : String(thrown));\n      break;",
    replace: '      break;',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'synthesis-reserve-cap-composition',
    doctrine:
      "preflight prices the synthesis reserve against a composition written to the output allowance plus the declared repair turn (RV2104): the minimal-payload check alone passed the seventh parity run's 0.70 hold, and the cap-sized composition spent it whole with nothing left for the granted repair",
    file: 'packages/core/src/engine/preflight.ts',
    find: '            if (reserveShort || exposureShort) {',
    replace: '            if (false) {',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'synthesis-tail-counts-granted-repairs',
    doctrine:
      "the mandatory synthesis tail is one composition plus EVERY repair maxRepairs grants, not one (RV2504): the reserve is a turn budget and the money is spent by every repair the runtime will dispatch, so the comparison run's 1.53 hold passed a check that priced two turns while the runtime was free to take three",
    file: 'packages/core/src/engine/preflight.ts',
    find: '            const tailTurns = 1 + grantedRepairs;',
    replace: '            const tailTurns = 1 + (grantedRepairs > 0 ? 1 : 0);',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'synthesis-tail-exposure-room',
    doctrine:
      'the tail is priced against the exposure room above the reserve line as well as against the hold (RV2504): an in-flight exposure cap below the run ceiling shortens the tail no matter how much money the reserve carries, which is how the comparison run died mid repair with 0.385 unspent',
    file: 'packages/core/src/engine/preflight.ts',
    find:
      '            const exposureShort = exposureRoomUsd !== undefined && ' +
      'exposureRoomUsd < requiredUsd;',
    replace: '            const exposureShort = false;',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'synthesis-tail-both-rooms-error',
    doctrine:
      'a tail neither room can pay is an error finding, not a warning (RV2504): with both the hold and the exposure room under the tail price there is no coordination frugality that reaches past the smaller of them, so the preflight command must exit non-zero',
    file: 'packages/core/src/engine/preflight.ts',
    find: "                severity: reserveShort && exposureShort ? 'error' : 'warning',",
    replace: "                severity: 'warning',",
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'claim-judge-declined-degrades',
    doctrine:
      "the declined claim-judge admission degrades typed instead of killing the run (RV2106): the ninth parity run's judge estimate was refused against the orchestrator account after acceptance and the bare refusal settled exhausted with no fold and the funded synthesis never dispatched",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        if (!(declined instanceof BudgetExhaustedError)) {\n          throw declined;\n        }\n        claimConsistencyMeta = finishMeta({ judgeInvoked: false, judgeDeclined: true });',
    replace:
      '        if (true) {\n          throw declined;\n        }\n        claimConsistencyMeta = finishMeta({ judgeInvoked: false, judgeDeclined: true });',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'admit-refusal-names-hold',
    doctrine:
      "the admission refusal's printed arithmetic closes (RV2106): the ninth parity run's message said spent 0.3849 plus proposed 0.28 does not fit ceiling 1.90, numbers that fit with room to spare, because the held synthesis reserve that ate the room was in the sum and not in the message",
    file: 'packages/core/src/engine/budget.ts',
    find: "            (account.synthesisReserveUsd > 0\n              ? `plus the held synthesis reserve ${account.synthesisReserveUsd.toFixed(4)} USD `\n              : '') +",
    replace: "            '' +",
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'orchestrator-working-room-finding',
    doctrine:
      "preflight judges the orchestrator account's working room past the held synthesis reserve against one coordination turn floor plus the declared claim-judge estimate (RV2106): the ninth parity run's 0.50 room could never seat the 0.28 judge and no static check said so",
    file: 'packages/core/src/engine/preflight.ts',
    find: '      if (workingRoomUsd < neededUsd) {',
    replace: '      if (false) {',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'evidence-grade-names-sentences',
    doctrine:
      "the evidence-grade verdict names its offending sentences verbatim, bounded and truncated (RV2105): the phrase-only reason told the eighth parity run's synthesis 'live-observed claims lack citations' over a 5000-word document, both granted repairs missed them, and the run failed closed with half its budget unspent",
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '          ...named,\n          ...(overflow > 0 ? [`and ${String(overflow)} more offending sentences`] : []),',
    replace: '',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'redemption-transport-retry',
    doctrine:
      'a synthesis attempt severed on the wire is granted at most one retry from the same remainder (RV2103): the cut stream is a death of the attempt, not of the money, and the sixth parity run declined with $0.9077 still uncommitted after a single idle abort',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "            if (\n              !synthesisTransportRetried &&\n              terminal !== undefined &&\n              terminal.error !== undefined &&\n              (terminal.error.data as { kind?: unknown } | undefined)?.kind === 'transport' &&\n              terminal.error.retryable === true\n            ) {",
    replace: '            if (false) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'admit-recovered-never-recounts',
    doctrine:
      'the lifetime spawn counter counts each agent once across the whole life of the run (RV2201): the seventh subscription parity resume seeded 5 agents from the journal fold, re-counted the four recovered children to 9 against a cap of 8, and starved the post-acceptance tail with its money whole',
    file: 'packages/core/src/engine/budget.ts',
    find: '  admitRecovered(reserveUsd: number, accountScope: string = ROOT_ACCOUNT): void {\n    for (const account of this.chainOf(accountScope)) {',
    replace:
      '  admitRecovered(reserveUsd: number, accountScope: string = ROOT_ACCOUNT): void {\n    this.agentsSpawnedInternal += 1;\n    for (const account of this.chainOf(accountScope)) {',
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'synthesis-regression-floor-is-opt-in',
    doctrine:
      'the no-regression floor under the synthesis is opt-in (RV2505): every run without fallbackToValidDraft keeps dying on a failing synthesis exactly as before, byte for byte, and only a host that declared the floor settles on its draft',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      const floorOn = opts?.synthesis?.fallbackToValidDraft === true;',
    replace: '      const floorOn = true;',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'synthesis-regression-judges-the-draft',
    doctrine:
      'the floor settles on the draft only when the DECLARED contract accepts it (RV2505): a draft that fails the same bundle is not a floor, it is a second failure, so the original error rethrows and the decline is journaled with the validators the draft itself failed',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      const regressed = failed.length === 0;',
    replace: '      const regressed = true;',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'synthesis-regression-decline-names-validators',
    doctrine:
      "the declined verdict names the draft's OWN failing validators (RV2505): a decline that records only the synthesis failure leaves the operator unable to tell a draft that nearly passed from one that was never close",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '              ...(regressed ? {} : { failed: failed as unknown as Json }),',
    replace: '              ...(regressed ? {} : {}),',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'synthesis-decline-journals-accepted-finish',
    doctrine:
      "a synthesis admission refused after the validated coordination finish journals the declined verdict (RV2201): the seventh subscription parity resume refused the spawn on the counter with the reserve's dollars whole and the terminal carried a bare message the journal never explained",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      if (!(thrown instanceof BudgetExhaustedError)) {\n        return;\n      }',
    replace: '      if (true) {\n        return;\n      }',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'tail-spawn-budget-finding',
    doctrine:
      'preflight prices the post-fan-in tail against the lifetime spawn cap (RV2201): the wave rows are denied row by row, but the claim judge and the synthesis spawn after the fan-out and no row priced them, so a cap below the plan starved the tail with no static warning',
    file: 'packages/core/src/engine/preflight.ts',
    find: '    if (spawnHeadroom <= 0) {',
    replace: '    if (false) {',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'reserve-line-headroom-knob',
    doctrine:
      'the reserve-line headroom threshold is a declared knob (RV2201): headroomTurns widens the fence for waves that overrun their estimates and 0 silences it, where the hardwired 2 answered nobody',
    file: 'packages/core/src/engine/preflight.ts',
    find: '  const headroomTurns = input.orchestrator?.headroomTurns ?? 2;',
    replace: '  const headroomTurns = 2;',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'evidence-grade-guidance-composes',
    doctrine:
      "a validator reason is a repair instruction and must be executable without violating any sibling in the bundle (RV2202): the RV2106 mirror run's synthesis obeyed the older 'beside it' wording literally, wove inline run ids into citation-bearing sentences, and cited-value rejected exactly those sentences, burning both repairs between two individually correct validators",
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '              `${listCitations(unsupported)}; give each such claim a file:line citation in ` +\n              `its own sentence, or state its run id in a SEPARATE sentence carrying no ` +\n              `source citation (a run id written beside a path:line citation is not in the ` +\n              `cited window and trades this failure for a cited-value one)`',
    replace:
      '              `${listCitations(unsupported)}; each such claim must name a run id or a ` +\n              `file:line citation beside it`',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'evidence-grade-accepts-the-run-id',
    doctrine:
      "the run's own id is an artifact the evidence grade accepts (RV2501): the default artifact pattern only ever matched a ULID behind the literal word `run`, so the 1.226.0 comparison run, whose id was shaped otherwise, had no executable repair for a sentence telling the truth about the run it was part of and died on it with both repairs spent",
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '          (runId !== undefined && containsIdentifier(sentence, runId))',
    replace: '          false',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'evidence-grade-run-id-sentence-scope',
    doctrine:
      "the run id satisfies the grade only in the claim's OWN sentence (RV2501 under RV1212): widened to the whole answer, one run id in a header licenses every graded claim below it, the same erasure the sentence scope exists to prevent",
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '          (runId !== undefined && containsIdentifier(sentence, runId))',
    replace: '          (runId !== undefined && containsIdentifier(input.text, runId))',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'cited-value-identity-spans-excluded',
    doctrine:
      'a span naming the artefact under review is identity, not a value asserted about a cited line (RV2502): the comparison run wrote its frozen commit sha beside source citations and the verdict demanded the sha appear in the cited source, an impossible repair delivered beside three real ones',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '          } else if (!isIdentity(span)) {',
    replace: '          } else if (true) {',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'cited-value-run-id-is-identity',
    doctrine:
      "the run's own id is identity to cited-value on the same terms the grade accepts it (RV2502 beside RV2501): without this arm the grade's instruction to write the id into the claim sentence walks the model straight into its sibling's refusal, the trap that burned both repairs of the c3 run",
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '        span === runId ||',
    replace: '        false ||',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'cited-value-sha-floor',
    doctrine:
      'the commit sha shape starts at twelve hex characters (RV2502): shorter hex words are ordinary literals a document may legitimately assert about a cited line, and excusing them would blunt the validator well past the identity class it means to exempt',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: 'const COMMIT_SHA_SPAN = /^[0-9a-f]{12,64}$/u;',
    replace: 'const COMMIT_SHA_SPAN = /^[0-9a-f]{4,64}$/u;',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'evidence-grade-guidance-shares-the-sentence',
    doctrine:
      'each arm of the grade names the composition that is TRUE for it (RV2502): with the id in hand the sibling reads it as identity and the graded sentence may carry a citation, while the idless arm keeps the separation advice, because there the sibling has no id to recognise',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find:
      '              `sentence, or give the claim a file:line citation instead (the id may share a ` +\n' +
      '              `sentence with a source citation: cited-value reads a run id as identity, not ` +\n' +
      '              `as a value asserted about the cited line)`,',
    replace:
      '              `sentence, or give the claim a file:line citation instead, and keep that ` +\n' +
      '              `sentence free of source citations`,',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'evidence-grade-verdict-names-the-run-id',
    doctrine:
      'the evidence-grade verdict names the run id it wants written (RV2501): an instruction that says "state its run id" without naming it is unexecutable when the composing model was never shown one, which is exactly what the comparison run faced',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: "              `${listCitations(unsupported)}; write this run's id ${runId} inside each such ` +",
    replace: '              `${listCitations(unsupported)}; name an artifact in each such ` +',
    test: 'packages/core/src/orchestrator/finish-validators.test.ts',
  },
  {
    id: 'run-facts-carries-its-run-id',
    doctrine:
      'the RUN FACTS line names the run whose facts it carries (RV2501): the line ends in the live-observed register and the synthesis is told to reproduce run facts only from it, so a line naming no artifact makes every faithful quote of it an evidence-grade failure the model cannot repair',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "                  })} (live-observed by run ${internals.runId}, this run's own harness; ` +",
    replace: "                  })} (live-observed by this run's own harness; ` +",
    test: 'packages/core/src/orchestrator/runfacts.test.ts',
  },
  {
    id: 'exposure-clamp-is-opt-in',
    doctrine:
      'the lone-dispatch exposure clamp runs only where a host declared it (RV2503): armed by default it would rewrite the drained-refusal terminals RV1902, RV2002 and RV2003 built out of live parity deaths, turning a documented forced-finish partial into a silently shorter turn',
    file: 'packages/core/src/engine/budget.ts',
    find: '    if (!this.clampTurnToExposure || cap === undefined || this.inFlightExposureUsd > 0) {',
    replace: '    if (cap === undefined || this.inFlightExposureUsd > 0) {',
    test: 'packages/core/src/engine/in-flight-exposure.test.ts',
  },
  {
    id: 'exposure-clamp-lone-dispatch-only',
    doctrine:
      'the exposure clamp answers only for a dispatch alone in flight (RV2503): with siblings live the refusal is transient, the RV1902 wait parks on it and the turn runs at full length when a hold releases, so shortening it would trade a complete answer for a truncated one and buy nothing',
    file: 'packages/core/src/engine/budget.ts',
    find: '    if (!this.clampTurnToExposure || cap === undefined || this.inFlightExposureUsd > 0) {',
    replace: '    if (!this.clampTurnToExposure || cap === undefined) {',
    test: 'packages/core/src/engine/budget.test.ts',
  },
  {
    id: 'exhausted-lift-reads-error-data',
    doctrine:
      'the exhausted terminal lifts its completion facts from the enriched error data when the partial value carries no envelope (RV2203): the seventh subscription parity resume settled exhausted with completion null over a journaled accepted acceptance',
    file: 'packages/core/src/engine/engine.ts',
    find: "      if (lifted === undefined && status === 'exhausted') {",
    replace: '      if (false) {',
    test: 'packages/core/src/engine/run-completion.test.ts',
  },
  {
    id: 'claim-meta-rides-the-lift',
    doctrine:
      "the claim-consistency meta mirrors onto the outcome and run:end through the same lift as completion (RV2203): the RV2106 mirror run's error terminal read claimConsistencyMeta null over a journal holding the declined-judge verdict",
    file: 'packages/core/src/engine/engine.ts',
    find: '  const metaCandidate = (candidate as { claimConsistencyMeta?: unknown }).claimConsistencyMeta;',
    replace: '  const metaCandidate = undefined;',
    test: 'packages/core/src/engine/run-completion.test.ts',
  },
  {
    id: 'budget-class-failure-enriched',
    doctrine:
      'a synthesis-path budget failure rethrows its own class with the acceptance facts and pass summaries widened onto its data (RV2203): the class is the status, and the raw rethrow left the exhausted terminal blind to the accepted acceptance it followed',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      if (thrown instanceof BudgetExhaustedError) {\n        // The class is the status:',
    replace: '      if (false) {\n        // The class is the status:',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'drained-finalization-grant',
    doctrine:
      'a mid-work drained seat spends one clamped finalization turn before its typed terminal (RV2204): the third parity rerun killed three workers ~30 turns into research with evidence pools of 17 and 22 under a floor of 24 and a configured finalization window the drain never let play',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "        typedReason === 'exposure-drained' &&\n        limits.finalizationReserve !== undefined &&\n        turns > 1 &&\n        !drainFinalizationRan",
    replace:
      "        typedReason === 'exposure-drained' &&\n        limits.finalizationReserve !== undefined &&\n        false &&\n        !drainFinalizationRan",
    test: 'packages/core/src/runtime/drained-finalization.test.ts',
  },
  {
    id: 'drained-zero-cost-doctrine',
    doctrine:
      'a seat drained before its first completed turn keeps dying free (RV2002, held by RV2204): nothing to summarize, nothing paid, and the grant fires only past the first completed turn',
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: "        typedReason === 'exposure-drained' &&\n        limits.finalizationReserve !== undefined &&\n        turns > 1 &&\n        !drainFinalizationRan",
    replace:
      "        typedReason === 'exposure-drained' &&\n        limits.finalizationReserve !== undefined &&\n        turns > 0 &&\n        !drainFinalizationRan",
    test: 'packages/core/src/runtime/drained-finalization.test.ts',
  },
  {
    id: 'drained-finalization-unfunded-finding',
    doctrine:
      'preflight names a finalization window declared under an exposure cap with no reserve to fund the drained-finalization grant (RV2204): the third rerun shipped exactly that contradiction with no static warning',
    file: 'packages/core/src/engine/preflight.ts',
    find: '    if (\n      limits.finalizationWindow !== undefined &&\n      limits.finalizationReserve?.maxOutputTokens === undefined &&\n      input.run?.maxInFlightExposureUsd !== undefined\n    ) {',
    replace: '    if (false) {',
    test: 'packages/core/src/engine/preflight.test.ts',
  },
  {
    id: 'section-patterns-distinct-count',
    doctrine:
      'counted section collections are distinct by first capture (RV2206): a repeated id counts once, so 48 numbered scenarios means 48 DIFFERENT ids, the demand the second accepted subscription dossier failed at 0 against an instruction naming it',
    file: 'packages/core/src/orchestrator/finish-validators.ts',
    find: '        const count = capturing ? captures.size : raw;',
    replace: '        const count = raw;',
    test: 'packages/core/src/orchestrator/output-contract.test.ts',
  },
  {
    id: 'bare-root-ceiling-folds',
    doctrine:
      "a coordination turn refused by the RUN account's own hard crossing folds through the documented fallback instead of rethrowing bare (RV2205): the last undocumented money death of the loop, the first parity run's shape with B0 drained while the root sat at 16% of its cap",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "        crossed?.source !== 'root' &&\n        crossed?.account !== 'run'",
    replace: '        true',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'unfunded-repair-marker',
    doctrine:
      "the unfunded repair grant names itself on the terminal (RV2207): the seventh parity run's synthesis died between a granted repair verdict and its dispatch, and the refusal read like any other budget stop",
    file: 'packages/core/src/runtime/agent-loop.ts',
    find: '      const repairPending =\n        grantedRepairTurns > 0 &&',
    replace: '      const repairPending =\n        false &&\n        grantedRepairTurns > 0 &&',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'repair-grant-declined-journaled',
    doctrine:
      'a coordination repair the money never covered journals its declined grant and fails as a typed validation failure (RV2207), instead of the generic budget re-mint with no journal record',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "        if (repairMessage.includes('the granted repair turn could not be funded: ')) {",
    replace: '        if (false) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'resume-override-reaches-the-ceiling',
    doctrine:
      "ResumeOptions.run.budgetUsd is what the resumed segment's budget actually enforces (RV2208): dropping the override arm resumes the raise under the genesis ceiling, and the run the host just paid to finish dies exhausted against the very bound the override replaced",
    file: 'packages/core/src/engine/engine.ts',
    find: '      opts?.budgetUsd ?? resumeCtx?.budgetOverride?.budgetUsd ?? resumeCtx?.budgetUsd;',
    replace: '      opts?.budgetUsd ?? resumeCtx?.budgetUsd;',
    test: 'packages/core/src/engine/run-budget-override.test.ts',
  },
  {
    id: 'resume-override-spent-floor',
    doctrine:
      'a budgetUsd override below the settled spend refuses typed before any side effect (RV2208): severing the floor admits a ceiling the seed already exceeds, and the segment exhausts before its first turn instead of refusing with the spend arithmetic',
    file: 'packages/core/src/engine/engine.ts',
    find: '      if (overrideCeilingUsd !== undefined && budgetSeed.usd > overrideCeilingUsd) {',
    replace: '      if (false) {',
    test: 'packages/core/src/engine/run-budget-override.test.ts',
  },
  {
    id: 'resume-override-journals-decision',
    doctrine:
      "a ceiling change is never silent (RV2208): dropping the run_budget_override append applies the new posture with no journaled decision naming the recorded and applied values, and the audit reads a bound the run's own history cannot explain",
    file: 'packages/core/src/engine/engine.ts',
    find: '      if (resumeCtx?.budgetOverride !== undefined && resumeCtx.strict !== true) {',
    replace: '      if (false) {',
    test: 'packages/core/src/engine/run-budget-override.test.ts',
  },
  {
    id: 'cost-audit-all-signals-divergence',
    doctrine:
      'the catalog sweep exits 1 when ANY run diverges (RV2209): silencing the sweep exit averages a broken journal into a green catalog, exactly the per-run-at-a-time blindness the flag exists to close',
    file: 'packages/cli/src/commands.ts',
    find: '  return divergent.length === 0 ? 0 : 1;\n}',
    replace: '  return 0;\n}',
    test: 'packages/cli/src/index.test.ts',
  },
  {
    id: 'cost-audit-all-exclusive-forms',
    doctrine:
      'a runId beside --all refuses typed (RV2209): dropping the guard silently audits the named run and ignores the flag, and the host reads a single-run verdict as a catalog posture',
    file: 'packages/cli/src/commands.ts',
    find: '  if (all && runId !== undefined) {',
    replace: '  if (false) {',
    test: 'packages/cli/src/index.test.ts',
  },
  {
    id: 'optional-positional-arity',
    doctrine:
      "the grammar admits required through required plus optional positionals, nothing further (RV2209): dropping the optional term from the ceiling refuses cost-audit's own runId as an extra argument",
    file: 'packages/cli/src/grammar.ts',
    find: '  const maxPositionals = grammar.positionals.length + (grammar.optionalPositionals?.length ?? 0);',
    replace: '  const maxPositionals = grammar.positionals.length;',
    test: 'packages/cli/src/index.test.ts',
  },
  {
    id: 'fault-kit-reserve-line-drive',
    doctrine:
      'the reserve-line scenario actually HOLDS the synthesis reserve that crosses the line (RV2210): with the reserve zeroed the coordination turn fits, no budget-floor fold fires, no redemption runs, and the scenario must report matched false instead of vouching for a branch it never entered',
    file: 'packages/evals/src/fault-injection.ts',
    find: '        budget: { capUsd: 0.03, synthesisReserveUsd: 0.02, finalizeReserveUsd: 0 },',
    replace: '        budget: { capUsd: 0.03, finalizeReserveUsd: 0 },',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'fault-kit-famine-cut-drive',
    doctrine:
      'the resume-famine scenario actually CUTS the journal mid-fan-out (RV2210): with the whole settled journal carried over, nothing recovers, the resumed segment replays free, and the live-worker-call assertion must report matched false instead of vouching for a recovery path never driven',
    file: 'packages/evals/src/fault-injection.ts',
    find: '    const cut = entriesA.slice(0, firstWorkerOk + 1);',
    replace: '    const cut = entriesA;',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'fault-kit-guidance-trap-drive',
    doctrine:
      'the guidance-conflict scenario actually SERVES the trap finish first (RV2210): with the corrected finish served from the first attempt no rejection exists, no repair exchange carries the guidance bytes, and the scenario must report matched false instead of vouching for a convergence never exercised',
    file: 'packages/evals/src/fault-injection.ts',
    find: '        const result = finishAttempts === 1 ? TRAP_FINISH : FIXED_FINISH;',
    replace: '        const result = FIXED_FINISH;',
    test: 'packages/evals/src/fault-injection.test.ts',
  },
  {
    id: 'deliverable-verdict-absent-without-contract',
    doctrine:
      'an undeclared finish contract leaves the deliverable claim ABSENT, never false (RV2506 under RV1209): a run nobody judged is not a run that failed judgement, and a false there would license a consumer to reject every terminal from a host that judges its artifacts itself',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      if (validationSpec === undefined) {\n        return { resultAvailable };\n      }',
    replace:
      '      if (validationSpec === undefined) {\n        return { resultAvailable, deliverableAccepted: false };\n      }',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'deliverable-verdict-counts-the-regression-floor',
    doctrine:
      'the RV2505 floor IS an acceptance and reports as one (RV2506): the draft it settles on passed the whole declared bundle, so a terminal that reads deliverableAccepted false over it would send a consumer looking for a failure that never happened',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      if (synthesisRegressed !== undefined) {',
    replace: '      if (false) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'deliverable-verdict-counts-the-valid-draft-skip',
    doctrine:
      'the RV510 skip is an acceptance too (RV2506): the pre-pass judged the draft with the same validators and the synthesis never ran, so the acceptance lives in the skip decision and nowhere else, and without that arm a skipped run reads as an unaccepted deliverable',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      if (synthesisSkipDecisionRef !== undefined) {',
    replace: '      if (false) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'deliverable-verdict-rides-the-failed-terminal',
    doctrine:
      'the deliverable verdict rides the FAILED terminal as well as the ok one (RV2506): the comparison run died with its children accepted and its artifact unaccepted, which is exactly the terminal a post-mortem policy must read without opening the journal',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        ...(validationSpec === undefined ? {} : { deliverableAccepted: false }),',
    replace: '        ...{},',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'deliverable-verdict-lifts-booleans-only',
    doctrine:
      'the deliverable claims mirror onto the terminal only as booleans (RV2506, the lift posture since RV-207): a truthy string where a verdict belongs must mirror NOTHING, because a consumer gating on === true is defeated the moment the field can hold a value the engine never validated',
    file: 'packages/core/src/engine/engine.ts',
    find: "  if (typeof acceptedCandidate === 'boolean') {",
    replace: '  if (acceptedCandidate !== undefined) {',
    test: 'packages/core/src/engine/run-completion.test.ts',
  },
  {
    id: 'rejected-candidate-identity-is-free',
    doctrine:
      'the identity of a rejected candidate is recorded WITHOUT the retention opt-in (RV2507): the hash and the size come from bytes the validator already held, and gating them behind retention would leave the default terminal saying only that something failed, which is the exact blindness the comparison analysis had to script around',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        const rejectedCandidate = failed.length > 0;',
    replace:
      '        const rejectedCandidate =\n          failed.length > 0 && validationSpec.retainRejectedCandidates === true;',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'rejected-candidate-bytes-are-opt-in',
    doctrine:
      'a COPY of the rejected document is written only where the host declared retainRejectedCandidates (RV2507): storage is the one cost of this feature and every run that never asked for it must keep writing exactly the blobs it wrote before',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '        if (rejectedCandidate && validationSpec.retainRejectedCandidates === true) {',
    replace: '        if (rejectedCandidate) {',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'rejected-candidates-ride-the-accepted-terminal',
    doctrine:
      'the rejected candidates ride the OK terminal too (RV2507): a run that recovered on its second attempt still owes a post-mortem the first, and reporting them only on failure hides every repair a passing run needed',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '      ...(envelopeRejectedCandidates.length === 0\n        ? {}\n        : { rejectedFinishCandidates: envelopeRejectedCandidates }),',
    replace: '      ...{},',
    test: 'packages/core/src/orchestrator/orchestrate.test.ts',
  },
  {
    id: 'rejected-candidates-drop-as-a-whole-list',
    doctrine:
      'one malformed row drops the WHOLE rejected-candidate list (RV2507, the roster posture since RV806): a partial history read as complete is worse than no history, because a consumer counting attempts would under-report exactly the runs that misbehaved most',
    file: 'packages/core/src/engine/engine.ts',
    find: '    if (rejectedCandidates.every(validRow)) {\n      lifted.rejectedFinishCandidates = rejectedCandidates.map((row) => ({ ...row }));\n    }',
    replace:
      '    {\n      lifted.rejectedFinishCandidates = rejectedCandidates.filter(validRow).map((row) => ({\n        ...row,\n      }));\n    }',
    test: 'packages/core/src/engine/run-completion.test.ts',
  },
  {
    id: 'claim-verdict-names-its-document',
    doctrine:
      'every claim-consistency verdict stamps WHICH document it read (RV2509): the pass judges the draft and the synthesis then rewrites it, so a coverage grade with no judgedStage is a claim about a document no consumer ever receives',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '          judgedStage: stage,',
    replace: "          judgedStage: 'draft',",
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'final-stage-judges-the-shipped-artifact',
    doctrine:
      "claimConsistency.stage 'final' and 'both' judge the artifact the run SETTLES on (RV2509): re-judging the draft after the synthesis would spend a second judge to re-confirm the verdict the run already had",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "      await runClaimConsistencyPass(synthesizedFinal, acceptanceSnapshot, 'final');",
    replace: "      await runClaimConsistencyPass(result.output, acceptanceSnapshot, 'final');",
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'both-stage-keeps-the-draft-verdict',
    doctrine:
      "under stage 'both' the pre-synthesis verdict survives the final one (RV2509): the final pass overwrites the live meta, and losing the draft verdict erases the record of the gate that let the synthesis run at all",
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: "      claimConsistencyDraftMeta = claimStage === 'both' ? claimConsistencyMeta : undefined;",
    replace: '      claimConsistencyDraftMeta = undefined;',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
  },
  {
    id: 'draft-to-final-rewrite-is-a-comparison',
    doctrine:
      'draftToFinal.rewritten compares the two hashes (RV2509): hardwiring it true would report a rewrite over a synthesis that returned the draft untouched, and the whole point of the field is telling those two runs apart',
    file: 'packages/core/src/orchestrator/orchestrate.ts',
    find: '              rewritten: draftHash !== finalHash,',
    replace: '              rewritten: true,',
    test: 'packages/core/src/orchestrator/consistency.test.ts',
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

// A mutant can hang the suite outright: RV1602's cycle mutant spins the
// pagination sweep entirely in the microtask queue, so even the vitest
// test timeout never gets a tick. The wall clock is the backstop: a run
// that outlives it is killed by definition and the manifest keeps
// moving instead of wedging on one probe.
const PROBE_WALL_CLOCK_MS = 600_000;

function run(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '' },
    timeout: PROBE_WALL_CLOCK_MS,
    killSignal: 'SIGKILL',
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
    if (result.error !== undefined && result.error.code === 'ETIMEDOUT') {
      console.log(
        `[mutation-probe] ${mutation.id}: killed by the wall clock (the mutant outlived ${String(PROBE_WALL_CLOCK_MS / 1000)}s)`,
      );
    } else if (result.status === 0) {
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
