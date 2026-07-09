/**
 * TaskSpec (M7-T04): the shared spawn specification of the orchestrator
 * toolset, used by spawn_agent, parallel_agents, add_task, and
 * proposedDecomposition.
 *
 * Owning spec: docs/07-adaptive-orchestration-spec.md, section 4.1. The
 * orchestrator never sees or names concrete models; model_hint.startTier
 * is the ONLY model influence it has and is clamped to the declared
 * ladder (docs/07, section 10).
 */
import { deriverV2 } from '@lurker/core';
import type { EscalationOptions, IsolationSpec, SpawnLineageOpt, UsageLimits } from '@lurker/core';

export interface TaskSpec {
  /** Registered agent profile name; models are never named here. */
  agentType: string;
  prompt: string;
  /** Registered SchemaSpec name (docs/08); registry lands in M7-T05. */
  outputSchemaRef?: string;
  /** Registered tool profile name (docs/08); registry lands in M7-T05. */
  toolsetRef?: string;
  isolation?: IsolationSpec;
  usageLimits?: Partial<UsageLimits>;
  /** Clamped by childBudgetFraction at admission. */
  budgetUsd?: number;
  /** The ONLY model influence the orchestrator has (docs/07, 4.1). */
  model_hint?: { startTier: number };
  /** Slug entering approachSig, at most 32 chars after normalization. */
  approach?: string;
  /** Absence means a new lineage root (docs/07, 8.1). */
  lineage?: SpawnLineageOpt;
  /** Default 'unclassified' (taskClass binding OQ, docs/14). */
  taskClass?: string;
  /** Absence means the child cannot escalate (docs/07, 6.4). */
  escalation?: EscalationOptions;
}

/** The amend_task patch form: every field optional (docs/07, 4.7). */
export type TaskSpecPatch = Partial<TaskSpec>;

/**
 * The deterministic spec digest entering PlanNode.promptSpecHash
 * (docs/07, 3.1): the canonical JSON of the full TaskSpec through the
 * frozen hashVersion 2 canonicalization. A plan-internal digest, not a
 * kernel content key: the paid-call identity stays with the child's own
 * spawn entry.
 */
export function promptSpecHashOf(spec: TaskSpec): string {
  return deriverV2.deriveKey({ kind: 'plan.task-spec', spec: spec });
}

/** Applies an amend_task patch onto a spec (undefined fields untouched). */
export function applyTaskSpecPatch(spec: TaskSpec, patch: TaskSpecPatch): TaskSpec {
  const merged = { ...spec } as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged as unknown as TaskSpec;
}
