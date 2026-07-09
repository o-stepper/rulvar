/**
 * The orchestrator extension seam (M7-T05): the PUBLIC surface through
 * which @lurker/plan attaches PlanRunner, the opt-in extension of mode
 * (c).
 *
 * Dependency rules (docs/02, section 4): orchestration packages build
 * exclusively from the public core API; this seam exists so the docs/07
 * machinery needs no private hook. Every capability maps to a normative
 * requirement: `append` writes the decision-before-effects producers
 * into extension-owned sequential scopes (plan.revision, plan.decision,
 * termination.init, ledger.op, node.link); `snapshot` feeds the pure
 * folds; `admission` is the single admission point (docs/07, 7.1);
 * `dispatch` lets the ENGINE schedule ready plan nodes under explicit
 * `plan/NodeId` scopes through the existing semaphore and budget
 * admission (docs/07, 3.1); `quiescent` completes the mandatory
 * quiescence trigger (nothing running AND nothing ready).
 */
import type { EntryKind, JournalEntry } from '../l0/entries.js';
import type { Json } from '../l0/json.js';
import type { Usage } from '../l0/messages.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import type { UsageLimits } from '../runtime/usage-limits.js';
import type { EscalationOptions } from '../runtime/escalation.js';
import type { IsolationSpec } from '../l0/spi/isolation.js';
import type { AdmissionController } from './admission.js';
import type { AgentResult } from '../runtime/agent-loop.js';
import type { WakeDigest } from './wake.js';

/** One append into an extension-owned sequential scope. */
export interface ExtensionAppendInput {
  scope: string;
  /** The content key; extension kinds derive their own (docs/07, 3.3). */
  key: string;
  kind: EntryKind;
  value: Json;
}

/** A child dispatch under an explicit scope (plan/NodeId). */
export interface ExtensionDispatchSpec {
  agentType: string;
  prompt: string;
  /** Resolved against defaults.schemas (docs/08); unknown names are typed errors. */
  outputSchemaRef?: string;
  /** Resolved against defaults.toolsets (docs/08); unknown names are typed errors. */
  toolsetRef?: string;
  isolation?: IsolationSpec;
  budgetUsd?: number;
  usageLimits?: Partial<UsageLimits>;
  escalation?: EscalationOptions;
  approach?: string;
  taskClass?: string;
}

/** The per-run IO the extension closes over (engine-owned effects). */
export interface OrchestratorExtensionIO {
  readonly runId: string;
  /** The scope the orchestrate call runs in ('' at the top level). */
  readonly baseScope: string;
  /** The orchestrator's child scope (agent:<seq>); throws before the loop starts. */
  orchestratorScope(): string;
  /** Registered agent profiles advertised to this orchestrate call. */
  readonly profiles: Record<string, unknown>;
  /** The run USD ceiling (B0), when one exists. */
  readonly runCeilingUsd?: number;
  /** ULID minting for engine-owned identifiers (NodeIds). */
  mintId(): string;
  /** Total-order append; the extension owns its scopes' content keys. */
  append(input: ExtensionAppendInput): Promise<JournalEntry>;
  /** The pinned journal view backing every pure fold. */
  snapshot(): readonly JournalEntry[];
  /** Flushes the serialized append queue before reading back. */
  flush(): Promise<void>;
  /** The single admission point for all spawns (docs/07, 7.1). */
  readonly admission: AdmissionController;
  /**
   * Dispatches one child agent under the EXPLICIT child scope through
   * the ordinary ctx.agent path (semaphore, budget layers, forward
   * matching). Returns the journal-derived handle (the dispatch seq).
   */
  dispatch(
    spec: ExtensionDispatchSpec,
    childScope: string,
    identity: { nodeId: string; logicalTaskId: string },
  ): Promise<{ handle: number }>;
  /** The settled result of a dispatched child, when it settled. */
  settledOf(handle: number): AgentResult<unknown> | undefined;
  /** Cancels an in-flight child by handle (AbortSignal). */
  cancel(handle: number, reason?: string): Promise<{ cancelled: boolean; handle: number }>;
  /**
   * Appends the severing abandon ref-entry over a branch through the
   * ResolutionArbiter (DEF-4/DEF-5; docs/03, sections 8.5 and 9.1).
   */
  abandonBranch(attempt: {
    target: number;
    authorizedBy: number;
    nodeId?: string;
    logicalTaskId?: string;
    reason: string;
    retainCheckpoint?: boolean;
    retainWorktree?: boolean;
  }): Promise<{ applied: boolean; seq: number }>;
  /**
   * Registers a node.link scope-prefix alias for forward matching
   * (DEF-5; docs/03, 9.5). Idempotent; rebuilt by fold on resume.
   */
  registerAlias(donorScope: string, targetScope: string): void;
  /** The engine price fold (journal facts in, USD out; docs/04). */
  priceUsd(servedBy: string | undefined, usage: Usage): number | undefined;
  /** Telemetry emission into the run event stream. */
  emit(event: { type: string } & Record<string, unknown>): void;
}

/**
 * The extension contract. PlanRunner implements it in @lurker/plan; the
 * mode (c) orchestrator hosts it. Everything is optional except the
 * toolset: an extension that adds no tools has no reason to exist.
 */
export interface OrchestratorExtension {
  readonly name: string;
  /**
   * Runs strictly BEFORE the orchestrator agent's first entry (docs/07,
   * 11.6: termination.init precedes the first scheduling entry and the
   * budget reserve). On resume it rebuilds state from the journal.
   */
  boot?(io: OrchestratorExtensionIO): Promise<void> | void;
  /** Extension tools appended to the mode (c) toolset (docs/07, section 4). */
  tools(io: OrchestratorExtensionIO): ToolDef[];
  /** Extra orchestrator prompt lines describing the extension's protocol. */
  promptLines?(): string[];
  /**
   * Called after boot and after EVERY child settlement, strictly before
   * wake triggers are evaluated: the scheduling edge (ready nodes
   * dispatch here, terminal transitions journal here).
   */
  onActivity?(io: OrchestratorExtensionIO): Promise<void> | void;
  /**
   * Quiescence participation (docs/07, 4.8): the mandatory trigger fires
   * only when every dispatched child settled AND the extension reports
   * nothing running and nothing ready.
   */
  quiescent?(): boolean;
  /**
   * Extra fields merged into every WakeDigest (the hash-v2 coordinated
   * schema lands in M7-T13; the substrate merges extras verbatim).
   */
  digestExtras?(io: OrchestratorExtensionIO): Record<string, Json> | undefined;
  /** Observes every delivered digest, including recovered pinned ones. */
  onWake?(digest: WakeDigest): void;
}
