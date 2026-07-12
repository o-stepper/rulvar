/**
 * Scope-path grammar (M1-T04): deterministic structural paths, independent
 * of wall-clock (invariant I3: structure comes from call-and-return only).
 * The grammar is part of the hashVersion 2 profile.
 *
 * Full contract: https://docs.rulvar.com/guide/journal.
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

/** A parsed scope-path segment. */
export type ScopeSegment =
  | { kind: 'parallel'; site: number; branch: number }
  | { kind: 'pipeline'; stage: number; item: number }
  | { kind: 'workflow'; name: string; ordinal: number }
  | { kind: 'agent'; seq: number }
  | { kind: 'plan-node'; nodeId: string };

/**
 * Parses a scope path against the frozen grammar (M2-T04):
 *
 *   scope-path   ::= "" | scope-path "/" segment
 *   segment      ::= "par:" site ":" branch
 *                  | "pipe:" stage ":" item
 *                  | "wf:" name ":" ordinal
 *                  | "agent:" seq
 *                  | "plan" ("/" NodeId follows as its own segment)
 *   NodeId       ::= Crockford ULID (26 chars)
 *
 * Registered workflow names may contain ':' (the ordinal is the final
 * segment field). Throws on malformed paths.
 */
export function parseScopePath(path: string): ScopeSegment[] {
  if (path === '') {
    return [];
  }
  const segments: ScopeSegment[] = [];
  const parts = path.split('/');
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i] ?? '';
    if (part.startsWith('par:')) {
      const [, site, branch, ...rest] = part.split(':');
      if (rest.length > 0 || !isNat(site) || !isNat(branch)) {
        throw new Error(`invalid parallel segment '${part}'`);
      }
      segments.push({ kind: 'parallel', site: Number(site), branch: Number(branch) });
    } else if (part.startsWith('pipe:')) {
      const [, stage, item, ...rest] = part.split(':');
      if (rest.length > 0 || !isNat(stage) || !isNat(item)) {
        throw new Error(`invalid pipeline segment '${part}'`);
      }
      segments.push({ kind: 'pipeline', stage: Number(stage), item: Number(item) });
    } else if (part.startsWith('wf:')) {
      const pieces = part.split(':');
      const ordinal = pieces[pieces.length - 1] ?? '';
      const name = pieces.slice(1, -1).join(':');
      if (pieces.length < 3 || name === '' || !isNat(ordinal)) {
        throw new Error(`invalid workflow segment '${part}'`);
      }
      segments.push({ kind: 'workflow', name, ordinal: Number(ordinal) });
    } else if (part.startsWith('agent:')) {
      const [, seq, ...rest] = part.split(':');
      if (rest.length > 0 || !isNat(seq)) {
        throw new Error(`invalid agent segment '${part}'`);
      }
      segments.push({ kind: 'agent', seq: Number(seq) });
    } else if (part === 'plan') {
      const nodeId = parts[i + 1];
      if (nodeId === undefined || !/^[0-9A-Z]{26}$/.test(nodeId)) {
        throw new Error(`plan segment requires a ULID NodeId, got '${nodeId ?? ''}'`);
      }
      segments.push({ kind: 'plan-node', nodeId });
      i += 1;
    } else {
      throw new Error(`unknown scope segment '${part}'`);
    }
  }
  return segments;
}

function isNat(text: string | undefined): boolean {
  return text !== undefined && /^(0|[1-9][0-9]*)$/.test(text);
}

/** Serializes parsed segments back to the canonical path (round-trip). */
export function formatScopePath(segments: readonly ScopeSegment[]): string {
  return segments
    .map((segment) => {
      switch (segment.kind) {
        case 'parallel':
          return `par:${segment.site}:${segment.branch}`;
        case 'pipeline':
          return `pipe:${segment.stage}:${segment.item}`;
        case 'workflow':
          return `wf:${segment.name}:${segment.ordinal}`;
        case 'agent':
          return `agent:${segment.seq}`;
        case 'plan-node':
          return `plan/${segment.nodeId}`;
      }
    })
    .join('/');
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
