/**
 * The PlanRunner toolset (M7-T05): plan_view and plan_revise.
 *
 * The JSON Schemas below are NORMATIVE: they enter toolsetHash and
 * therefore identity. plan_view is a pure fold pinned to the last
 * WakeDigest (never a live read; a re-executed wake turn reads its
 * original snapshot); plan_revise is the typed PlanOp diff with
 * auto-rebase (M7-T04), whose tool result renders deterministically from
 * the journaled entry.
 */
import { tool } from '@rulvar/core';
import type {
  Json,
  LineageStats,
  NodeId,
  SchemaSpec,
  TerminationAccountSnapshot,
  ToolDef,
} from '@rulvar/core';
import type { PlanNodeStatus } from './plan-state.js';
import type { PlanReviseRequest, PlanReviseResult } from './plan-entries.js';
import type { LedgerOp, LedgerView } from './ledger.js';

/** plan_view takes no parameters. */
export const PLAN_VIEW_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {},
};

/** The taskSpec projection shared with spawn_agent. */
const TASK_SPEC_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['agentType', 'prompt'],
  properties: {
    agentType: { type: 'string' },
    prompt: { type: 'string' },
    outputSchemaRef: { type: 'string' },
    toolsetRef: { type: 'string' },
    budgetUsd: { type: 'number', exclusiveMinimum: 0 },
    model_hint: {
      type: 'object',
      additionalProperties: false,
      properties: { startTier: { type: 'integer', minimum: 0 } },
    },
    approach: { type: 'string', maxLength: 64 },
    taskClass: { type: 'string' },
  },
};

/** Partial<TaskSpec> for amend_task. */
const TASK_SPEC_PATCH_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: TASK_SPEC_SCHEMA.properties ?? {},
};

/** The lineage block of add_task. */
const LINEAGE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['continues', 'causeRef'],
  properties: {
    continues: { type: 'string', description: 'LogicalTaskId to continue' },
    relation: { enum: ['respawn', 'rung-retry', 'decompose-child', 'unpark-restart'] },
    causeRef: {
      type: 'integer',
      minimum: 1,
      description: 'seq of the journal entry that caused the rebirth',
    },
  },
};

/** The plan_revise parameter schema (normative). */
export const PLAN_REVISE_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['base', 'ops', 'rationale'],
  properties: {
    base: {
      type: 'object',
      additionalProperties: false,
      required: ['digestSeq', 'planHash'],
      properties: {
        digestSeq: { type: 'integer', minimum: 0 },
        planHash: { type: 'string' },
      },
    },
    ops: { type: 'array', minItems: 1, items: { $ref: '#/$defs/planOp' } },
    rationale: { type: 'string' },
  },
  $defs: {
    taskSpec: TASK_SPEC_SCHEMA,
    taskSpecPatch: TASK_SPEC_PATCH_SCHEMA,
    lineage: LINEAGE_SCHEMA,
    planOp: {
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'spec'],
          properties: {
            op: { const: 'add_task' },
            spec: { $ref: '#/$defs/taskSpec' },
            deps: { type: 'array', items: { type: 'string' } },
            priority: { type: 'number' },
            lineage: { $ref: '#/$defs/lineage' },
            approach: { type: 'string', maxLength: 64 },
            fresh: { type: 'boolean', default: false },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'nodeId', 'spec'],
          properties: {
            op: { const: 'amend_task' },
            nodeId: { type: 'string' },
            spec: { $ref: '#/$defs/taskSpecPatch' },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'nodeId'],
          properties: { op: { const: 'park_task' }, nodeId: { type: 'string' } },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'nodeId'],
          properties: { op: { const: 'unpark_task' }, nodeId: { type: 'string' } },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'nodeId'],
          properties: {
            op: { const: 'cancel_task' },
            nodeId: { type: 'string' },
            reason: { type: 'string' },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'nodeId', 'priority'],
          properties: {
            op: { const: 'reprioritize' },
            nodeId: { type: 'string' },
            priority: { type: 'number' },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'nodeId', 'deps'],
          properties: {
            op: { const: 'rewire_deps' },
            nodeId: { type: 'string' },
            deps: { type: 'array', items: { type: 'string' } },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'nodeId', 'dep'],
          properties: {
            op: { const: 'waive_dep' },
            nodeId: { type: 'string' },
            dep: { type: 'string' },
          },
        },
      ],
    },
  },
};

