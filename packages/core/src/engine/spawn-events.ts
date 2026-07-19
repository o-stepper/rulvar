/**
 * The single formatter for spawn-admission telemetry (v1.22.0 review
 * P2-5): every admission boundary, the orchestrator spawn tools,
 * ctx.agent lineage admissions, and ctx.workflow child admissions,
 * emits `spawn:admitted` / `spawn:rejected` through these two helpers,
 * so no path can forget the event or drift on its fields. Recovered
 * (journal-replayed) decisions emit with the standard `replayed` marker
 * and are never presented as fresh live admissions.
 */
import type { WorkflowEventBody } from '../l0/events.js';

/** Structural sink: EventBus and the ctx-internal RunEventSink both fit. */
type SpawnEventSink = {
  emit(body: WorkflowEventBody, spanId: string, replayed?: boolean): unknown;
};

export function emitSpawnAdmitted(
  events: SpawnEventSink,
  input: {
    entryRef: number;
    verdict: 'admit' | 'reuse_full' | 'admit_graft';
    agentType: string;
    logicalTaskId: string;
    /** Absent on lineage-layer admissions (ctx.agent roots). */
    spawnUnitsAfter?: number;
    spanId: string;
    replayed?: boolean;
  },
): void {
  events.emit(
    {
      type: 'spawn:admitted',
      entryRef: input.entryRef,
      verdict: input.verdict,
      agentType: input.agentType,
      logicalTaskId: input.logicalTaskId,
      ...(input.spawnUnitsAfter === undefined ? {} : { spawnUnitsAfter: input.spawnUnitsAfter }),
    },
    input.spanId,
    input.replayed,
  );
}

export function emitSpawnRejected(
  events: SpawnEventSink,
  input: {
    /** Absent for pre-admission config gates (nothing journaled). */
    entryRef?: number;
    code: string;
    agentType: string;
    spanId: string;
    replayed?: boolean;
  },
): void {
  events.emit(
    {
      type: 'spawn:rejected',
      ...(input.entryRef === undefined ? {} : { entryRef: input.entryRef }),
      code: input.code,
      agentType: input.agentType,
    },
    input.spanId,
    input.replayed,
  );
}
