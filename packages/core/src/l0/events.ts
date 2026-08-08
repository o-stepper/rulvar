/**
 * WorkflowEvent: the single discriminated observability stream (M1-T10).
 *
 * Docs: https://docs.rulvar.com/guide/observability. Events are pure
 * telemetry: no event, field, or ordering
 * participates in journal identity, and dropping every event MUST NOT
 * change any run outcome. The catalog is closed for v1; the adaptive-
 * orchestration variants (plan:revised, orchestrator:woke, ...) join this
 * union with their payload types in M2/M7. Consumers MUST tolerate unknown
 * fields and unknown event types.
 */
import type { Json } from './json.js';
import type { Usage } from './messages.js';
import type { WireError } from './errors.js';
import type { ResolutionBy } from './entries.js';
import type { TerminalEnvelope } from './terminal-envelope.js';

/** Run lifecycle and core telemetry (M1 subset). */
export type CoreEvents =
  | { type: 'run:start'; workflow: string; resumed: boolean }
  | {
      type: 'run:end';
      status: 'ok' | 'error' | 'cancelled' | 'exhausted' | 'suspended';
      totalUsd: number;
      /**
       * Present and true when any priced usage folded into totalUsd is
       * approximate (a transport cut, a stream the ceiling severed, or an
       * abort left a turn's usage estimated rather than reported by the
       * provider), so totalUsd is a lower bound estimate, never an exact
       * charge. Absent means every contributing turn reported exact usage.
       */
      usageApprox?: boolean;
      /**
       * The semantic completion lift (RV-207 tail): present when the
       * workflow reported semantic completion through the completion
       * envelope contract: an `ok`/`exhausted` run whose result value is
       * an object carrying a valid `completion` literal, or an `error`
       * run whose typed error data carries one (the orchestrator
       * acceptance path emits both). Transport status says whether the
       * run ran; completion says whether the work is COMPLETE: an
       * accepted degraded run is `status: 'ok'` with `completion:
       * 'partial'`. Replay recomputes the same value from the re-executed
       * workflow, so the field is identical live and replayed. Absent
       * when the workflow makes no completion claim.
       */
      completion?: 'complete' | 'partial' | 'rejected';
      /**
       * Settled child statuses by status name, lifted from the same
       * envelope (or typed error data) when it carries a valid record of
       * nonnegative integers. Absent otherwise.
       */
      childStatusCounts?: Record<string, number>;
      /**
       * Per-child degradation notes, lifted from the same envelope (or
       * typed error data) when it carries a valid string array (the
       * fifth experiment, cycle 75). An empty array is the workflow's
       * claim of zero degradation; absence means no claim. The outcome
       * mirror spreads the SAME lift, so the surfaces cannot disagree.
       */
      degradedReasons?: string[];
      /** Children accepted by acceptPartialChildren; same lift. */
      salvagedPartialChildren?: string[];
      /**
       * The explicit semantic pass summaries (RV1906); same lift. Each
       * pass carries {ran, reason?}, so an event-only consumer reads
       * whether contradictions, claim consistency and synthesis
       * actually looked, instead of decoding absence.
       */
      semanticPasses?: {
        contradictions: { ran: boolean; reason?: string };
        claimConsistency: { ran: boolean; reason?: string };
        synthesis: { ran: boolean; reason?: string };
      };
      /**
       * The claim-consistency pass meta, lifted from the same envelope
       * (or typed error data) when it carries a valid object (RV2203);
       * `judgeDeclined` rides here on the failed terminals that used to
       * read null while the journal held the verdict.
       */
      claimConsistencyMeta?: Record<string, unknown>;
      /** The synthesis-skip marker from the same envelope; same lift (RV2203). */
      synthesisSkipped?: boolean | string;
      /** Children accepted through validated terminal output salvage on 'limit'; same lift. */
      salvagedTerminalOutputChildren?: string[];
      /**
       * Children that settled 'ok' below their declared evidence floor
       * (RV1412); same lift. Under the default their shortfall is a
       * degradation note and the verdict is untouched; under
       * `acceptance.requireEvidenceFloor` they also counted against
       * the policy.
       */
      belowFloorOkChildren?: string[];
      /**
       * Present and false ONLY when nothing durable records this
       * terminal: a settlement write failed (the run_settle journal
       * append or the terminal RunMeta projection, RV907), or the
       * segment was superseded (`settledReason` names it, RV1009). The
       * status above is true as computation, but `handle.result`
       * rejects typed instead of resolving (SettlementError or
       * SupersededError), and an event-only consumer must not treat
       * this terminal as green. After a settlement failure, resuming
       * the run re-settles by replay (no provider call) and the
       * settled terminal carries no field, byte for byte like every
       * ordinary run. Never emitted true.
       */
      settled?: false;
      /**
       * Present only beside `settled: false`, naming WHY the terminal
       * refused green when the reason is not a settlement write
       * fault: 'superseded' means the run_settle append bounced off
       * the store's fence because a successor segment holds the lease
       * and owns settlement (RV1009), and `handle.result` rejects
       * with the typed SupersededError. A settlement WRITE failure
       * keeps its historical shape (`settled: false` with no reason)
       * byte for byte.
       */
      settledReason?: 'superseded';
      /**
       * The per-child acceptance roster (RV806): status, salvage arm,
       * and the evidence verdict where the child declared a contract;
       * same lift and posture as the fields above.
       */
      acceptanceChildren?: Array<{
        child: string;
        status: string;
        salvage?: 'partial' | 'terminal-output';
        evidence?: {
          recordedEntries: number;
          minEntries: number;
          met: boolean;
          waivedBySalvage?: true;
          /** RV1207: the floor was required, so the arm did not promote. */
          floorRequired?: true;
        };
      }>;
      /**
       * The unified terminal envelope (RV1105): every terminal fact in
       * ONE shape, the same object the resolved outcome carries, so an
       * event-only consumer assembles nothing. On the settled paths the
       * sibling fields above stay byte for byte; when settlement did
       * not hold, `envelope.settled` mirrors the `settled: false` mark
       * (with `settledReason` inside for the superseded arc, RV1009).
       */
      envelope: TerminalEnvelope;
    }
  | { type: 'phase:start'; phase: string }
  | { type: 'log'; level: 'debug' | 'info' | 'warn' | 'error'; msg: string; data?: Json }
  | {
      type: 'budget:update';
      spentUsd: number;
      remainingUsd: number | null;
      committedReserveUsd: number;
    }
  | {
      type: 'external:waiting';
      key: string;
      entryRef: number;
      prompt?: string;
      deadlineAt?: string;
    }
  | { type: 'approval:pending'; toolName: string; entryRef: number; deadlineAt?: string }
  | { type: 'child:start'; workflow: string; scope: string }
  | { type: 'child:end'; workflow: string; scope: string; status: string };

