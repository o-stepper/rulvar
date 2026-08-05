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
import { RulvarError } from '../l0/errors.js';
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

/** Default and hard-max characters per child-result / artifact page. */
export const DEFAULT_CHILD_RESULT_PAGE_CHARS = 4000;
export const MAX_CHILD_RESULT_PAGE_CHARS = 20000;

const PAGING_PROPS = {
  offset: { type: 'integer' as const, minimum: 0 },
  maxChars: { type: 'integer' as const, minimum: 1 },
};

export const GET_CHILD_RESULT_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['handle'],
  properties: {
    handle: { type: 'integer', minimum: 1 },
    ...PAGING_PROPS,
  },
};

export const READ_CHILD_ARTIFACT_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['handle', 'artifactId'],
  properties: {
    handle: { type: 'integer', minimum: 1 },
    artifactId: { type: 'string' },
    ...PAGING_PROPS,
  },
};

export const GET_CHILD_RESULT_TOOL_NAME = 'get_child_result';
export const READ_CHILD_ARTIFACT_TOOL_NAME = 'read_child_artifact';
export const GET_SETTLED_CHILD_RESULTS_TOOL_NAME = 'get_settled_child_results';

/** get_settled_child_results (RV1807): the bulk settled-set read. */
export const GET_SETTLED_CHILD_RESULTS_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['handles'],
  properties: {
    handles: {
      type: 'array',
      minItems: 1,
      items: { type: 'integer', minimum: 1 },
      description: 'the settledHandles set of an await_any digest, or any settled handles',
    },
    maxCharsPerChild: { type: 'integer', minimum: 1 },
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

/**
 * The finish schema under sectional repair (RV808b): `result` OR
 * `sections`, host-enforced as exactly one (a JSON schema union would
 * cost the model a worse error surface than the typed host refusal).
 * `sections` maps a DECLARED marker line to the new section body; the
 * host splices it into the retained rejected attempt and validates the
 * reconstructed document whole. Swapped in only under the
 * `finishValidation.sectionalRepair` opt-in, so the default toolset
 * hash never moves.
 */
export const FINISH_SECTIONAL_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    result: {
      $comment:
        'validated against the declared output SchemaSpec of the orchestrate call; ' +
        'free-form JSON when none is declared',
    },
    summary: { type: 'string' },
    sections: {
      type: 'object',
      additionalProperties: { type: 'string' },
      $comment:
        'sectional resubmission of a REJECTED attempt: declared section marker line -> the ' +
        'new section body; the host splices into the retained attempt (a marker absent ' +
        'from it is appended) and validates the whole reconstructed document',
    },
  },
};

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
  options?: {
    childResultTools?: boolean;
    sectionalFinish?: boolean;
    /**
     * The bulk settled-set read (RV1807), its own opt-in: adding a tool
     * under the existing childResultTools flag would move every
     * opted-in run's toolset hash and re-key their resumes, so the new
     * tool re-keys only runs that opt into IT.
     */
    settledResultsTool?: boolean;
  },
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
      // Sequential in submission order by design, and a refusal
      // mid-loop is part of the TYPED result, never a throw (RV805): a
      // thrown admission refusal used to swallow the whole tool call,
      // so the model never saw the handles of the children already
      // started, they kept running and spending invisibly, and the
      // natural reaction was to spawn the wave again. The partial shape
      // keeps every started handle awaitable and cancellable and names
      // the refused index, the typed code, and the reason; tasks after
      // the refusal are not attempted. The clean-wave result is byte
      // for byte the historical { handles } shape.
      for (const [index, task] of tasks.entries()) {
        let spawned: { handle: number };
        try {
          spawned = await runtime.spawn(task);
        } catch (thrown) {
          return {
            handles,
            refused: {
              index,
              ...(thrown instanceof RulvarError ? { code: thrown.code } : {}),
              reason: thrown instanceof Error ? thrown.message : String(thrown),
            },
          };
        }
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
  // The sectional vocabulary exists only under the opt-in (RV808b):
  // the description enters the toolset hash exactly like the schema,
  // so both move together and never for a run that stays plain.
  const sectional = options?.sectionalFinish === true;
  const finish = tool({
    name: FINISH_TOOL_NAME,
    description: sectional
      ? 'Terminate the orchestration with a result (run outcome ok). After a REJECTED ' +
        'attempt, sections may resubmit only the repaired sections; the host splices them ' +
        'into the retained attempt and validates the whole document.'
      : 'Terminate the orchestration with a result (run outcome ok).',
    parameters: sectional ? FINISH_SECTIONAL_SCHEMA : FINISH_SCHEMA,
    execute: () => {
      throw new Error('finish is intercepted by the agent runtime, never executed');
    },
  });
  const tools = [spawnAgent, parallelAgents, awaitAny, awaitAll, cancelAgent, waitForEvents];
  if (options?.childResultTools === true) {
    // The opt-in evidence tools (RV-201): a digest is a wake signal, so a
    // child whose full output matters is read through these AFTER it
    // settles. Both are pure reads of durable journal state; opting in
    // adds them to the toolset (its hash changes by design, exactly like
    // the extension's plan tools), so a run that never opts in keeps the
    // frozen default toolset unchanged.
    tools.push(
      tool({
        name: GET_CHILD_RESULT_TOOL_NAME,
        description:
          "Read a page of a SETTLED child's FULL output (the digest is truncated to 400 " +
          'chars). Pages with offset and maxChars; the reply reports totalChars and hasMore.',
        parameters: GET_CHILD_RESULT_SCHEMA,
        execute: (input) => {
          const p = input as { handle: number; offset?: number; maxChars?: number };
          return runtime.getChildResult(p.handle, { offset: p.offset, maxChars: p.maxChars });
        },
      }),
      tool({
        name: READ_CHILD_ARTIFACT_TOOL_NAME,
        description:
          "Read a page of a SETTLED child's artifact content by id (ids come from " +
          'get_child_result or a digest). Pages with offset and maxChars.',
        parameters: READ_CHILD_ARTIFACT_SCHEMA,
        execute: (input) => {
          const p = input as {
            handle: number;
            artifactId: string;
            offset?: number;
            maxChars?: number;
          };
          return runtime.readChildArtifact(p.handle, p.artifactId, {
            offset: p.offset,
            maxChars: p.maxChars,
          });
        },
      }),
    );
  }
  if (options?.settledResultsTool === true) {
    // The bulk settled-set read (RV1807): first pages of SEVERAL
    // settled children in one call, refusing typed BEFORE any read when
    // a named handle is unknown or still running, so consuming an
    // await_any digest's settledHandles set never probes by error.
    // Same hash discipline as the other opt-ins: only opted-in runs
    // move their toolset hash.
    tools.push(
      tool({
        name: GET_SETTLED_CHILD_RESULTS_TOOL_NAME,
        description:
          'Read the FIRST page of several SETTLED children in one call (pass the ' +
          'settledHandles set an await_any digest returned). Refuses typed if any handle is ' +
          'unknown or still running; page truncated children individually with ' +
          'get_child_result.',
        parameters: GET_SETTLED_CHILD_RESULTS_SCHEMA,
        execute: (input) => {
          const p = input as { handles: number[]; maxCharsPerChild?: number };
          return runtime.getSettledChildResults(p.handles, {
            maxCharsPerChild: p.maxCharsPerChild,
          });
        },
      }),
    );
  }
  tools.push(finish);
  return tools;
}
