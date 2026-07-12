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

/** Agent lifecycle. */
export type AgentEvents =
  | { type: 'agent:queued'; agentType: string; label?: string }
  | { type: 'agent:start'; agentType: string; label?: string; model: string; role: string }
  | {
      type: 'agent:end';
      agentType: string;
      label?: string;
      status: string;
      usage: Usage;
      costUsd: number;
      entryRef: number;
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
      type: 'orchestrator:budget';
      entryRef: number;
      spentUsd: number;
      effectiveCapUsd: number;
      reserveUsedUsd: number;
      frozen: boolean;
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
      spawnUnitsAfter: number;
    }
  | {
      type: 'spawn:rejected';
      entryRef: number;
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
      type: 'journal:compat';
      code: 'HASH_VERSION_TOO_OLD' | 'HASH_VERSION_TOO_NEW';
      found: number;
      window: [number, number];
    };

export type WorkflowEventBody = CoreEvents | AgentEvents | ToolEvents | AdaptiveEvents;

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