/**
 * The structured exploration summary (RV-210): the engine-side tool
 * exploration counters for one agent invocation. Attached to the full
 * AgentResult and to the live `agent:end` event whenever any exploration
 * guard limit is configured; journaled inside the terminal error payload
 * (and therefore restored on replay) only when the guard itself ended
 * the invocation (abortClass 'exploration').
 */
export interface ExplorationSummary {
  /** Tool executions dispatched by the loop (the loop's own counter). */
  toolCallsUsed: number;
  /** Distinct (tool name, canonical args) signatures executed. */
  distinctSignatures: number;
  /** Executions of a signature that had already executed before. */
  repeatedCalls: number;
  /** Successful executions whose result digest was already seen. */
  duplicateResultCalls: number;
  /** Calls denied by the repeated-signature guard (never dispatched). */
  deniedRepeats: number;
  /** Executions per tool name. */
  byTool: Record<string, number>;
  /** Calls denied by maxCallsPerTool; present when that limit is configured. */
  deniedToolCap?: number;
  /** Weighted tool units spent; present when toolUnits is configured. */
  toolUnitsUsed?: number;
}

/**
 * The tool budget pressure snapshot (RV304, the seventh comparison
 * experiment): how close one agent invocation came to its tool budget,
 * visible BEFORE the terminal 'limit' a starved worker would settle
 * with. Attached to the full AgentResult and to the live `agent:end`
 * event whenever maxToolCalls, toolUnits, or toolBudgetExtension is
 * configured. The snapshot itself never journals, but since RV509 it
 * has a durable subset: an extension grant and the finalization-window
 * entry journal as decision entries the moment they fire, a
 * crash-resume restores them from the journal, and a replayed result
 * carries `used` (from the terminal checkpoint), the granted `cap`,
 * `extensionsGranted`, and `finalizationWindowEntered` whenever the
 * invocation journaled at least one such decision. Every other field
 * (unitsUsed/unitsMax, noticesFired, finalizationReserveUsed, limiter,
 * and the cap of a grant-free run) is live-only fidelity, exactly like
 * transportRetries, and stays absent on replay.
 */
