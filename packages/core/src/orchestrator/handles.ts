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
import { truncateToBudget } from '../l0/truncate.js';
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

/**
 * One page of a settled child's FULL output, returned by the opt-in
 * `get_child_result` tool. The digest is a wake signal truncated to 400
 * characters; this is the whole evidence, paged so a large result can be
 * read without overflowing the orchestrator's context in one call
 * (v1.40.0 improvement plan, the narrow RV-201 slice). The content is a
 * deterministic serialization of the child's `output` (the raw string
 * when the output IS a string, else its JCS-independent `JSON.stringify`)
 * for a settled ok child, or the child's `errorMessage` otherwise, so the
 * orchestrator can read WHY a child failed as readily as what it
 * produced; a limit child carrying a structured terminal partial serves
 * `{ error, partial }` instead (RV-210 close-out), so the collected work
 * is pageable in full. Everything here is a pure read of already durable
 * journal state, so a resume reproduces it with no new spend.
 */
export interface ChildResultPage {
  handle: number;
  status: string;
  /** Length of the whole serialized result, in characters. */
  totalChars: number;
  /** The character offset this page starts at, counted from zero. */
  offset: number;
  /** The page: `content.length` is at most the requested (clamped) maxChars. */
  content: string;
  /** True when more characters remain past this page; call again with a higher offset. */
  hasMore: boolean;
  /** The child's artifacts, id and kind, so the model knows what `read_child_artifact` can fetch. */
  artifacts: Array<{ id: string; kind: string; label?: string }>;
}

/**
 * One page of a settled child's artifact CONTENT, returned by the opt-in
 * `read_child_artifact` tool. Inline artifact `data` serializes to a
 * string; an offloaded artifact (a TranscriptStore `ref`) is fetched and
 * decoded as UTF-8; a `patch` artifact with only a changed file list
 * carries that list in `files` and empty content. Paged and pure exactly
 * like {@link ChildResultPage}.
 */
export interface ChildArtifactPage {
  handle: number;
  artifactId: string;
  kind: string;
  label?: string;
  totalChars: number;
  offset: number;
  content: string;
  hasMore: boolean;
  /** The changed file list for a `patch` artifact; absent otherwise. */
  files?: string[];
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
  /** A page of a settled child's full output; opt-in `get_child_result` (RV-201). */
  getChildResult(
    handle: number,
    opts?: { offset?: number; maxChars?: number },
  ): Promise<ChildResultPage>;
  /** A page of a settled child's artifact content; opt-in `read_child_artifact` (RV-201). */
  readChildArtifact(
    handle: number,
    artifactId: string,
    opts?: { offset?: number; maxChars?: number },
  ): Promise<ChildArtifactPage>;
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
  let raw: string;
  if (result.status === 'ok') {
    raw = typeof result.output === 'string' ? result.output : JSON.stringify(result.output ?? null);
  } else {
    raw = result.errorMessage ?? `terminal status ${result.status}`;
    // The structured terminal partial (RV-210 close-out): a limit child
    // that recorded progress surfaces it in the digest instead of dying
    // as an opaque status line. Present only when the report exists, so
    // every digest without one stays byte-identical.
    if (result.partial !== undefined) {
      raw = `${raw}; partial: ${JSON.stringify(result.partial)}`;
    }
  }
  // The budget bounds the WHOLE distilled row, marker included
  // (v1.35.0 review P2-2): the old idiom returned up to budget + 3.
  return truncateToBudget(raw, WAKE_SUMMARY_RENDER_BUDGET_CHARS);
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