export const PLAN_VIEW_TOOL_NAME = 'plan_view';
export const PLAN_REVISE_TOOL_NAME = 'plan_revise';
export const LEDGER_APPEND_TOOL_NAME = 'ledger_append';
export const LEDGER_READ_TOOL_NAME = 'ledger_read';

/** The closed authored op vocabulary as JSON Schema. */
export const LEDGER_APPEND_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['op'],
  properties: {
    op: {
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'text'],
          properties: { op: { const: 'brief_set' }, text: { type: 'string' } },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'factId', 'text', 'provenance', 'confidence'],
          properties: {
            op: { const: 'fact_add' },
            factId: { type: 'string' },
            text: { type: 'string' },
            provenance: { type: 'array', items: { type: 'integer', minimum: 1 } },
            confidence: { enum: ['low', 'medium', 'high'] },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'factId', 'supersededBy', 'text', 'provenance', 'confidence'],
          properties: {
            op: { const: 'fact_supersede' },
            factId: { type: 'string' },
            supersededBy: { type: 'string' },
            text: { type: 'string' },
            provenance: { type: 'array', items: { type: 'integer', minimum: 1 } },
            confidence: { enum: ['low', 'medium', 'high'] },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'key', 'text'],
          properties: {
            op: { const: 'lesson_add' },
            key: {
              type: 'object',
              additionalProperties: false,
              required: ['logicalTaskId', 'approachSig'],
              properties: {
                logicalTaskId: { type: 'string' },
                approachSig: { type: 'string' },
              },
            },
            text: { type: 'string' },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'taskClass', 'logicalTaskId', 'note', 'evidenceRefs'],
          properties: {
            op: { const: 'observation_add' },
            taskClass: { type: 'string' },
            logicalTaskId: { type: 'string' },
            tierObserved: { type: 'integer', minimum: 0 },
            outcomeClass: { type: 'string' },
            note: { type: 'string', maxLength: 200 },
            evidenceRefs: { type: 'array', items: { type: 'integer', minimum: 1 } },
          },
        },
      ],
    },
  },
};

/** ledger_read takes no parameters and pins to the turn snapshot. */
export const LEDGER_READ_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {},
};

export const KB_PROPOSE_TOOL_NAME = 'kb_propose';

/**
 * The normative kb_propose schema (phase 3). The subject is
 * tier-relative: the orchestrator never sees model names, so the
 * handler resolves the rung index against the declared ladder of the
 * referenced lineage into the concrete KbProposal subject.
 */
export const KB_PROPOSE_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['subject', 'taskClass', 'polarity', 'trigger'],
  properties: {
    subject: {
      type: 'object',
      additionalProperties: false,
      required: ['tier'],
      properties: { tier: { type: 'integer', minimum: 0 } },
    },
    taskClass: { type: 'string' },
    polarity: { enum: ['strength', 'weakness'] },
    trigger: {
      enum: ['error', 'limit', 'schema-exhausted', 'verify-failed', 'no-progress', 'escalation'],
    },
    logicalTaskId: { type: 'string' },
    note: { type: 'string', maxLength: 200 },
    evidenceRefs: { type: 'array', items: { type: 'integer', minimum: 1 } },
  },
};

/** The model-facing kb_propose payload (tier-relative subject). */
export interface KbProposeInput {
  subject: { tier: number };
  taskClass: string;
  polarity: 'strength' | 'weakness';
  trigger: 'error' | 'limit' | 'schema-exhausted' | 'verify-failed' | 'no-progress' | 'escalation';
  logicalTaskId?: string;
  note?: string;
  evidenceRefs?: number[];
}

/** One rendered node of the pinned plan_view fold. */
export interface PlanViewNode {
  nodeId: NodeId;
  logicalTaskId: string;
  status: PlanNodeStatus;
  deps: NodeId[];
  waivedDeps: NodeId[];
  priority: number;
  lineage?: LineageStats;
}

/** The plan_view render: plan state, lineage, termination, reuse. */
export interface PlanViewRender {
  planHash: string;
  revisionCount: number;
  droppedRevisionStreak: number;
  nodes: PlanViewNode[];
  termination: TerminationAccountSnapshot;
  /** The abandoned-spend ledger (DEF-5); zeros until M7-T07 activates it. */
  abandonedSpend: { abandonedUsd: number; reclaimedUsd: number; netLostUsd: number };
  /** RevisionGuards state (M7-T06). */
  guards?: {
    engaged?: 'reject-revision' | 'finish-with-partial' | 'fail-run';
    frozenSignatures: string[];
    stallReplansUsed: number;
  };
}

