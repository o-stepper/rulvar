/**
 * The run/suspend/resolve/resume loop shared by `rulvar run` and
 * `rulvar resume` (the CLI performs interactive resolution of suspended
 * approvals and external inputs). Prompts read
 * one line per pending suspension; EOF leaves the run suspended with a
 * notice, never an error.
 */
import {
  sanitizeTerminalText,
  type Engine,
  type PendingExternal,
  type ResumeHandle,
  type RunHandle,
  type RunOutcome,
  type Workflow,
} from '@rulvar/core';

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
    // Suspension keys and prompts are workflow-authored (for planner
    // runs, model-authored), so every rendered copy is sanitized; the
    // raw key still addresses the resolution (v1.24.1 review P2-1).
    const keyRef = sanitizeTerminalText(item.key);
    if (item.key.startsWith(APPROVAL_PREFIX)) {
      const answer = await io.prompt(
        `approve '${sanitizeTerminalText(item.prompt ?? item.key)}'? [allow/deny]`,
      );
      if (answer === undefined) {
        return applied;
      }
      const decision = approvalDecision(answer);
      if (decision === undefined) {
        io.err(
          `unrecognized answer '${sanitizeTerminalText(answer.trim())}'; leaving ${keyRef} suspended`,
        );
        continue;
      }
      const outcome = await handle.resolveExternal(item.key, decision);
      io.err(
        `approval ${keyRef}: ${decision.decision} (${outcome.applied ? 'applied' : sanitizeTerminalText(outcome.reason)})`,
      );
      if (outcome.applied) {
        applied += 1;
      }
      continue;
    }
    const label =
      item.prompt === undefined ? keyRef : `${keyRef} (${sanitizeTerminalText(item.prompt)})`;
    const answer = await io.prompt(`value for external '${label}' as JSON:`);
    if (answer === undefined) {
      return applied;
    }
    let value: unknown;
    try {
      value = JSON.parse(answer);
    } catch {
      io.err(`not valid JSON; leaving '${keyRef}' suspended`);
      continue;
    }
    const outcome = await handle.resolveExternal(item.key, value as never);
    io.err(
      `external '${keyRef}': ${outcome.applied ? 'applied' : sanitizeTerminalText(outcome.reason)}`,
    );
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

/**
 * Renders the `resume --dry-run` preview (the v1.23.0 review): the
 * replay accounting from `handle.preview`, then what a real resume
 * would do. The engine's replay-strict mode guarantees zero journal or
 * meta writes and zero adapter calls. A preview that stops at a
 * would-be-live call is a SUCCESSFUL preview (the miss IS the answer),
 * so the exit code is 0 either way; only structural failures (missing
 * run, unregistered workflow, args refusal) exit nonzero via their
 * typed errors.
 */
export async function reportDryRun(handle: ResumeHandle<unknown>, io: CliIo): Promise<number> {
  const outcome = await handle.result;
  const preview = await handle.preview;
  io.err('dry-run preview (zero journal or meta writes, zero adapter calls):');
  io.err(
    `  hits: ${preview.hits}  misses: ${preview.misses}  reruns: ${preview.reruns}  ` +
      `skipped: ${preview.skipped}`,
  );
  io.err(
    preview.orphaned.length === 0
      ? '  orphaned effect roots: none'
      : `  orphaned effect roots (entryRefs): ${preview.orphaned.join(', ')}`,
  );
  if (preview.invalidResolutions.length === 0) {
    io.err('  invalid resolutions: none');
  } else {
    for (const invalid of preview.invalidResolutions) {
      io.err(`  invalid resolution at seq ${invalid.seq}: ${sanitizeTerminalText(invalid.detail)}`);
    }
  }
  if (outcome.error?.code === 'journal_miss') {
    io.err(
      `  stopped at the first would-be-live call: ${sanitizeTerminalText(outcome.error.message)}`,
    );
    io.err('  a real resume would perform new paid work from this point');
    return 0;
  }
  io.err(`  would settle: ${outcome.status}`);
  if (outcome.error !== undefined) {
    io.err(`  error: ${sanitizeTerminalText(outcome.error.message)}`);
  }
  for (const pending of outcome.pending) {
    io.err(`  pending: ${sanitizeTerminalText(pending.key)} (entry ${pending.entryRef})`);
  }
  if (outcome.value !== undefined) {
    io.out(JSON.stringify(outcome.value, null, 2));
  }
  return 0;
}

