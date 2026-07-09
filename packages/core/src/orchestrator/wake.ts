/**
 * wait_for_events and the coalesced WakeDigest substrate (M6-T09).
 *
 * Owning spec: docs/07-adaptive-orchestration-spec.md, sections 4.8 and
 * 5; docs/10 scopes M6 to the SUBSTRATE fields (digestSeq,
 * coversToOrdinal, completedDigests, escalations); the termination,
 * budget, and reuse blocks land with their DEF owners in M7.
 *
 * Mechanics: the sleep is an ordinary DEF-4 suspension (the awaitExternal
 * machinery) keyed wake:<orchSeq>:<ordinal>; the wake is the closing
 * resolution whose value IS the digest, so a re-executed post-crash turn
 * reads exactly the same digest bytes (pinning), and replay never
 * rebuilds a digest. Trigger evaluation runs at arm time and on every
 * child settlement; when several triggers are ready at once, every ready
 * one submits its resolution attempt and the DEF-4 first-closing-wins
 * fold classifies the losers noop (the race cassette).
 */
import type { SchemaSpec } from '../l0/schema.js';
import type { TaskDigest } from './handles.js';

/** docs/07 4.8: the wait_for_events parameter schema (normative). */
export const WAIT_FOR_EVENTS_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['triggers'],
  properties: {
    triggers: {
      type: 'array',
      minItems: 1,
      items: {
        oneOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['kind'],
            properties: { kind: { const: 'quiescence' } },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['kind'],
            properties: {
              kind: { const: 'child_terminal' },
              handles: { type: 'array', items: { type: 'integer', minimum: 1 } },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['kind'],
            properties: { kind: { const: 'escalation' } },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['kind', 'percent'],
            properties: {
              kind: { const: 'budget_threshold' },
              percent: { enum: [50, 80] },
            },
          },
        ],
      },
    },
  },
};

export const WAIT_FOR_EVENTS_TOOL_NAME = 'wait_for_events';

/** The closed v1 trigger vocabulary (docs/07 4.8). */
export type WakeTrigger =
  | { kind: 'quiescence' }
  | { kind: 'child_terminal'; handles?: number[] }
  | { kind: 'escalation' }
  | { kind: 'budget_threshold'; percent: 50 | 80 };

/** docs/07 section 5: the escalation block of a digest. */
export interface EscalationDigest {
  nodeId: string;
  logicalTaskId: string;
  /** seq of the terminal escalated entry or the suspended escalate entry. */
  reportRef: number;
  kind: string;
  flavor: 'A' | 'B';
  /** Flavor B only. */
  deadlineAt?: string;
}

/** Passive budget visibility in every digest (DEF-7; docs/07, 12.5). */
export interface WakeBudgetBlock {
  runSpentUsd: number;
  runCeilingUsd: number;
  orchestratorSpentUsd: number;
  orchestratorCapUsd: number;
  finalizeReserveUsd: number;
  /** spent / max(runSpent, epsilon 0.01): the H-OrchShare input. */
  orchestratorShare: number;
  /** True at >= 0.8 x (cap - reserve); fixed in v1 (Appendix A). */
  softWarning: boolean;
}

/**
 * The FINAL normative WakeDigest (docs/07 section 5): one coordinated
 * schema change inside the hashVersion-2 profile (XF-12). The digest
 * render enters the content key of orchestrator turns. In runs without
 * the PlanRunner extension the termination, budget, and reuse blocks are
 * all-zero and planHash is empty, mirroring the CostReport convention.
 */
export interface WakeDigest {
  digestSeq: number;
  /** Plan hash at emission time ('' outside PlanRunner). */
  planHash: string;
  coversToOrdinal: number;
  /** Ordered by spawn ordinal, never wall-clock (coalescing rule). */
  completedDigests: TaskDigest[];
  /** Pending and newly decided reports. */
  escalations: EscalationDigest[];
  /** Mandatory (DEF-2). */
  termination: {
    revisionUnitsRemaining: number;
    spawnUnitsRemaining: number;
    perLineage: Record<string, { escalationUnitsRemaining: number; rungsRemaining: number }>;
    phi: number;
  };
  /** Mandatory (DEF-7). */
  budget: WakeBudgetBlock;
  /** Reuse and oscillation stats (DEF-5): the AbandonedSpendView shape. */
  reuse: {
    abandonedUsd: number;
    reclaimedUsd: number;
    netLostUsd: number;
    /** Per-SpawnKey rows (present under PlanRunner). */
    byKey?: Record<string, { abandonedUsd: number; reclaimedUsd: number }>;
  };
}

/** The all-zero blocks of runs without the PlanRunner extension. */
export function emptyDigestBlocks(): Pick<
  WakeDigest,
  'planHash' | 'termination' | 'budget' | 'reuse'
> {
  return {
    planHash: '',
    termination: { revisionUnitsRemaining: 0, spawnUnitsRemaining: 0, perLineage: {}, phi: 0 },
    budget: {
      runSpentUsd: 0,
      runCeilingUsd: 0,
      orchestratorSpentUsd: 0,
      orchestratorCapUsd: 0,
      finalizeReserveUsd: 0,
      orchestratorShare: 0,
      softWarning: false,
    },
    reuse: { abandonedUsd: 0, reclaimedUsd: 0, netLostUsd: 0 },
  };
}
