/**
 * The run/suspend/resolve/resume loop shared by `rulvar run` and
 * `rulvar resume` (the CLI performs interactive resolution of suspended
 * approvals and external inputs). Prompts read
 * one line per pending suspension; EOF leaves the run suspended with a
 * notice, never an error.
 */
import {
  claimCoverageOf,
  sanitizeTerminalText,
  type ClaimCoverageGrade,
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

/** The closed grade vocabulary strict accepts from a persisted meta. */
const COVERAGE_GRADES: readonly ClaimCoverageGrade[] = [
  'full',
  'vacuous',
  'partial',
  'critical-uncovered',
  'judge-declined',
  'judge-failed',
];

/**
 * The claim-coverage grade of an outcome's acceptance envelope, when
 * one is derivable (RV1702): the stamped `coverage` field when it
 * carries a known grade, else {@link claimCoverageOf} over the counts
 * (a meta persisted before the grade shipped), else undefined.
 */
function coverageGradeOf(value: unknown): ClaimCoverageGrade | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const meta = (value as { claimConsistencyMeta?: unknown }).claimConsistencyMeta;
  if (typeof meta !== 'object' || meta === null) {
    return undefined;
  }
  const record = meta as {
    coverage?: unknown;
    draftCitingSentences?: unknown;
    truncated?: unknown;
    coveredCitingSentences?: unknown;
    criticalUncoveredTotal?: unknown;
    runFactPairsTruncated?: unknown;
    judgeFailed?: unknown;
    judgeDeclined?: unknown;
  };
  const stamped = COVERAGE_GRADES.find((grade) => grade === record.coverage);
  if (stamped !== undefined) {
    return stamped;
  }
  if (
    typeof record.draftCitingSentences !== 'number' ||
    typeof record.truncated !== 'boolean' ||
    typeof record.coveredCitingSentences !== 'number'
  ) {
    return undefined;
  }
  return claimCoverageOf({
    draftCitingSentences: record.draftCitingSentences,
    truncated: record.truncated,
    coveredCitingSentences: record.coveredCitingSentences,
    ...(typeof record.criticalUncoveredTotal === 'number'
      ? { criticalUncoveredTotal: record.criticalUncoveredTotal }
      : {}),
    ...(record.runFactPairsTruncated === true ? { runFactPairsTruncated: true as const } : {}),
    ...(record.judgeFailed === true ? { judgeFailed: true as const } : {}),
    ...(record.judgeDeclined === true ? { judgeDeclined: true as const } : {}),
  });
}

