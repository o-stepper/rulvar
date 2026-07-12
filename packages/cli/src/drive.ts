/**
 * The run/suspend/resolve/resume loop shared by `rulvar run` and
 * `rulvar resume` (the CLI performs interactive resolution of suspended
 * approvals and external inputs). Prompts read
 * one line per pending suspension; EOF leaves the run suspended with a
 * notice, never an error.
 */
import type { Engine, PendingExternal, RunHandle, RunOutcome, Workflow } from '@rulvar/core';

import type { CliIo } from './io.js';
import { attachProgress } from './tui.js';

const APPROVAL_PREFIX = 'approval:';

/** Parses an approval answer; undefined = unusable input. */
function approvalDecision(answer: string): { decision: 'allow' | 'deny' } | undefined {
  const normalized = answer.trim().toLowerCase();
  if (['allow', 'a', 'yes', 'y'].includes(normalized)) {
    return { decision: 'allow' };
  }
  if (['deny', 'd', 'no', 'n'].includes(normalized)) {
    return { decision: 'deny' };
  }
  return undefined;
}

/**
 * Prompts for and applies resolutions for every pending suspension.
 * Returns the number applied; 0 means input was exhausted or unusable
 * and the run stays suspended.
 */
async function resolvePending(
  handle: RunHandle<unknown>,
  pending: PendingExternal[],
  io: CliIo,
): Promise<number> {
  let applied = 0;
  for (const item of pending) {
    if (item.key.startsWith(APPROVAL_PREFIX)) {
      const answer = await io.prompt(`approve '${item.prompt ?? item.key}'? [allow/deny]`);
      if (answer === undefined) {
        return applied;
      }
      const decision = approvalDecision(answer);
      if (decision === undefined) {
        io.err(`unrecognized answer '${answer.trim()}'; leaving ${item.key} suspended`);
        continue;
      }
      const outcome = await handle.resolveExternal(item.key, decision);
      io.err(
        `approval ${item.key}: ${decision.decision} (${outcome.applied ? 'applied' : outcome.reason})`,
      );
      if (outcome.applied) {
        applied += 1;
      }
      continue;
    }
    const label = item.prompt === undefined ? item.key : `${item.key} (${item.prompt})`;
    const answer = await io.prompt(`value for external '${label}' as JSON:`);
    if (answer === undefined) {
      return applied;
    }
    let value: unknown;
    try {
      value = JSON.parse(answer);
    } catch {
      io.err(`not valid JSON; leaving '${item.key}' suspended`);
      continue;
    }
    const outcome = await handle.resolveExternal(item.key, value as never);
    io.err(`external '${item.key}': ${outcome.applied ? 'applied' : outcome.reason}`);
    if (outcome.applied) {
      applied += 1;
    }
  }
  return applied;
}

/**
 * Drives a handle to a terminal outcome, resolving suspensions
 * interactively and resuming until the run settles or input runs dry.
 */
export async function driveRun(options: {
  engine: Engine;
  workflow: Workflow<never, unknown>;
  first: RunHandle<unknown>;
  io: CliIo;
  /** Original run arguments: not journaled in v1, the host re-supplies them. */
  args?: unknown;
}): Promise<RunOutcome<unknown>> {
  let handle = options.first;
  for (;;) {
    const detach = attachProgress(handle, options.io);
    const outcome = await handle.result;
    detach();
    if (outcome.status !== 'suspended' || outcome.pending.length === 0) {
      return outcome;
    }
    const applied = await resolvePending(handle, outcome.pending, options.io);
    if (applied === 0) {
      return outcome;
    }
    handle = options.engine.resume(
      handle.runId,
      options.workflow as unknown as Workflow<unknown, unknown>,
      {
        args: options.args,
      },
    );
  }
}

/** Renders the settled outcome; returns the process exit code. */
export function reportOutcome(outcome: RunOutcome<unknown>, io: CliIo): number {
  io.err(`status: ${outcome.status}`);
  if (outcome.value !== undefined) {
    io.out(JSON.stringify(outcome.value, null, 2));
  }
  if (outcome.error !== undefined) {
    io.err(`error: ${outcome.error.message}`);
  }
  if (outcome.dropped.length > 0) {
    io.err(`dropped: ${outcome.dropped.length} item(s)`);
  }
  for (const pending of outcome.pending) {
    io.err(`pending: ${pending.key} (entry ${pending.entryRef})`);
  }
  io.err(`cost: $${outcome.cost.totalUsd.toFixed(4)}`);
  for (const [model, usd] of Object.entries(outcome.cost.byModel)) {
    io.err(`  by model ${model}: $${usd.toFixed(4)}`);
  }
  for (const [phase, usd] of Object.entries(outcome.cost.byPhase)) {
    if (phase !== '') {
      io.err(`  by phase ${phase}: $${usd.toFixed(4)}`);
    }
  }
  if (outcome.cost.unpriced.length > 0) {
    io.err(`unpriced models: ${outcome.cost.unpriced.map((u) => u.model).join(', ')}`);
  }
  switch (outcome.status) {
    case 'ok':
    case 'suspended':
      return 0;
    default:
      return 1;
  }
}