export interface ToolBudgetSummary {
  /** Executed tool calls (the loop's own counter). */
  used: number;
  /**
   * The effective executed-call cap at the end: maxToolCalls plus every
   * granted extension. Absent when only toolUnits bounds the loop.
   */
  cap?: number;
  /** Weighted units spent; present when toolUnits is configured. */
  unitsUsed?: number;
  /** The weighted budget; present when toolUnits is configured. */
  unitsMax?: number;
  /**
   * Extension grants used, restored grants included; present exactly
   * when toolBudgetExtension is configured (RV301).
   */
  extensionsGranted?: number;
  /**
   * Notice thresholds (fractions of the cap) whose notices entered the
   * conversation; present when at least one fired.
   */
  noticesFired?: number[];
  /** Present and true when the finalization reserve summary turn ran. */
  finalizationReserveUsed?: boolean;
  /**
   * Present and true when the finalization window activated at least
   * once this invocation (RV302).
   */
  finalizationWindowEntered?: boolean;
  /** The tool budget limiter that ended the loop, on that 'limit' only. */
  limiter?: 'maxToolCalls' | 'toolUnits';
}

/**
 * How an event's `costUsd` was folded (RV702). `'per-call'`: the sum of
 * each provider request priced individually, the same basis the settled
 * CostReport and invoice use (RV504), so a nonlinear long-context tier
 * fires per REQUEST. `'aggregate-estimate'`: the aggregate usage priced
 * in one call, which a tier can inflate past what any single request
 * cost; emitted only when per-request records cannot cover the number
 * (a checkpoint written before the reconciliation ledger shipped, or a
 * terminal entry whose records do not cover its usage). An absent field
 * on an event stream recorded before RV702 means the aggregate basis.
 */
export type CostBasis = 'per-call' | 'aggregate-estimate';

/**
 * Agent lifecycle. One logical agent dispatch emits EXACTLY ONE
 * `agent:start`/`agent:end` pair on its span (the start carries the
 * primary role), and each model invocation phase inside the span
 * (`loop`, then possibly `summarize` activations, `finalize`,
 * `extract`) emits its own `agent:phase:start`/`agent:phase:end` pair,
 * so durations, per-phase usage, and attempts are derivable without
 * heuristics (the RV-207 event-model contract; before it, every phase
 * emitted an unpaired extra `agent:start` and consumers pairing starts
 * with the single end computed the LAST phase's duration as the
 * agent's). `reduceInvocationTable` is the official reducer over this
 * vocabulary.
 */
