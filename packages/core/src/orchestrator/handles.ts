/**
 * Handle-based spawn records, await, and cancel (M6-T07/T08).
 *
 * Full contract: https://docs.rulvar.com/guide/adaptive-orchestration. A
 * handle IS the seq of the child's dispatch entry, stable across resume:
 * live spawns learn it from the kOnRunning hook, resumed
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

/** The per-child digest handed to the orchestrator. */
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
  /** The spawn's escalation flavor, captured at dispatch. */
  escalationFlavor?: 'A' | 'B';
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
  /** Sleep until a coalesced WakeDigest (M6-T09). */
  waitForEvents(triggers: unknown): Promise<unknown>;
}

/**
 * The committed WakeDigest render budget (Appendix A: 400
 * chars per outputSummary row, the character measure; committed at M10
 * entry by adopting the implemented distillation cap unchanged, the
 * value frozen into every cassette since M6). One value serves both
 * stages: the deterministic distillation cap here and the digest
 * render default in orchestrate (renderBudgetChars).
 */
export const WAKE_SUMMARY_RENDER_BUDGET_CHARS = 400;

/**
 * The M6 outputSummary: a deterministic truncation of the child's
 * output (or error message), identical live and on replay (distillation
 * lives with the child, ordered by
 * spawn ordinal; the LLM distillation upgrade is M7 territory).
 */
export function summarizeOutput(result: AgentResult<unknown>): string {
  const raw =
    result.status === 'ok'
      ? typeof result.output === 'string'
        ? result.output
        : JSON.stringify(result.output ?? null)
      : (result.errorMessage ?? `terminal status ${result.status}`);
  return raw.length <= WAKE_SUMMARY_RENDER_BUDGET_CHARS
    ? raw
    : `${raw.slice(0, WAKE_SUMMARY_RENDER_BUDGET_CHARS)}...`;
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
