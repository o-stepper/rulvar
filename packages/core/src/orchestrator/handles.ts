/**
 * Handle-based spawn records, await, and cancel (M6-T07/T08).
 *
 * Owning spec: docs/07-adaptive-orchestration-spec.md, sections
 * "Orchestrator toolset" (4.2-4.5) and "WakeDigest" (TaskDigest). A
 * handle IS the seq of the child's dispatch entry, stable across resume
 * (docs/06 9.3): live spawns learn it from the kOnRunning hook, resumed
 * ones recover it from the journal before any tool executes.
 *
 * Recovery (the crash-resume contract): a resumed orchestrator restores
 * its transcript from the turn checkpoint, so executed spawn_agent
 * calls do NOT re-run; their spawn records are rebuilt here from the
 * journaled spawn-admission decisions plus the child entries, and
 * children that were in flight at the crash are re-dispatched through
 * the same forward-matching path (zero re-paid spawns, no duplicate
 * spawn decisions).
 */
import type { Json } from '../l0/json.js';
import type { AgentResult } from '../runtime/agent-loop.js';

/** docs/07 section 5: the per-child digest handed to the orchestrator. */
export interface TaskDigest {
  nodeId: string;
  logicalTaskId: string;
  status: string;
  outputSummary: string;
  costUsd: number;
  artifactsIndex: string[];
}

/** One spawned child tracked by the orchestrator runtime. */
export interface SpawnRecord {
  handle: number;
  spawnOrdinal: number;
  nodeId: string;
  logicalTaskId: string;
  /** Settles with the child's full result; never rejects. */
  result: Promise<AgentResult<unknown>>;
  settled?: AgentResult<unknown>;
  abort: () => void;
}

/** The engine seam the spawn tools close over (never on ToolContext). */
export interface OrchestratorRuntime {
  spawn(params: {
    agentType: string;
    prompt: string;
    outputSchemaRef?: string;
    toolsetRef?: string;
    budgetUsd?: number;
    model_hint?: { startTier?: number };
    approach?: string;
    lineage?: { continues: string; relation?: string; causeRef: number };
    taskClass?: string;
  }): Promise<{ handle: number }>;
  awaitAny(handles: number[]): Promise<TaskDigest>;
  awaitAll(handles: number[]): Promise<TaskDigest[]>;
  cancel(handle: number, reason?: string): Promise<{ cancelled: boolean; handle: number }>;
  /** docs/07 4.8: sleep until a coalesced WakeDigest (M6-T09). */
  waitForEvents(triggers: unknown): Promise<unknown>;
}

/** Deterministic distillation cap; a summarize-model distillation is M7. */
const SUMMARY_MAX_CHARS = 400;

/**
 * The M6 outputSummary: a deterministic truncation of the child's
 * output (or error message), identical live and on replay (docs/07
 * section 2, clause 3: distillation lives with the child, ordered by
 * spawn ordinal; the LLM distillation upgrade is M7 territory).
 */
export function summarizeOutput(result: AgentResult<unknown>): string {
  const raw =
    result.status === 'ok'
      ? typeof result.output === 'string'
        ? result.output
        : JSON.stringify(result.output ?? null)
      : (result.errorMessage ?? `terminal status ${result.status}`);
  return raw.length <= SUMMARY_MAX_CHARS ? raw : `${raw.slice(0, SUMMARY_MAX_CHARS)}...`;
}

/** Folds one settled child into its digest (spawn-ordinal ordering is the caller's). */
export function digestOf(record: SpawnRecord, result: AgentResult<unknown>): TaskDigest {
  return {
    nodeId: record.nodeId,
    logicalTaskId: record.logicalTaskId,
    status: result.status,
    outputSummary: summarizeOutput(result),
    costUsd: result.costUsd,
    artifactsIndex: (result.artifacts ?? []).map((artifact) => artifact.id),
  };
}

/** The journaled spawn-admission payload the runtime writes and recovers. */
export interface SpawnAdmissionValue {
  decisionType: 'spawn-admission';
  origin: 'spawn_agent' | 'parallel_agents';
  orchestratorScope: string;
  spawnOrdinal: number;
  name: string;
  childScope: string;
  parentAccountScope: string;
  spec: Json;
  decision: Json;
}