export type AgentEvents =
  | { type: 'agent:queued'; agentType: string; label?: string }
  | { type: 'agent:start'; agentType: string; label?: string; model: string; role: string }
  | {
      type: 'agent:phase:start';
      agentType: string;
      label?: string;
      /** The invocation role this phase activation runs as. */
      role: string;
      /** The model the activation resolved to (fallbacks may serve another; the end event reports the server). */
      model: string;
      /**
       * 1-based activation ordinal within the span, unique per
       * activation (a summarize that fires three times gets three
       * pairs). Key phases by (spanId, invocation).
       */
      invocation: number;
    }
  | {
      type: 'agent:phase:end';
      agentType: string;
      label?: string;
      role: string;
      /** The model that actually served the activation's last attempt. */
      model: string;
      invocation: number;
      /**
       * Wall-clock activation duration. Live telemetry only: replayed
       * phase pairs (reconstructed from the terminal entry's usage
       * slices) carry 0.
       */
      durationMs: number;
      /** The usage this activation added to its (role, model) slices. */
      usage: Usage;
      /** That usage priced at each serving model's own rate. */
      costUsd: number;
      /**
       * The fold behind `costUsd` (RV702). Live phase deltas are always
       * per-call (every slice a live activation adds is backed by a
       * recorded provider call); a replayed pair says 'aggregate-estimate'
       * exactly when its model's records do not cover its usage. Absent
       * on streams recorded before RV702, which priced the aggregate.
       */
      costBasis?: CostBasis;
      outcome: 'ok' | 'error';
      /**
       * Transport retries inside this activation. Present only when
       * greater than zero; live telemetry only (absent on replay).
       */
      retries?: number;
    }
  | {
      type: 'agent:end';
      agentType: string;
      label?: string;
      status: string;
      usage: Usage;
      costUsd: number;
      /**
       * The fold behind `costUsd` (RV702): 'per-call' when every usage
       * slice of the invocation (restored included) is covered by
       * per-request records priced individually, the settled fold's own
       * basis; 'aggregate-estimate' when it is not (the aggregate number
       * is kept so restored spend is never silently dropped, and labeled
       * so it is never mistaken for the per-request fold). Absent on
       * streams recorded before RV702, which priced the aggregate.
       */
      costBasis?: CostBasis;
      entryRef: number;
      /**
       * Present and true when this agent's usage is approximate rather
       * than reported by the provider (the turn was cut by a transport
       * failure, a ceiling that severed the stream, or an abort). Absent
       * means the provider reported the usage exactly. Mirrors the
       * terminal journal entry's usageApprox.
       */
      usageApprox?: boolean;
      /**
       * Total transport retries across the span's activations. Present
       * only when greater than zero; live telemetry only, never
       * journaled, so a replayed agent:end omits it (absent means "zero
       * or unknown").
       */
      retryCount?: number;
      /**
       * The exploration guard counters (RV-210). Present live whenever
       * any exploration guard limit was configured for the invocation;
       * on replay present only when the guard abort journaled it in the
       * terminal error payload.
       */
      exploration?: ExplorationSummary;
      /**
       * The tool budget pressure snapshot (RV304). Present live whenever
       * a tool budget limiter or the extension was configured; live
       * telemetry only, absent on replay.
       */
      toolBudget?: ToolBudgetSummary;
    }
  | { type: 'agent:error'; agentType: string; label?: string; error: WireError; willRetry: boolean }
  /**
   * A recoverable pre-wire quota wait (RV1810): the shared limiter
   * denied a window and the dispatch will retry after the wait. This
   * is healthy throttling, not failure: it produces no provider
   * attempt, no ledger row, and no transport retry, and it used to
   * ride `agent:error` (data.source 'quota-limiter'), where naive
   * alerting on the event TYPE read a failing run out of a clean one.
   * Terminal denial exhaustion still ends in a real `agent:error`;
   * `createEngine({ telemetry: { quotaDeniedAgentError: true } })`
   * restores the legacy twin for consumers keyed to the old type.
   */
  | {
      type: 'quota:denied';
      agentType: string;
      label?: string;
      /** The denied model ref. */
      model?: string;
      /** The limiter's reason ('tokensPerMinute 1800000 exhausted'). */
      reason?: string;
      retryAfterMs?: number;
      willRetry: true;
    }
  /**
   * A transient in-flight exposure refusal on a waiting dispatch: the
   * turn's worst-case estimate did not fit `maxInFlightExposureUsd`
   * beside the live dispatches, so the invocation parks until a hold
   * releases and then retries, exactly the transient semantics the
   * budgets guide promises. Healthy backpressure, not failure: no
   * provider attempt, no ledger row, no journal entry. `scope` names
   * the waiting party: 'root' is the orchestrate-owned root dispatch
   * (RV1902), 'child' an orchestrator-spawned child (RV2002; the
   * third parity rerun terminally killed three mid-research workers
   * where this event now fires). `willWait: false` names the drained
   * arm: nothing is left to wait out (no live hold), so the refusal
   * is terminal for the turn; the root settles its documented
   * forced-finish partial, a child dies as the typed cheap
   * 'exposure-drained' refusal the orchestrator can re-spawn. Plain
   * agents outside the orchestration never emit this: they keep the
   * documented settle-as-budget-error behavior.
   */
  | {
      type: 'budget:exposure-wait';
      agentType: string;
      label?: string;
      /** The waiting party: the orchestrate root or a spawned child. */
      scope?: 'root' | 'child';
      /** The refused model ref. */
      model?: string;
      /** The refusal arithmetic, verbatim from the typed refusal. */
      capUsd?: number;
      spentUsd?: number;
      inFlightUsd?: number;
      estimateUsd?: number;
      willWait: boolean;
    }
  | { type: 'agent:schema-retry'; agentType: string; attempt: number; maxAttempts: number }
  /**
   * Non-billable control egress (RV1804): a provider request that is
   * not a model dispatch and lands in no invoice row, today exactly the
   * admission countTokens probe (which carries the FULL child prompt).
   * 'ok' names a counted probe, 'failed' a probe the provider refused
   * (the flat reserve admits instead), 'denied' a probe the configured
   * countTokens policy stopped before it left the process. Live
   * telemetry only, never journaled.
   */
  | {
      type: 'control:wire';
      controlKind: 'countTokens';
      model: string;
      outcome: 'ok' | 'failed' | 'denied';
      inputTokens?: number;
    }
  /** Emitted only when the call opts into streaming; never journaled, never re-emitted. */
  | { type: 'agent:stream'; delta: string };

