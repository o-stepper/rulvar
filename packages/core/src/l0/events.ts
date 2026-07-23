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
}

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
    }
  | { type: 'agent:error'; agentType: string; label?: string; error: WireError; willRetry: boolean }
  | { type: 'agent:schema-retry'; agentType: string; attempt: number; maxAttempts: number }
  /** Emitted only when the call opts into streaming; never journaled, never re-emitted. */
  | { type: 'agent:stream'; delta: string };

/** Tool lifecycle (emitters arrive with the tool system, M3). */
export type ToolEvents =
  | { type: 'tool:start'; toolName: string; risk?: Json }
  | {
      type: 'tool:end';
      toolName: string;
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
       * Present when an exploration guard (RV-210), not the permission
       * chain, denied the call: the outcome is 'denied' and the call was
       * never dispatched.
       */
      guard?: 'repeated-signature';
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