/** The engine seam the plan tools close over. */
export interface PlanToolRuntime {
  planView(): PlanViewRender;
  planRevise(request: PlanReviseRequest): Promise<PlanReviseResult>;
  ledgerAppend(op: LedgerOp): Promise<{ entryRef: number }>;
  ledgerRead(): LedgerView;
  /**
   * Phase 3 opt-in: resolves the tier-relative payload into a concrete
   * KbProposal and journals it as the observation_add ledger.op. Absent
   * unless the run opted into kb_propose.
   */
  kbPropose?(input: KbProposeInput): Promise<{ entryRef: number }>;
}

/** Builds the PlanRunner tools (appended to the mode (c) toolset). */
export function buildPlanTools(runtime: PlanToolRuntime): ToolDef[] {
  const planView = tool({
    name: PLAN_VIEW_TOOL_NAME,
    description:
      'Render the task plan: nodes with statuses, dependencies, lineage stats, the ' +
      'termination account, and abandoned spend. A pure fold pinned to the last ' +
      'WakeDigest; pass its planHash as plan_revise base.',
    parameters: PLAN_VIEW_SCHEMA,
    execute: () => Promise.resolve(runtime.planView() as unknown as Json),
  });
  const planRevise = tool({
    name: PLAN_REVISE_TOOL_NAME,
    description:
      'Revise the task plan with typed ops (add_task, amend_task, park_task, ' +
      'unpark_task, cancel_task, reprioritize, rewire_deps, waive_dep). The base pair ' +
      '{digestSeq, planHash} comes from your last wake; conflicts rebase against the ' +
      'live plan and each op lands applied, transformed, or dropped with a reason.',
    parameters: PLAN_REVISE_SCHEMA,
    execute: (input) => runtime.planRevise(input as PlanReviseRequest),
  });
  const ledgerAppend = tool({
    name: LEDGER_APPEND_TOOL_NAME,
    description:
      'Append ONE authored RunLedger op: brief_set (once), fact_add, fact_supersede, ' +
      'lesson_add (key = logicalTaskId + approachSig of a journaled attempt), or ' +
      'observation_add. The ledger is advisory; the journal always wins.',
    parameters: LEDGER_APPEND_SCHEMA,
    execute: (input) => runtime.ledgerAppend((input as { op: LedgerOp }).op),
  });
  const ledgerRead = tool({
    name: LEDGER_READ_TOOL_NAME,
    // The description stays byte-identical to the pre-phase-3 wording:
    // it enters toolsetHash, and changing it would re-key every
    // recorded plan-mode run.
    description:
      'Read the RunLedger render pinned to this turn snapshot: brief, facts, lessons, ' +
      'observations, revision history, task digests, and the world-delta index.',
    parameters: LEDGER_READ_SCHEMA,
    execute: () => {
      // Absolute quarantine: modelObservations render into NO prompt of
      // any run before the human gate, the proposing orchestrator's own
      // later turns included. The count-only line appears exactly when
      // observations exist, so observation-free renders stay
      // byte-identical to the pre-quarantine shape.
      const view = runtime.ledgerRead();
      const withheld = view.observations.length;
      const rendered: Json = {
        ...(view as unknown as Record<string, Json>),
        observations: [],
        ...(withheld > 0 ? { observationsWithheld: withheld } : {}),
      };
      return Promise.resolve(rendered);
    },
  });
  const tools = [planView, planRevise, ledgerAppend, ledgerRead];
  const kbPropose = runtime.kbPropose?.bind(runtime);
  if (kbPropose !== undefined) {
    tools.push(
      tool({
        name: KB_PROPOSE_TOOL_NAME,
        description:
          'Propose ONE model-knowledge observation about a ladder tier of a journaled ' +
          'lineage (subject is tier-relative; logicalTaskId is required to resolve it). ' +
          'The proposal is quarantined until a human gates it after the run: it renders ' +
          'into no prompt and commits nothing. Evidence refs must be decision entry seqs ' +
          'of this run.',
        parameters: KB_PROPOSE_SCHEMA,
        execute: (input) => kbPropose(input as KbProposeInput),
      }),
    );
  }
  return tools;
}