/**
 * `--strict` (the v1.40.0 improvement plan's completion contract): a
 * settled ok run whose orchestration acceptance envelope reports a
 * completion other than 'complete' exits nonzero, with the degraded
 * reasons printed. Outcomes without an acceptance envelope (a workflow
 * that never opted into orchestrate acceptance) and nonzero exit codes
 * pass through unchanged, so the flag never masks the ordinary status
 * exit and never bites a plain workflow.
 *
 * Completion answers for the CHILDREN, never for the artifact, so
 * strict also reads the deliverable verdict (RV2604): a
 * `deliverableAccepted: false` exits nonzero even under a green
 * completion, the row the twenty-fifth comparison run landed on when
 * its child roster passed and its declared contract refused every
 * synthesis. An ABSENT verdict is left alone, because nothing judged
 * anything and a host that declares no contract is its own judge.
 *
 * Completion is a MECHANICAL verdict, and the eighteenth comparison
 * benchmark showed how easily `completion: 'complete'` reads as
 * semantic green while the claim judge saw 40 of 144 citing sentences.
 * So strict also reads the claim-coverage grade (RV1702) when the
 * outcome carries a claim-consistency meta: `'judge-failed'` (nothing
 * was judged), `'judge-declined'` (RV2508: the judge was refused
 * admission and never dispatched, so nothing was judged either) and
 * `'critical-uncovered'` (declared claims went unverified) exit
 * nonzero, because all three previously slipped through strict as
 * green; `'partial'` prints its counts to stderr and keeps the exit,
 * because the bounded pass is the documented default and declaring
 * critical anchors is the opt-in that makes the subset enforceable,
 * and `'vacuous'` (RV2508: the draft cited nothing, so the configured
 * pass verified nothing) prints and keeps the exit too, because
 * citing nothing breaks no contract the pass declares.
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
  if (completion !== undefined && completion !== 'complete') {
    io.err(
      `strict: the orchestration acceptance reports completion '${sanitizeTerminalText(completion)}'`,
    );
    const reasons = Array.isArray(value?.degradedReasons) ? value.degradedReasons : [];
    for (const reason of reasons.filter((entry): entry is string => typeof entry === 'string')) {
      io.err(`  ${sanitizeTerminalText(reason)}`);
    }
    return 1;
  }
  // The DELIVERABLE verdict, ahead of any semantic grade (RV2604).
  // Completion is the acceptance policy's claim over CHILD statuses, and
  // the twenty-fifth comparison run is the row it misses: the child
  // roster passed, the declared finish contract refused the artifact,
  // the run settled on unvalidated output, and strict exited zero. A
  // coverage grade over an artifact the contract rejected answers a
  // question nobody should still be asking, so this check precedes it.
  //
  // `=== false` and not `!== true`: ABSENT means no `finishValidation`
  // was declared, so nothing judged anything, and that is the honest
  // answer of a run whose host is its own judge, not a failure (the
  // normative predicate in the observability guide draws the same line).
  if (outcome.deliverableAccepted === false) {
    io.err(
      'strict: the declared finish contract did not accept the artifact this run settled on' +
        (outcome.resultAvailable === false ? ', and the terminal carries no artifact at all' : ''),
    );
    return 1;
  }
  const grade = coverageGradeOf(value);
  if (grade === 'judge-failed' || grade === 'judge-declined' || grade === 'critical-uncovered') {
    io.err(
      `strict: claim coverage '${grade}': ` +
        (grade === 'judge-failed'
          ? 'the claim-consistency judge did not settle ok, so nothing was judged'
          : grade === 'judge-declined'
            ? // RV2508: a declined judge is a refused ADMISSION, not a
              // failed invocation, and nothing was judged either way.
              'the claim-consistency judge was refused admission and never dispatched, so ' +
              'nothing was judged'
            : 'declared critical anchors got no judged pair'),
    );
    return 1;
  }
  // A stamped below-floor block (RV1809): the run DECLARED a coverage
  // floor and the pass ran under it, so "complete but under-verified by
  // the declared floor" exits nonzero instead of reading green.
  const low = lowCoverageOf(value);
  if (low !== undefined) {
    io.err(
      'strict: claim coverage below the declared floor' +
        (typeof low.coverageRatio === 'number'
          ? `: coverage ${low.coverageRatio.toFixed(3)}` +
            (typeof low.coverageFloor === 'number'
              ? ` under floor ${String(low.coverageFloor)}`
              : '')
          : '') +
        (typeof low.runFactRatio === 'number'
          ? `; run facts ${low.runFactRatio.toFixed(3)}` +
            (typeof low.runFactFloor === 'number' ? ` under floor ${String(low.runFactFloor)}` : '')
          : ''),
    );
    return 1;
  }
  if (grade === 'partial') {
    io.err(
      "strict: claim coverage 'partial': the judge saw a bounded subset of the citing " +
        'sentences; declare critical anchors (or raise the pair bound) to make the subset ' +
        'enforceable',
    );
  }
  // A vacuous grade keeps the exit (RV2508): a draft that cites nothing
  // broke no contract the pass declares. It is still worth saying out
  // loud, because a configured claim-consistency pass over a citation
  // free document verified nothing at all, and that used to read as
  // the strongest grade in the vocabulary.
  if (grade === 'vacuous') {
    io.err(
      "strict: claim coverage 'vacuous': the draft carried no citing sentence, so the " +
        'configured claim-consistency pass verified nothing',
    );
  }
  return base;
}

/** The stamped below-floor block of an outcome's claim meta, when present (RV1809). */
function lowCoverageOf(value: unknown):
  | {
      coverageRatio?: unknown;
      coverageFloor?: unknown;
      runFactRatio?: unknown;
      runFactFloor?: unknown;
    }
  | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const meta = (value as { claimConsistencyMeta?: unknown }).claimConsistencyMeta;
  if (typeof meta !== 'object' || meta === null) {
    return undefined;
  }
  const low = (meta as { lowCoverage?: unknown }).lowCoverage;
  if (typeof low !== 'object' || low === null || Array.isArray(low)) {
    return undefined;
  }
  return low;
}
