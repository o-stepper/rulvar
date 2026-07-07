/**
 * WorkflowEvent: the single discriminated observability stream (M1-T10).
 *
 * Owning spec: docs/09-observability-testing-spec.md, section "Event
 * stream". Events are pure telemetry: no event, field, or ordering
 * participates in journal identity, and dropping every event MUST NOT
 * change any run outcome. The catalog is closed for v1; the adaptive-
 * orchestration variants (plan:revised, orchestrator:woke, ...) join this
 * union with their payload types in M2/M7. Consumers MUST tolerate unknown
 * fields and unknown event types.
 */
import type { Json } from './json.js';
import type { Usage } from './messages.js';
import type { WireError } from './errors.js';

/** docs/09 section 1.4, run lifecycle and core telemetry (M1 subset). */
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

/** docs/09 section 1.4, agent lifecycle. */
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

/** docs/09 section 1.4, tool lifecycle (emitters arrive with the tool system, M3). */
export type ToolEvents =
  | { type: 'tool:start'; toolName: string; risk?: Json }
  | {
      type: 'tool:end';
      toolName: string;
      outcome: 'ok' | 'error' | 'denied';
      durationMs: number;
      /**
       * Audit fields (docs/08, section 4.5; M5-T05): the chain verdict,
       * the deciding layer, the matched rule, and advisory domain-rule
       * matches. Telemetry, never identity; ask verdicts additionally
       * journal as suspended approvals.
       */
      verdict?: 'allow' | 'deny' | 'ask';
      decidedBy?: string;
      rule?: Json;
      advisory?: Json;
    };

export type WorkflowEventBody = CoreEvents | AgentEvents | ToolEvents;

/**
 * The envelope (docs/09 section 1.1): seq is an independent per-run
 * telemetry counter, strictly increasing in emission order and DISTINCT
 * from JournalEntry.seq (never compare or join the two; entryRef fields
 * carry journal seqs explicitly). ts is wall clock, telemetry only.
 * replayed is true only on re-emitted journal-backed lifecycle events
 * (docs/09 section 1.5); stream deltas are never re-emitted.
 */
export type WorkflowEvent = {
  runId: string;
  seq: number;
  ts: string;
  spanId: string;
  parentSpanId?: string;
  replayed?: boolean;
} & WorkflowEventBody;
