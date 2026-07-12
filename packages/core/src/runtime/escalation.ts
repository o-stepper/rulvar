/**
 * EscalationProtocol producers (M3-T07/M3-T09): the flagged BREAKING
 * change of v0.4.0. Typed feedback from a running agent to the owner of
 * the parent scope; nodes only propose, they never spawn. Flavor A
 * (default): the worker terminates with terminal status 'escalated'
 * carrying a schema-validated EscalationReport. Flavor B (opt-in): the
 * escalate tool suspends the agent on the existing suspension machinery
 * with a journaled deadline; a timeout is a resolution by 'timeout'
 * applying the defaultDecision, first-closing-wins.
 *
 * costToDate and salvage are filled by the RUNTIME, never the model;
 * model-authored values are rejected at validation (the request schema
 * closes over additionalProperties). The report is validated BEFORE
 * append. Status production is gated by opt-in: an agent spawned without
 * escalation config physically cannot return 'escalated'.
 *
 * Full protocol: https://docs.rulvar.com/guide/adaptive-orchestration.
 */
import type { Issue } from '../l0/errors.js';
import type { Json } from '../l0/json.js';
import type { JsonSchema } from '../l0/messages.js';
import { validateSchemaSpec } from '../l0/schema.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import { tool } from '../tools/tool.js';

/** Closed in v1. */
export type EscalationKind = 'scope_bigger' | 'scope_different' | 'blocked_with_evidence';

/**
 * Minimal TaskSpec stand-in: the full typed TaskSpec is owned by the
 * PlanRunner surface and ships with M7; script
 * modes carry proposals opaquely until then.
 */
export type TaskSpec = Json;

export interface EscalationReport {
  kind: EscalationKind;
  scopeDelta: string;
  revisedEstimate: { usd: number; turns: number };
  blockers: string[];
  proposedDecomposition: TaskSpec[];
  /** Runtime-filled; model-authored values are rejected at validation. */
  costToDate: { usd: number; turns: number };
  /** Runtime-filled; model-authored values are rejected at validation. */
  salvage: { transcriptRef: string; artifacts: string[]; worktreePatchRef?: string };
}

export type EscalationDecision =
  | { kind: 'retry'; amendedPrompt?: string; startTier?: number }
  | { kind: 'decompose'; children: TaskSpec[] }
  | { kind: 'cancel'; reason?: string }
  | { kind: 'accept'; note?: string };

export interface EscalationOptions {
  /** Default 'A'. */
  flavor?: 'A' | 'B';
  /** Flavor B suspension deadline; REQUIRED for flavor B (Appendix A). */
  deadlineMs?: number;
  /** Applied by the timeout resolution (by: 'timeout'); default accept. */
  defaultDecision?: EscalationDecision;
  /** In-run minimum spend before scope_bigger; default 0 (M3-T09). */
  minSpendUsd?: number;
}

/** The model-facing request: the report minus the runtime-filled fields. */
export interface EscalationRequest {
  kind: EscalationKind;
  scopeDelta: string;
  revisedEstimate: { usd: number; turns: number };
  blockers?: string[];
  proposedDecomposition?: TaskSpec[];
}

export const ESCALATE_TOOL_NAME = 'escalate';

/**
 * The escalate tool's exact request schema. costToDate and salvage
 * MUST NOT appear here: additionalProperties false rejects model-authored
 * values for them at argument validation.
 */
export const ESCALATION_REQUEST_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'scopeDelta', 'revisedEstimate'],
  properties: {
    kind: { enum: ['scope_bigger', 'scope_different', 'blocked_with_evidence'] },
    scopeDelta: { type: 'string' },
    revisedEstimate: {
      type: 'object',
      additionalProperties: false,
      required: ['usd', 'turns'],
      properties: {
        usd: { type: 'number', minimum: 0 },
        turns: { type: 'integer', minimum: 0 },
      },
    },
    blockers: { type: 'array', items: { type: 'string' } },
    proposedDecomposition: { type: 'array', items: { type: 'object' } },
  },
};

/** The full-report schema applied BEFORE append. */
export const ESCALATION_REPORT_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'kind',
    'scopeDelta',
    'revisedEstimate',
    'blockers',
    'proposedDecomposition',
    'costToDate',
    'salvage',
  ],
  properties: {
    kind: { enum: ['scope_bigger', 'scope_different', 'blocked_with_evidence'] },
    scopeDelta: { type: 'string' },
    revisedEstimate: {
      type: 'object',
      additionalProperties: false,
      required: ['usd', 'turns'],
      properties: {
        usd: { type: 'number', minimum: 0 },
        turns: { type: 'integer', minimum: 0 },
      },
    },
    blockers: { type: 'array', items: { type: 'string' } },
    proposedDecomposition: { type: 'array', items: { type: 'object' } },
    costToDate: {
      type: 'object',
      additionalProperties: false,
      required: ['usd', 'turns'],
      properties: { usd: { type: 'number' }, turns: { type: 'integer', minimum: 0 } },
    },
    salvage: {
      type: 'object',
      additionalProperties: false,
      required: ['transcriptRef', 'artifacts'],
      properties: {
        transcriptRef: { type: 'string' },
        artifacts: { type: 'array', items: { type: 'string' } },
        worktreePatchRef: { type: 'string' },
      },
    },
  },
};

/**
 * The engine opt-in tool: registered through the
 * same path as any tool under escalation opt-in of EITHER flavor (the
 * worker's only authoring channel for a report), never available without
 * opt-in, and dispatched through the same permission chain. The loop
 * intercepts accepted calls; execute is unreachable by construction.
 */
export function escalateTool(): ToolDef {
  return tool({
    name: ESCALATE_TOOL_NAME,
    description:
      'Escalate to the owner of this task: the scope is bigger than estimated, materially ' +
      'different, or blocked with evidence. Escalating ends your turn loop; include ' +
      'everything the owner needs to decide.',
    parameters: ESCALATION_REQUEST_SCHEMA,
    execute: () => {
      throw new Error('escalate is intercepted by the agent runtime, never executed');
    },
  });
}

/** Validates the runtime-completed report BEFORE append; returns issues. */
export async function validateEscalationReport(report: EscalationReport): Promise<Issue[]> {
  const validation = await validateSchemaSpec(ESCALATION_REPORT_SCHEMA, report);
  return validation.valid ? [] : validation.issues;
}

/**
 * countsAgainstLimit derivation (XF-06): true iff
 * scope_bigger; scope_different and blocked_with_evidence are exempt and
 * never debit the escalation counter.
 */
export function countsAgainstLimit(kind: EscalationKind): boolean {
  return kind === 'scope_bigger';
}
