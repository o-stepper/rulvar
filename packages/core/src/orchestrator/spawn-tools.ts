/**
 * The mode (c) orchestrator toolset (M6-T07/T08).
 *
 * Docs: https://docs.rulvar.com/guide/adaptive-orchestration.
 * The JSON Schemas below are NORMATIVE: they
 * enter toolsetHash and therefore identity, so every field ships now
 * even where its semantics complete later (model_hint clamping and
 * lineage folds in M7). The execute callbacks close over the per-call
 * OrchestratorRuntime; nothing rides ToolContext (tools stay leaves,
 * invariant I3; the closures ARE the engine seam).
 *
 * M6 resolution notes: outputSchemaRef and
 * toolsetRef are accepted by schema but their registries land in M7;
 * using them today is a typed tool error, never a run failure.
 */
import type { SchemaSpec } from '../l0/schema.js';
import { tool } from '../tools/tool.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import type { OrchestratorRuntime } from './handles.js';
import { WAIT_FOR_EVENTS_SCHEMA, WAIT_FOR_EVENTS_TOOL_NAME } from './wake.js';

/** The spawn_agent parameter schema (normative). */
export const SPAWN_AGENT_SCHEMA: SchemaSpec = {
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
    lineage: {
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
    },
    taskClass: { type: 'string' },
  },
};

/** parallel_agents wraps the spawn_agent params. */
export const PARALLEL_AGENTS_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['tasks'],
  properties: {
    tasks: {
      type: 'array',
      minItems: 1,
      items: { $ref: '#/$defs/spawnAgentParams' },
    },
  },
  $defs: {
    spawnAgentParams: SPAWN_AGENT_SCHEMA as unknown as Record<string, unknown>,
  },
};

/** await_any and await_all share one parameter shape. */
export const AWAIT_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['handles'],
  properties: {
    handles: {
      type: 'array',
      minItems: 1,
      items: { type: 'integer', minimum: 1 },
    },
  },
};

/** The cancel_agent parameter schema. */
export const CANCEL_AGENT_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['handle'],
  properties: {
    handle: { type: 'integer', minimum: 1 },
    reason: { type: 'string' },
  },
};

/** finish; result validates against the declared output schema. */
export const FINISH_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['result'],
  properties: {
    result: {
      $comment:
        'validated against the declared output SchemaSpec of the orchestrate call; ' +
        'free-form JSON when none is declared',
    },
    summary: { type: 'string' },
  },
};

export const FINISH_TOOL_NAME = 'finish';

/** The spawn parameters as validated JSON (a TaskSpec subset). */
export interface SpawnAgentParams {
  agentType: string;
  prompt: string;
  outputSchemaRef?: string;
  toolsetRef?: string;
  budgetUsd?: number;
  model_hint?: { startTier?: number };
  approach?: string;
  lineage?: { continues: string; relation?: string; causeRef: number };
  taskClass?: string;
}

/**
 * Builds the mode (c) toolset over the per-call runtime. profileCardText
 * rides the spawn tools' descriptions so both modes speak one agent
 * vocabulary (M6-T04).
 */
export function buildOrchestratorTools(
  runtime: OrchestratorRuntime,
  profileCardText: string,
): ToolDef[] {
  const spawnAgent = tool({
    name: 'spawn_agent',
    description: `Admit and schedule one child agent. ${profileCardText}`,
    parameters: SPAWN_AGENT_SCHEMA,
    execute: (input) => runtime.spawn(input as SpawnAgentParams),
  });
  const parallelAgents = tool({
    name: 'parallel_agents',
    description: 'Admit and schedule several children at once (submission order).',
    parameters: PARALLEL_AGENTS_SCHEMA,
    execute: async (input) => {
      const tasks = (input as { tasks: SpawnAgentParams[] }).tasks;
      const handles: number[] = [];
      for (const task of tasks) {
        const spawned = await runtime.spawn(task);
        handles.push(spawned.handle);
      }
      return { handles };
    },
  });
  const awaitAny = tool({
    name: 'await_any',
    description: 'Wait for the FIRST of the handles to settle; returns its TaskDigest.',
    parameters: AWAIT_SCHEMA,
    execute: (input) => runtime.awaitAny((input as { handles: number[] }).handles),
  });
  const awaitAll = tool({
    name: 'await_all',
    description: 'Wait for ALL handles to settle; returns their TaskDigests in handle order.',
    parameters: AWAIT_SCHEMA,
    execute: (input) => runtime.awaitAll((input as { handles: number[] }).handles),
  });
  const cancelAgent = tool({
    name: 'cancel_agent',
    description:
      'Cancel an in-flight child. Cancellation is caller intent: the entry journals ' +
      'cancelled and reruns on a later resume unless covered by abandon (M7).',
    parameters: CANCEL_AGENT_SCHEMA,
    execute: (input) => {
      const params = input as { handle: number; reason?: string };
      return runtime.cancel(params.handle, params.reason);
    },
  });
  const waitForEvents = tool({
    name: WAIT_FOR_EVENTS_TOOL_NAME,
    description:
      'Sleep until a coalesced WakeDigest: quiescence (always armed), child_terminal, ' +
      'escalation, or budget_threshold at 50/80 percent. A trigger set that can never ' +
      'fire is a typed error.',
    parameters: WAIT_FOR_EVENTS_SCHEMA,
    execute: (input) => runtime.waitForEvents((input as { triggers: unknown }).triggers),
  });
  const finish = tool({
    name: FINISH_TOOL_NAME,
    description: 'Terminate the orchestration with a result (run outcome ok).',
    parameters: FINISH_SCHEMA,
    execute: () => {
      throw new Error('finish is intercepted by the agent runtime, never executed');
    },
  });
  return [spawnAgent, parallelAgents, awaitAny, awaitAll, cancelAgent, waitForEvents, finish];
}