/** Tool lifecycle (emitters arrive with the tool system, M3). */
export type ToolEvents =
  | {
      type: 'tool:start';
      toolName: string;
      /**
       * The model-minted id of this tool call (RV908): the same id the
       * journal's messages and tool-result parts carry, so a consumer
       * pairs start and end EXACTLY even among concurrent same-name
       * calls, instead of FIFO-guessing by (spanId, toolName). Present
       * on every live event this engine emits, and on every replayed
       * reconstruction (whose events exist only when the turn
       * checkpoint blob is retrievable; the id rides the checkpoint's
       * tool-result parts, so even journals written before RV908 name
       * their calls there). Absent only on streams recorded before
       * RV908 or written by foreign emitters, where consumers keep
       * their historical pairing.
       */
      toolCallId?: string;
      risk?: Json;
    }
  | {
      type: 'tool:end';
      toolName: string;
      /** The same call id as the matching tool:start (RV908). */
      toolCallId?: string;
      outcome: 'ok' | 'error' | 'denied';
      durationMs: number;
      /**
       * Audit fields (M5-T05): the chain verdict,
       * the deciding layer, the matched rule, and advisory domain-rule
       * matches. Telemetry, never identity; ask verdicts additionally
       * journal as suspended approvals.
       */
      verdict?: 'allow' | 'deny' | 'ask';
      decidedBy?: string;
      rule?: Json;
      advisory?: Json;
      /**
       * Present when an engine guard, not the permission chain, denied
       * the call: the exploration guards (RV-210) or the finalization
       * window (RV302). The outcome is 'denied' and the call was never
       * dispatched.
       */
      guard?: 'repeated-signature' | 'per-tool-cap' | 'finalization-window';
      /**
       * The structured failure reason on outcome 'error' (RV1807), so
       * public telemetry distinguishes a not-settled child read from a
       * genuine failure without the private transcript. Engine-stamped
       * literals include 'unknown-tool', 'invalid-arguments',
       * 'model-retry', 'non-serializable-result',
       * 'executor-unregistered', 'unknown-handle', 'child-not-settled',
       * and 'unknown-artifact'; a tool that throws a RulvarError
       * carrying `data.errorCode` surfaces that string, a bare
       * RulvarError surfaces its coarse code class, and anything else
       * stays reasonless. Telemetry, never identity.
       */
      errorCode?: string;
    };

