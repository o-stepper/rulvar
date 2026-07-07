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
  /** seq of the terminal escalated entry. */
  reportRef: number;
  kind: string;
  flavor: 'A' | 'B';
}

/**
 * The M6 substrate WakeDigest (docs/07 section 5; the termination,
 * budget, and reuse blocks complete the shape in M7 as one coordinated
 * hashVersion-2 change).
 */
export interface WakeDigest {
  digestSeq: number;
  coversToOrdinal: number;
  completedDigests: TaskDigest[];
  escalations: EscalationDigest[];
}
