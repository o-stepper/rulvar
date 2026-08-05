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
  /**
   * The child's replay-stable execution facts (RV1503), present only
   * under the `executionFacts` opt-in: what the run itself observed,
   * so the composing root can grade `live-observed` honestly instead
   * of erasing its own run. See {@link executionFactsOf}.
   */
  facts?: ChildExecutionFacts;
  /**
   * On `await_any` digests (RV1807): the settled subset of the WAITED
   * handle set at return time, the race winner included. The
   * nineteenth benchmark's root probed handles with speculative
   * `get_child_result` calls and collected eight not-settled errors;
   * this list is the exact consume set, so probing is never needed.
   */
  settledHandles?: number[];
}

/**
 * One child's execution facts, folded ONLY from replay-stable settled
 * material (RV1503): the journaled per-dispatch reconciliation records
 * and the journaled usage, which a resumed run restores verbatim.
 * Dollars are deliberately absent: replay re-prices from the CURRENT
 * price table, so a money figure here would drift across resumes while
 * these counters cannot.
 */
export interface ChildExecutionFacts {
  /** Provider HTTP requests the child's dispatches made (RV1210 semantics). */
  wireRequests: number;
  /** Wire requests no response id names (the invoice cardinality rule). */
  wireIdsMissing: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Folds one settled child's replay-stable execution facts (RV1503).
 * Per dispatch record: the wire count is the adapter-reported
 * `wireRequests` when present, else the absorbed id list's length,
 * else one (a single-wire dispatch); the named side counts the
 * absorbed ids or the single `responseId`, clamped by the wire count
 * (RV1410: a keyless single-wire row contributes one missing id).
 * Pure over the settled result, so live and resumed folds agree byte
 * for byte.
 */
export function executionFactsOf(result: AgentResult<unknown>): ChildExecutionFacts {
  let wireRequests = 0;
  let named = 0;
  for (const call of result.providerCalls ?? []) {
    const ids = call.wireResponseIds?.length ?? (call.responseId === undefined ? 0 : 1);
    const wires = call.wireRequests ?? Math.max(call.wireResponseIds?.length ?? 0, 1);
    wireRequests += wires;
    named += Math.min(ids, wires);
  }
  return {
    wireRequests,
    wireIdsMissing: wireRequests - named,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
  };
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
  /** The child's execution facts (RV1503), under the `executionFacts` opt-in only. */
  facts?: ChildExecutionFacts;
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
  /**
   * First pages of SEVERAL settled children in one call; opt-in
   * `get_settled_child_results` (RV1807). Refuses typed BEFORE any
   * read when any named handle is unknown or still running, so
   * consuming the exact `settledHandles` set of an `await_any` digest
   * never probes by error.
   */
  getSettledChildResults(
    handles: number[],
    opts?: { maxCharsPerChild?: number },
  ): Promise<ChildResultPage[]>;
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
    // The validated terminal output of a 'limit' child (the 1.64.0
    // experiment review, P0.4): the finalization reserve summary is
    // journaled, replayable, paid work, so the digest surfaces it
    // instead of discarding it behind a bare status line. Present only
    // when it exists, so every other digest stays byte-identical.
    if (result.status === 'limit' && result.output !== null && result.output !== undefined) {
      const final =
        typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
      raw = `${raw}; final: ${final}`;
    }
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

/**
 * Folds one settled child into its digest (spawn-ordinal ordering is
 * the caller's). `includeFacts` (RV1503) appends the replay-stable
 * execution facts; absent or false keeps the digest byte identical.
 */
export function digestOf(
  record: SpawnRecord,
  result: AgentResult<unknown>,
  includeFacts?: boolean,
): TaskDigest {
  return {
    nodeId: record.nodeId,
    logicalTaskId: record.logicalTaskId,
    status: result.status,
    outputSummary: summarizeOutput(result),
    costUsd: result.costUsd,
    artifactsIndex: (result.artifacts ?? []).map((artifact) => artifact.id),
    ...(includeFacts === true ? { facts: executionFactsOf(result) } : {}),
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