/**
 * Bare-nondeterminism detection (RV-209). Emitted LIVE by the segment
 * that observed the call, at most once per (category, provenance) per
 * execution segment; never journaled and never re-emitted with the
 * `replayed` flag. Because replay re-executes the workflow body, a
 * violation that survives in the code fires again on every replay of
 * the run, so the event appears organically in both live and replayed
 * streams. Exempt provenances (installed dependencies under
 * node_modules and Node runtime frames) never emit: they are
 * classified and silenced, which is what keeps an SDK's internal
 * `Math.random()` from branding the run nondeterministic.
 */
export type DeterminismEvents = {
  type: 'determinism:warning';
  /** Which patched global fired. */
  category: 'bare-date-now' | 'bare-math-random';
  /**
   * 'workflow': the caller is workflow-origin code (the violation the
   * guard exists for; rejects the run under `determinism.mode:
   * 'error'`). 'allowlisted': the caller matched a configured
   * `determinism.allowlist` pattern and is exempt by explicit host
   * decision; emitted for visibility, never rejects.
   */
  provenance: 'workflow' | 'allowlisted';
  /** The calling stack frame, after the configured redaction hook. */
  frame: string;
  /** Parsed location when the frame carries one, after redaction. */
  file?: string;
  line?: number;
  column?: number;
};

/**
 * Adaptive orchestration, resolutions, and
 * accounting: emitted only by runs where the corresponding machinery is
 * active (applicability per mode:
 * https://docs.rulvar.com/guide/adaptive-orchestration). The types land as
 * one closed catalog with M7-T03; emitters arrive with their tasks.
 */
