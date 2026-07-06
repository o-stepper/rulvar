/**
 * Scope-path grammar (M1-T04): deterministic structural paths, independent
 * of wall-clock (invariant I3: structure comes from call-and-return only).
 * The grammar is part of the hashVersion 2 profile.
 *
 * Owning spec: docs/03-journal-spec.md, section "Scope-path grammar".
 *
 * Segment rules: a sequential body is ONE scope (sequential calls add no
 * segment; they are distinguished by key and ordinal only). ctx.phase is
 * cosmetic for identity and adds no segment. Parallel site numbers come
 * from a monotonic counter per enclosing scope in execution order; the
 * pipeline item index is the index of the ORIGINAL input item, so
 * streaming reorder never shifts identity.
 */

/** The root sequential body of the run is the empty path. */
export const ROOT_SCOPE: string = '';

function joinScope(parent: string, segment: string): string {
  return parent === '' ? segment : `${parent}/${segment}`;
}

/** Branch `branch` of parallel site `site`: `par:<site>:<branch>`. */
export function parallelScope(parent: string, site: number, branch: number): string {
  return joinScope(parent, `par:${site}:${branch}`);
}

/** Stage `stage` processing source item `item`: `pipe:<stage>:<item>`. */
export function pipelineScope(parent: string, stage: number, item: number): string {
  return joinScope(parent, `pipe:${stage}:${item}`);
}

/** ctx.workflow child scope: `wf:<name>:<ordinal>` (ordinal counts invocations of that name). */
export function workflowScope(parent: string, name: string, ordinal: number): string {
  return joinScope(parent, `wf:${name}:${ordinal}`);
}

/** Orchestrator handle spawns nest under the orchestrator's own spawn entry: `agent:<seq>`. */
export function agentScope(parent: string, seq: number): string {
  return joinScope(parent, `agent:${seq}`);
}

/** PlanRunner node scopes: `plan/<NodeId>` (NodeIds are engine-minted ULIDs). */
export function planNodeScope(nodeId: string): string {
  return `plan/${nodeId}`;
}

/**
 * Allocates parallel site numbers per enclosing scope: a monotonic counter
 * in execution order, not source position. Because every scope body is
 * sequential by construction (I3), allocation order is deterministic and
 * identical on every replay.
 */
export class ParallelSiteCounter {
  private readonly bySite = new Map<string, number>();

  next(enclosingScope: string): number {
    const current = this.bySite.get(enclosingScope) ?? 0;
    this.bySite.set(enclosingScope, current + 1);
    return current;
  }
}