/**
 * Renders the settled outcome; returns the process exit code. Error
 * messages, suspension keys, model refs, and phase names originate from
 * providers, tools, and workflow authors, so each is sanitized before
 * it reaches a terminal line, matching the TUI renderer (v1.24.1 review
 * P2-1). Values print as JSON, which escapes control bytes on its own.
 */
export function reportOutcome(outcome: RunOutcome<unknown>, io: CliIo): number {
  io.err(`status: ${outcome.status}`);
  if (outcome.value !== undefined) {
    io.out(JSON.stringify(outcome.value, null, 2));
  }
  if (outcome.error !== undefined) {
    io.err(`error: ${sanitizeTerminalText(outcome.error.message)}`);
  }
  if (outcome.dropped.length > 0) {
    io.err(`dropped: ${outcome.dropped.length} item(s)`);
  }
  for (const pending of outcome.pending) {
    io.err(`pending: ${sanitizeTerminalText(pending.key)} (entry ${pending.entryRef})`);
  }
  io.err(
    `cost: $${outcome.cost.totalUsd.toFixed(4)}${
      outcome.cost.usageApprox === true
        ? ' (approximate: some usage was estimated, not reported by the provider)'
        : ''
    }`,
  );
  for (const [model, usd] of Object.entries(outcome.cost.byModel)) {
    io.err(`  by model ${sanitizeTerminalText(model)}: $${usd.toFixed(4)}`);
  }
  for (const [phase, usd] of Object.entries(outcome.cost.byPhase)) {
    if (phase !== '') {
      io.err(`  by phase ${sanitizeTerminalText(phase)}: $${usd.toFixed(4)}`);
    }
  }
  if (outcome.cost.unpriced.length > 0) {
    io.err(
      `unpriced models: ${outcome.cost.unpriced.map((u) => sanitizeTerminalText(u.model)).join(', ')}`,
    );
  }
  switch (outcome.status) {
    case 'ok':
    case 'suspended':
      return 0;
    default:
      return 1;
  }
}

/**
 * `--strict` (the v1.40.0 improvement plan's completion contract): a
 * settled ok run whose orchestration acceptance envelope reports a
 * completion other than 'complete' exits nonzero, with the degraded
 * reasons printed. Outcomes without an acceptance envelope (a workflow
 * that never opted into orchestrate acceptance) and nonzero exit codes
 * pass through unchanged, so the flag never masks the ordinary status
 * exit and never bites a plain workflow.
 */
export function strictExitCode(outcome: RunOutcome<unknown>, base: number, io: CliIo): number {
  if (base !== 0 || outcome.status !== 'ok') {
    return base;
  }
  const value = outcome.value as
    { completion?: unknown; degradedReasons?: unknown } | null | undefined;
  const completion =
    typeof value === 'object' && value !== null && typeof value.completion === 'string'
      ? value.completion
      : undefined;
  if (completion === undefined || completion === 'complete') {
    return base;
  }
  io.err(
    `strict: the orchestration acceptance reports completion '${sanitizeTerminalText(completion)}'`,
  );
  const reasons = Array.isArray(value?.degradedReasons) ? value.degradedReasons : [];
  for (const reason of reasons.filter((entry): entry is string => typeof entry === 'string')) {
    io.err(`  ${sanitizeTerminalText(reason)}`);
  }
  return 1;
}