export type AdaptiveEvents =
  | {
      type: 'plan:revised';
      entryRef: number;
      planHash: string;
      applied: number;
      dropped: number;
      revisionUnitsRemaining: number;
    }
  | { type: 'node:parked'; nodeId: string; logicalTaskId: string }
  | { type: 'node:cancelled'; nodeId: string; logicalTaskId: string }
  | {
      type: 'node:linked';
      nodeId: string;
      logicalTaskId: string;
      donorRef: number;
      reclaimedUsd: number;
    }
  | {
      type: 'orchestrator:woke';
      digestSeq: number;
      planHash: string;
      coversToOrdinal: number;
      renderSize: number;
    }
  | {
      /**
       * Two emitted shapes share the discriminant: the cap-freeze form
       * carries { atCap: true, spentUsd, capUsd, finalizeReserveUsd },
       * and the per-wake digest form carries atCap plus the passive
       * WakeBudgetBlock fields (runSpentUsd .. softWarning).
       */
      type: 'orchestrator:budget';
      atCap: boolean;
      spentUsd?: number;
      capUsd?: number;
      finalizeReserveUsd?: number;
      runSpentUsd?: number;
      runCeilingUsd?: number;
      orchestratorSpentUsd?: number;
      orchestratorCapUsd?: number;
      orchestratorShare?: number;
      softWarning?: boolean;
    }
  /**
   * The acceptance verdict as its own event (RV1906): the four-role
   * benchmark's primary run showed a root `agent:end` with status ok
   * followed by a `run:end` error, semantically consistent (the loop
   * finished; the policy rejected the roster) but self-explanatory to
   * nobody tailing the stream. The verdict now speaks between them,
   * fresh and on the resume roll-forward alike, carrying the policy
   * facts of the ONE journaled acceptance decision.
   */
  | {
      type: 'orchestrator:acceptance';
      verdict: 'accepted' | 'rejected';
      completion: 'complete' | 'partial' | 'rejected';
      childStatusCounts: Record<string, number>;
      minSpawnedChildren?: number;
      spawnedChildren?: number;
    }
  | {
      type: 'escalation:raised';
      entryRef: number;
      kind: 'scope_bigger' | 'scope_different' | 'blocked_with_evidence';
      logicalTaskId: string;
      costToDateUsd: number;
    }
  | {
      type: 'escalation:decided';
      entryRef: number;
      decision: 'retry' | 'decompose' | 'cancel' | 'accept';
      by: ResolutionBy;
      countsAgainstLimit: boolean;
    }
  | {
      type: 'spawn:admitted';
      entryRef: number;
      /** The admitting arms of the unified AdmitVerdict union. */
      verdict: 'admit' | 'reuse_full' | 'admit_graft';
      agentType: string;
      logicalTaskId: string;
      /**
       * Spawn-unit balance after the budget-layer debit. Present on
       * budget-layer admissions (the orchestrator spawn tools and
       * ctx.workflow children); absent on lineage-layer admissions
       * (ctx.agent roots), whose spawn-unit debit rides the dispatch
       * itself (v1.22.0 review P2-5).
       */
      spawnUnitsAfter?: number;
    }
  | {
      type: 'spawn:rejected';
      /**
       * The journaled admission decision entry; absent for the
       * pre-admission config gates (orchestrate maxSpawns), which
       * reject before anything is journaled.
       */
      entryRef?: number;
      code: string;
      agentType: string;
      logicalTaskId?: string;
    }
  | {
      type: 'verify:failed';
      entryRef: number;
      logicalTaskId: string;
      rung: number;
      gate: 'mechanical' | 'judge' | 'spot-check';
    }
  | {
      type: 'ledger:op';
      entryRef: number;
      op: 'brief_set' | 'fact_add' | 'fact_supersede' | 'lesson_add' | 'observation_add';
    }
  | { type: 'stall:detected'; logicalTaskId: string; stallStreak: number }
  | { type: 'guard:oscillation'; spawnKeyHash: string; oscillationCount: number; limit: number }
  | { type: 'resolution:applied'; targetRef: number; entryRef: number; by: ResolutionBy }
  | {
      type: 'resolution:superseded';
      targetRef: number;
      entryRef: number;
      supersededBy: number;
      reason: 'already_resolved' | 'target_abandoned';
    }
  | { type: 'termination:debit'; entryRef: number; counter: string; remaining: number; phi: number }
  | { type: 'termination:denied'; entryRef: number; counter: string; code: string }
  | { type: 'termination:config-drift'; field: string; frozenValue: Json; liveValue: Json }
  | {
      /**
       * Declared for hosts; not emitted today. The compatibility scan
       * runs strictly before a run's event stream exists, so the
       * refusal travels only as the typed JournalCompatibilityError
       * (which carries the same fields).
       */
      type: 'journal:compat';
      code: 'HASH_VERSION_TOO_OLD' | 'HASH_VERSION_TOO_NEW';
      found: number;
      window: [number, number];
    };

export type WorkflowEventBody =
  CoreEvents | AgentEvents | ToolEvents | DeterminismEvents | AdaptiveEvents;

/**
 * The envelope: seq is an independent per-run
 * telemetry counter, strictly increasing in emission order and DISTINCT
 * from JournalEntry.seq (never compare or join the two; entryRef fields
 * carry journal seqs explicitly). ts is wall clock, telemetry only.
 * replayed is true only on re-emitted journal-backed lifecycle events;
 * stream deltas are never re-emitted.
 */
export type WorkflowEvent = {
  runId: string;
  seq: number;
  ts: string;
  spanId: string;
  parentSpanId?: string;
  replayed?: boolean;
} & WorkflowEventBody;
