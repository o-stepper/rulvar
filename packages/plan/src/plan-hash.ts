/**
 * planHash (M7-T01): the canonical projection of a TaskPlan and its
 * sha256, plus the fold-head assertion the appenders use.
 *
 * Owning spec: docs/07-adaptive-orchestration-spec.md, section 3.4
 * (DEF-8): planHash = sha256 of the canonical JSON of PlanState, nodes
 * sorted by NodeId, each node exactly the docs/07 3.1 record with `deps`
 * sorted in the hash, plus the guard fold counters revisionCount and
 * droppedRevisionStreak. Nothing wall-clock, nothing telemetric, enters
 * the hash. Canonicalization and digest ride the frozen hashVersion 2
 * deriver (RFC 8785 JCS + sha256), so the plan chain shares the identity
 * pipeline of the journal kernel; a future grammar change arrives as a
 * new deriver, never as an edit here (docs/03, section "hashVersion").
 */
import { CURRENT_HASH_VERSION, PlanInvariantError, deriverV2 } from '@rulvar/core';
import type { EntryRef, HashVersion, KeyDeriver } from '@rulvar/core';
import type { PlanNode, TaskPlan } from './plan-state.js';

/** The hashVersion whose profile computes planHash today. */
export const PLAN_HASH_VERSION: HashVersion = CURRENT_HASH_VERSION;

/** The exact per-node projection entering the hash (docs/07, 3.1). */
function canonicalNode(node: PlanNode): Record<string, unknown> {
  const projected: Record<string, unknown> = {
    nodeId: node.nodeId,
    logicalTaskId: node.logicalTaskId,
    status: node.status,
    deps: [...node.deps].sort(),
    waivedDeps: node.waivedDeps,
    parkRequested: node.parkRequested,
    cancelRequested: node.cancelRequested,
    priority: node.priority,
    promptSpecHash: node.promptSpecHash,
  };
  if (node.checkpointRef !== undefined) {
    projected.checkpointRef = node.checkpointRef;
  }
  if (node.escalationRef !== undefined) {
    projected.escalationRef = node.escalationRef;
  }
  return projected;
}

/**
 * The canonical JSON projection of PlanState: nodes sorted by NodeId plus
 * the guard fold counters, nothing else (docs/07, 3.4).
 */
export function canonicalPlanState(plan: TaskPlan): Record<string, unknown> {
  const nodes = Object.values(plan.nodes)
    .sort((a, b) => (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0))
    .map(canonicalNode);
  return {
    nodes,
    revisionCount: plan.revisionCount,
    droppedRevisionStreak: plan.droppedRevisionStreak,
  };
}

/**
 * planHash under one deriver profile (default: the current hashVersion 2
 * profile). Replay recomputes each entry's planHashAfter with the
 * predicate of that entry's OWN hashVersion (docs/07, 3.4), so the
 * deriver is a parameter, not an ambient.
 */
export function planHash(plan: TaskPlan, deriver: KeyDeriver = deriverV2): string {
  return deriver.deriveKey(canonicalPlanState(plan));
}

/**
 * The append-time head assertion (docs/07, 3.4): planHashBefore of the
 * entry being appended MUST equal the current fold head. A failure is an
 * engine bug and raises the typed PlanInvariantError; the run finishes
 * with outcome error, never a silent brick.
 */
export function assertPlanHead(
  plan: TaskPlan,
  expectedPlanHash: string,
  context?: { entryRef?: EntryRef; operation?: string },
): void {
  const actual = planHash(plan);
  if (actual === expectedPlanHash) {
    return;
  }
  throw new PlanInvariantError(
    `plan fold head ${actual} does not match the asserted planHashBefore ${expectedPlanHash}` +
      (context?.operation === undefined ? '' : ` (${context.operation})`),
    {
      data: {
        expected: expectedPlanHash,
        actual,
        ...(context?.entryRef === undefined ? {} : { entryRef: context.entryRef }),
        ...(context?.operation === undefined ? {} : { operation: context.operation }),
      },
    },
  );
}
