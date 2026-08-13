/**
 * The four M5 commands of the canonical CLI grammar (no aliases in v1):
 *
 *   rulvar run <file|name> [--args JSON] [--store PATH] [--budget-usd N] [--strict]
 *   rulvar resume <runId>  [--store PATH] [--strict]
 *   rulvar runs ls         [--store PATH]
 *   rulvar inspect <runId> [--store PATH]
 *
 * `plan` and `kb` land with M6+/M10. Every command builds strictly from
 * the public @rulvar/core API.
 */
import { join } from 'node:path';

import {
  auditRuns,
  claimExpired,
  claimExpiry,
  ConfigError,
  costReportFromJournal,
  childRostersFromJournal,
  invoiceFromJournal,
  toolCalibrationFromJournal,
  journalPricingSnapshot,
  createEngine,
  FileModelKnowledgeStore,
  hashRunArgs,
  hashRunOutput,
  INBOX_PROPOSAL_TTL_DAYS,
  lastRunSettle,
  LeaseHeldError,
  logicalRunTelemetry,
  preflightEstimate,
  proposalStatement,
  readRunMeta,
  runProfile,
  reconcileRunMeta,
  remeasureQueue,
  sanitizeTerminalText,
  type CreateEngineOptions,
  type DeterminismEvents,
  type EvidenceRef,
  type GateRecord,
  type JournalEntry,
  type JournalPricingSnapshot,
  type LeasableStore,
  type Lease,
  type InvoiceExport,
  type ModelClaim,
  type ModelRef,
  type PreflightInput,
  type Pricing,
  type PreflightReport,
  type PreflightSpawnSpec,
  type RunMeta,
  type RunOptions,
  type Usage,
  type Workflow,
} from '@rulvar/core';

import { loadCliConfig, loadWorkflowModule, looksLikeFile } from './config.js';
import { applyRunProfile, assembleEngine } from './engine-assembly.js';
import { driveRun, reportDryRun, reportOutcome, strictExitCode } from './drive.js';
import { GRAMMAR, KB_FAMILY_USAGE, parseBudgetValue, parseCommand, usageOf } from './grammar.js';
import type { CliIo } from './io.js';

export interface CommandContext {
  cwd: string;
  io: CliIo;
}

/**
 * True exactly when a companion dynamic import failed because THAT
 * package is not installed (the v1.16.1 review P1): the Node code must
 * be ERR_MODULE_NOT_FOUND and the quoted missing specifier must be the
 * requested companion itself. A transitive miss inside a found
 * companion (same code, different quoted specifier) or any throw during
 * module evaluation is that package's own defect, never install advice.
 */
export function isCompanionMissing(error: unknown, specifier: string): boolean {
  return (
    error instanceof Error &&
    (error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND' &&
    error.message.includes(`'${specifier}'`)
  );
}

/**
 * Awaits a command-local companion import. Call sites keep the literal
 * `import('@rulvar/...')` so the specifier stays analyzable and the
 * tsdown external rule preserves it in dist. Missing package: the
 * friendly ConfigError install hint. Anything else: the original error
 * survives as `cause` under a command-prefixed message.
 */
export async function loadCompanion<T>(
  loading: Promise<unknown>,
  specifier: string,
  command: string,
  missingMessage: string,
): Promise<T> {
  try {
    return (await loading) as T;
  } catch (error) {
    if (isCompanionMissing(error, specifier)) {
      throw new ConfigError(missingMessage);
    }
    throw new Error(
      `${command}: ${specifier} is installed but failed to load; the cause below is a defect ` +
        'in the installed package or its dependencies, not a missing install',
      { cause: error },
    );
  }
}

/**
 * Parses --args JSON into workflow arguments; undefined when absent.
 *
 * CLI args must be representable in canonical JCS, i.e. finite JSON. A
 * numeric literal that overflows JavaScript's finite range parses to
 * Infinity, which `hashRunArgs` cannot canonicalize, so genesis would
 * record `argsProvided` WITHOUT a hash and the resume gate would soften
 * to an unverifiable warning that lets changed args through (v1.24.0
 * review P2-1). A CLI value always arrives as JSON text, so it can
 * always be canonicalized; reject the non-finite case here, before any
 * config, store, or adapter loads, instead of letting it defeat the gate
 * later. In-process hosts keep the wider engine contract (functions,
 * BigInt, cycles record presence without a hash); the CLI does not need
 * it.
 *
 * Diagnostics name the failure class and the way out but never echo the
 * value: workflow args may carry private data, and stderr routinely
 * lands in CI logs (v1.24.1 review P2-1).
 */
function parseArgsJson(raw: string | undefined): unknown {
  if (raw === undefined) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigError(
      '--args is not valid JSON; check the JSON syntax and shell quoting (the value is ' +
        'withheld from diagnostics: workflow args may carry private data)',
    );
  }
  try {
    hashRunArgs(parsed);
  } catch {
    throw new ConfigError(
      `--args is not representable as canonical JSON: a numeric value overflows JavaScript's ` +
        `finite range (e.g. 1e400 parses to Infinity). Supply finite JSON so the run's args ` +
        'binding can be hashed and later verified on resume (the value is withheld from ' +
        'diagnostics: workflow args may carry private data)',
    );
  }
  return parsed;
}

export async function runCommand(argv: string[], context: CommandContext): Promise<number> {
  const parsed = parseCommand(GRAMMAR.run, argv);
  const target = parsed.positionals[0];
  const store = parsed.values.store as string | undefined;
  const profile = parsed.values.profile as string | undefined;
  const budgetUsd =
    parsed.values['budget-usd'] === undefined
      ? undefined
      : parseBudgetValue('budget-usd', parsed.values['budget-usd'] as string);
  const args = parseArgsJson(parsed.values.args as string | undefined);
  const config = await loadCliConfig(context.cwd);
  const module = looksLikeFile(target) ? await loadWorkflowModule(target, context.cwd) : undefined;
  const assembled = assembleEngine({
    config,
    ...(module === undefined ? {} : { module }),
    ...(store === undefined ? {} : { storePath: store }),
    ...(profile === undefined ? {} : { profile }),
    cwd: context.cwd,
  });
  const workflow = module?.workflow ?? assembled.workflows[target];
  if (workflow === undefined) {
    throw new ConfigError(
      looksLikeFile(target)
        ? `${target} exports no workflow (default export or named 'workflow')`
        : `no workflow named '${target}' in the registry; register it in rulvar.config.mjs`,
    );
  }
  const runOptions: RunOptions = {
    ...(budgetUsd === undefined ? {} : { budgetUsd }),
  };
  const first = assembled.engine.run(
    workflow as unknown as Workflow<unknown, unknown>,
    args,
    runOptions,
  );
  context.io.err(`runId: ${first.runId}`);
  const outcome = await driveRun({
    engine: assembled.engine,
    workflow,
    first,
    io: context.io,
    args,
  });
  const base = reportOutcome(outcome, context.io);
  return parsed.values.strict === true ? strictExitCode(outcome, base, context.io) : base;
}

/**
 * The resume args safety gate (the v1.23.0 review): a run's logical
 * identity includes its genesis args, so a resume that silently drops,
 * adds, or changes them is refused BEFORE the engine starts (zero
 * provider calls, zero journal writes). `--allow-args-change` is the
 * explicit override for every divergence class; legacy runs recorded
 * before the binding existed require it (or explicit `--args`) because
 * nothing can be verified against them.
 */
function enforceArgsBinding(input: {
  meta: RunMeta;
  argsGiven: boolean;
  args: unknown;
  allowChange: boolean;
  io: CliIo;
  /** The deployment argsHash salt (RV-217); must match the engine's. */
  salt?: string;
}): void {
  const { meta, argsGiven, args, allowChange, io } = input;
  // Warnings print directly (no runCli catch in between), and the runId
  // here comes from the store meta file, so it is sanitized before it
  // reaches a terminal line (v1.24.1 review P2-1). Thrown ConfigError
  // messages are sanitized once at the runCli print site instead.
  const runRef = sanitizeTerminalText(meta.runId);
  if (meta.argsProvided === undefined) {
    // Legacy run: the marker predates it; nothing can be verified.
    if (!argsGiven && !allowChange) {
      throw new ConfigError(
        `run '${meta.runId}' predates the args binding (rulvar < 1.24.0), so the CLI cannot ` +
          'tell whether it was started with --args, and resuming without them silently ' +
          'changes the logical run if any were used at start. Re-supply the original ' +
          `--args, or acknowledge explicitly with --allow-args-change; ${usageOf(GRAMMAR.resume)}`,
      );
    }
    if (argsGiven) {
      io.err(
        `warning: run '${runRef}' predates the args binding; the supplied --args cannot ` +
          'be verified against the original invocation',
      );
    }
    return;
  }
  if (meta.argsProvided) {
    if (!argsGiven) {
      if (!allowChange) {
        throw new ConfigError(
          `run '${meta.runId}' was started WITH args, but this resume supplies none; the ` +
            'workflow would see undefined and every args-dependent call would become new ' +
            'paid work instead of a replay. Re-supply the original --args, or force the ' +
            `change with --allow-args-change; ${usageOf(GRAMMAR.resume)}`,
        );
      }
      io.err(`warning: resuming '${runRef}' without its genesis args (--allow-args-change)`);
      return;
    }
    if (meta.argsHash === undefined) {
      // The run recorded that it started WITH args but no verifiable
      // hash: its genesis args were not JCS-serializable (an in-process
      // host passing functions, a BigInt, a cycle, or a non-finite
      // number; the CLI itself now rejects non-finite --args at parse
      // time). Nothing can confirm the supplied --args match, so this is
      // the same silent-divergence hazard as a mismatch, not a soft
      // warning that lets any value through (v1.24.0 review P2-1).
      if (!allowChange) {
        throw new ConfigError(
          `run '${meta.runId}' started WITH args but recorded no verifiable hash (the genesis ` +
            'args were not JCS-serializable), so the CLI cannot confirm the supplied --args ' +
            'match the original; resuming risks silently changing the logical run and re-paying ' +
            `every args-dependent call. Force deliberately with --allow-args-change; ${usageOf(GRAMMAR.resume)}`,
        );
      }
      io.err(
        `warning: run '${runRef}' recorded args presence but no hash (genesis args not ` +
          'JCS-serializable); the supplied --args cannot be verified (--allow-args-change)',
      );
      return;
    }
    let supplied: string | undefined;
    try {
      supplied = hashRunArgs(args, input.salt === undefined ? undefined : { salt: input.salt });
    } catch {
      // Defense in depth: parseArgsJson already rejects non-canonical
      // CLI args before the gate, so this is unreachable from the CLI. A
      // future caller reaching enforceArgsBinding with non-JCS args gets
      // a typed refusal, never a raw serialization exception (v1.24.0
      // review P2-1 item 3).
      throw new ConfigError(
        `--args cannot be canonicalized to compare against run '${meta.runId}' (a numeric value ` +
          'overflows the finite range, or the value is otherwise not canonical JSON); supply ' +
          `finite JSON, or force the resume with --allow-args-change; ${usageOf(GRAMMAR.resume)}`,
      );
    }
    if (supplied !== meta.argsHash) {
      if (!allowChange) {
        throw new ConfigError(
          `--args does not match the args run '${meta.runId}' was started with (recorded ` +
            `hash ${meta.argsHash.slice(0, 12)}, supplied ${supplied?.slice(0, 12) ?? 'none'}); ` +
            'changed args silently change the logical run and re-pay every args-dependent ' +
            `call. Force deliberately with --allow-args-change; ${usageOf(GRAMMAR.resume)}`,
        );
      }
      io.err(`warning: resuming '${runRef}' with changed args (--allow-args-change)`);
    }
    return;
  }
  // argsProvided false: the run genuinely started without args, so a
  // bare resume stays the convenient, silent path.
  if (argsGiven) {
    if (!allowChange) {
      throw new ConfigError(
        `run '${meta.runId}' was started WITHOUT args, but this resume supplies some; added ` +
          'args silently change the logical run. Drop --args, or force the change with ' +
          `--allow-args-change; ${usageOf(GRAMMAR.resume)}`,
      );
    }
    io.err(`warning: resuming no-args run '${runRef}' with args (--allow-args-change)`);
  }
}

export async function resumeCommand(argv: string[], context: CommandContext): Promise<number> {
  // resume accepts EXACTLY the documented grammar (v1.16.2 review
  // P2-1): --budget-usd and --profile are rejected here at parse time,
  // before any config, store, or adapter loads. There is nothing they
  // could mean: the ceiling B0 is immutable from genesis by the
  // documented budget invariant (ResumeOptions carries no budget by
  // design), and a profile shapes engine assembly only at run start.
  const parsed = parseCommand(GRAMMAR.resume, argv);
  const runId = parsed.positionals[0];
  // Args are not journaled: the host re-supplies them on resume. The
  // genesis binding recorded in RunMeta (argsProvided/argsHash) turns a
  // forgotten or changed value into a typed refusal instead of a
  // silently different logical run that pays again (v1.23.0 review).
  const rawArgs = parsed.values.args as string | undefined;
  const args = parseArgsJson(rawArgs);
  const argsGiven = rawArgs !== undefined;
  const dryRun = parsed.values['dry-run'] === true;
  const allowChange = parsed.values['allow-args-change'] === true;
  const store = parsed.values.store as string | undefined;
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(store === undefined ? {} : { storePath: store }),
    cwd: context.cwd,
  });
  const meta = await readRunMeta(assembled.store, runId);
  if (meta === undefined) {
    throw new ConfigError(`run '${runId}' not found in the store`);
  }
  enforceArgsBinding({
    meta,
    argsGiven,
    args,
    allowChange,
    io: context.io,
    ...(assembled.argsHashSalt === undefined ? {} : { salt: assembled.argsHashSalt }),
  });
  const name = meta.workflowName;
  const workflow =
    name === undefined
      ? undefined
      : (assembled.workflows[name] as Workflow<never, unknown> | undefined);
  if (workflow === undefined) {
    throw new ConfigError(
      `run '${runId}' was started from workflow '${name ?? '(unknown)'}'; register it under ` +
        `that name in rulvar.config.mjs workflows to resume ` +
        '(resume requires the in-process workflow value)',
    );
  }
  const first = assembled.engine.resume(runId, workflow as unknown as Workflow<unknown, unknown>, {
    args,
    ...(dryRun ? { dryRun: true } : {}),
  });
  if (dryRun) {
    return await reportDryRun(first, context.io);
  }
  const outcome = await driveRun({
    engine: assembled.engine,
    workflow,
    first,
    io: context.io,
    args,
  });
  const base = reportOutcome(outcome, context.io);
  return parsed.values.strict === true ? strictExitCode(outcome, base, context.io) : base;
}

/**
 * `rulvar replay` (RV-209): replay-strict verification of a recorded
 * run. Resumes under the engine's dry-run mode (zero journal or meta
 * writes, zero adapter calls; the first would-be-live call is a typed
 * JournalMissError settle), then reports the replay accounting, every
 * determinism warning the re-executed body raised (with its localized
 * frame), and the output digest comparison against the journaled
 * settle. `--assert-no-live` exits nonzero unless the replay was pure
 * (zero misses, zero reruns); `--compare-output-hash` exits nonzero
 * unless the replayed result's JCS sha256 equals the recorded
 * `outputHash`. Without flags the command reports and exits 0, so it
 * can sit in a pipeline as a diagnostic before it gates anything.
 * Args follow the resume binding exactly, but there is no
 * --allow-args-change here: changed args change the logical run, and a
 * verification against a different logical run proves nothing.
 */
export async function replayCommand(argv: string[], context: CommandContext): Promise<number> {
  const parsed = parseCommand(GRAMMAR.replay, argv);
  const runId = parsed.positionals[0];
  const rawArgs = parsed.values.args as string | undefined;
  const args = parseArgsJson(rawArgs);
  const argsGiven = rawArgs !== undefined;
  const assertNoLive = parsed.values['assert-no-live'] === true;
  const compareOutputHash = parsed.values['compare-output-hash'] === true;
  const store = parsed.values.store as string | undefined;
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(store === undefined ? {} : { storePath: store }),
    cwd: context.cwd,
  });
  const meta = await readRunMeta(assembled.store, runId);
  if (meta === undefined) {
    throw new ConfigError(`run '${runId}' not found in the store`);
  }
  enforceArgsBinding({
    meta,
    argsGiven,
    args,
    allowChange: false,
    io: context.io,
    ...(assembled.argsHashSalt === undefined ? {} : { salt: assembled.argsHashSalt }),
  });
  const name = meta.workflowName;
  const workflow =
    name === undefined
      ? undefined
      : (assembled.workflows[name] as Workflow<never, unknown> | undefined);
  if (workflow === undefined) {
    throw new ConfigError(
      `run '${runId}' was started from workflow '${name ?? '(unknown)'}'; register it under ` +
        `that name in rulvar.config.mjs workflows to replay ` +
        '(replay requires the in-process workflow value)',
    );
  }
  const handle = assembled.engine.resume(runId, workflow as unknown as Workflow<unknown, unknown>, {
    args,
    dryRun: true,
  });
  const warnings: DeterminismEvents[] = [];
  const consumer = (async () => {
    for await (const event of handle.events) {
      if (event.type === 'determinism:warning') {
        warnings.push(event);
      }
    }
  })().catch(() => undefined);
  const outcome = await handle.result;
  const preview = await handle.preview;
  await consumer;
  const recorded = lastRunSettle(await assembled.store.load(runId));
  const io = context.io;
  io.err(
    `replay of '${sanitizeTerminalText(runId)}' (zero journal or meta writes, zero adapter calls):`,
  );
  io.err(
    `  hits: ${preview.hits}  misses: ${preview.misses}  reruns: ${preview.reruns}  ` +
      `skipped: ${preview.skipped}`,
  );
  io.err(
    recorded === undefined
      ? '  recorded settle: none (journal predates the settle entry)'
      : `  recorded settle: ${recorded.runStatus}`,
  );
  io.err(`  replayed settle: ${outcome.status}`);
  if (outcome.error !== undefined && outcome.error.code !== 'journal_miss') {
    io.err(`  error: ${sanitizeTerminalText(outcome.error.message)}`);
  }
  for (const warning of warnings) {
    // The frame carries its own `at ...`; a parsed location renders as
    // the compact site instead.
    const where =
      warning.file === undefined
        ? warning.frame
        : `at ${warning.file}:${warning.line ?? '?'}:${warning.column ?? '?'}`;
    io.err(
      `  determinism: ${warning.category} (${warning.provenance}) ${sanitizeTerminalText(where)}`,
    );
  }
  let exit = 0;
  if (assertNoLive) {
    const pure =
      preview.misses === 0 && preview.reruns === 0 && outcome.error?.code !== 'journal_miss';
    if (pure) {
      io.err('  assert-no-live: PASS (pure replay, zero would-be-live calls)');
    } else {
      io.err(
        `  assert-no-live: FAIL (misses ${preview.misses}, reruns ${preview.reruns}: ` +
          'a real resume would perform new paid work)',
      );
      exit = 1;
    }
  }
  if (compareOutputHash) {
    const replayedHash = hashRunOutput(outcome.value);
    if (recorded?.outputHash === undefined) {
      io.err(
        '  compare-output-hash: FAIL (the recorded settle carries no output hash: the run ' +
          'predates it, settled without a value, or the value is not JCS-serializable)',
      );
      exit = 1;
    } else if (replayedHash === undefined) {
      io.err('  compare-output-hash: FAIL (the replayed run produced no hashable value)');
      exit = 1;
    } else if (replayedHash === recorded.outputHash) {
      io.err(`  compare-output-hash: PASS (${replayedHash.slice(0, 12)})`);
    } else {
      io.err(
        `  compare-output-hash: FAIL (recorded ${recorded.outputHash.slice(0, 12)}, ` +
          `replayed ${replayedHash.slice(0, 12)}: the workflow does not reproduce its output)`,
      );
      exit = 1;
    }
  }
  return exit;
}

/**
 * The stranded run probe and reconciler (fenced run state RFC, phase
 * 3): audits every run the catalog lists against its journal, prints
 * the divergences worker sweeps can never see, and with --repair
 * rewrites the sound ones from the journal (under a brief lease when
 * the store is leasable, so a live owner is never raced). Exit 0 when
 * the catalog ends clean; exit 1 while any divergence remains.
 */
export async function runsAuditCommand(argv: string[], context: CommandContext): Promise<number> {
  const parsed = parseCommand(GRAMMAR['runs audit'], argv);
  const store = parsed.values.store as string | undefined;
  const repair = parsed.values.repair === true;
  // The verify-only read (RV1512): --no-load-repair opens the default
  // JSONL store with the torn-tail repair disarmed, so the audit
  // never rewrites the journal it is verifying. Meaningless beside
  // --repair, which exists to rewrite: refused typed.
  const noLoadRepair = parsed.values['no-load-repair'] === true;
  if (noLoadRepair && repair) {
    context.io.err('runs audit: --no-load-repair and --repair contradict; pick one');
    return 1;
  }
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(store === undefined ? {} : { storePath: store }),
    ...(noLoadRepair ? { repairOnLoad: false } : {}),
    cwd: context.cwd,
  });
  const audits = await auditRuns(assembled.store);
  if (audits.length === 0) {
    context.io.err('every run is consistent with its journal');
    return 0;
  }
  let remaining = 0;
  for (const audit of audits) {
    const line = `${audit.runId} ${audit.verdict}: ${audit.reason}`;
    if (!repair || audit.repairTo === undefined) {
      context.io.out(sanitizeTerminalText(line));
      remaining += 1;
      continue;
    }
    // The brief operator lease, exactly like the worker's retention
    // sweep: on a leasable store a live owner makes acquire reject and
    // the run is skipped, never raced.
    const leasable = assembled.store as Partial<LeasableStore>;
    let lease: Lease | undefined;
    if (typeof leasable.acquire === 'function') {
      try {
        lease = await leasable.acquire(audit.runId, `runs-audit-${String(process.pid)}`);
      } catch (thrown) {
        if (thrown instanceof LeaseHeldError) {
          context.io.out(sanitizeTerminalText(`${line} (leased by a live owner, skipped)`));
          remaining += 1;
          continue;
        }
        throw thrown;
      }
    }
    try {
      const result = await reconcileRunMeta(assembled.store, audit.runId, {
        ...(lease === undefined ? {} : { lease }),
      });
      // The repaired status comes from the INNER audit: the run may
      // have moved between the listing and the repair.
      const wrote = result.audit.repairTo;
      context.io.out(
        sanitizeTerminalText(
          result.repaired ? `${line} (repaired to '${String(wrote)}')` : `${line} (not repaired)`,
        ),
      );
      if (!result.repaired) {
        remaining += 1;
      }
    } finally {
      if (lease !== undefined && typeof leasable.release === 'function') {
        await leasable.release(lease);
      }
    }
  }
  context.io.err(
    remaining === 0
      ? 'every divergence repaired'
      : `${String(remaining)} divergence(s) remain; suspect verdicts need an operator ` +
          '(https://docs.rulvar.com/contributing/rfc-fenced-run-state)',
  );
  return remaining === 0 ? 0 : 1;
}

export async function runsLsCommand(argv: string[], context: CommandContext): Promise<number> {
  const parsed = parseCommand(GRAMMAR['runs ls'], argv);
  const store = parsed.values.store as string | undefined;
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(store === undefined ? {} : { storePath: store }),
    cwd: context.cwd,
  });
  const metas = await assembled.store.listRuns();
  if (metas.length === 0) {
    context.io.err('no runs in the store');
    return 0;
  }
  for (const meta of metas) {
    const workflow = meta.workflowName === undefined ? '' : ` workflow=${meta.workflowName}`;
    const name = meta.name === undefined ? '' : ` name=${meta.name}`;
    context.io.out(`${meta.runId} ${meta.status} updated=${meta.updatedAt}${workflow}${name}`);
  }
  return 0;
}

export async function inspectCommand(argv: string[], context: CommandContext): Promise<number> {
  const parsed = parseCommand(GRAMMAR.inspect, argv);
  const runId = parsed.positionals[0];
  const store = parsed.values.store as string | undefined;
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(store === undefined ? {} : { storePath: store }),
    cwd: context.cwd,
  });
  const meta = await readRunMeta(assembled.store, runId);
  if (meta === undefined) {
    throw new ConfigError(`run '${runId}' not found in the store`);
  }
  const entries = await assembled.store.load(runId);
  context.io.out(`run ${meta.runId}: ${meta.status} (updated ${meta.updatedAt})`);
  if (meta.workflowName !== undefined) {
    context.io.out(`workflow: ${meta.workflowName}`);
  }
  // The genesis args binding participates in inspect (v1.23.0 review):
  // the full hash so external tooling can compare without re-deriving.
  if (meta.argsProvided !== undefined) {
    context.io.out(
      meta.argsProvided
        ? `args at genesis: provided${meta.argsHash === undefined ? ' (no hash: not JCS-serializable)' : ` (hash ${meta.argsHash})`}`
        : 'args at genesis: none',
    );
  }
  // Journal summary without payload parsing beyond the engine's own
  // entry shapes (M5-T01 acceptance): counts per kind, terminal
  // statuses, and open suspensions from the entries themselves.
  const byKind = new Map<string, number>();
  let openSuspensions = 0;
  const resolvedRefs = new Set<number>();
  for (const entry of entries) {
    byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1);
    if (entry.kind === 'resolution' && typeof entry.ref === 'number') {
      resolvedRefs.add(entry.ref);
    }
  }
  for (const entry of entries) {
    if ((entry.kind === 'external' || entry.kind === 'approval') && entry.status === 'suspended') {
      if (!resolvedRefs.has(entry.seq)) {
        openSuspensions += 1;
      }
    }
  }
  context.io.out(`entries: ${entries.length}`);
  for (const [kind, count] of [...byKind.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    context.io.out(`  ${kind}: ${count}`);
  }
  context.io.out(`open suspensions: ${openSuspensions}`);
  // The logical run behind the entry count (RV2605). `entries: 126` over
  // a resumed run is one heap with no boundaries in it, and reconciling
  // a killed-and-resumed run used to be hand work over a joined journal.
  // logicalRunTelemetry (RV2510) partitions the SAME entries at the
  // settle boundaries, so nothing is counted twice and no new field is
  // read; a single-segment run prints one line that says so.
  const logical = logicalRunTelemetry(entries);
  if (logical.segments > 0) {
    context.io.out(
      `segments: ${logical.segments} (${logical.statuses
        .map(
          (status, index) =>
            `${sanitizeTerminalText(status)} after ${String(logical.entriesPerSegment[index] ?? 0)}`,
        )
        .join(', ')})`,
    );
    if (logical.entriesAfterLastSettle > 0) {
      // RV1407: the journal continued past its terminal, so the last
      // settled status is not the run's last word.
      context.io.out(`  entries after the last settle: ${logical.entriesAfterLastSettle}`);
    }
  }
  // What the finish contract REFUSED (RV2507), read back from the settle
  // that recorded it (RV2605): three rows sharing one hash is the model
  // serving the same document three times, a different failure from
  // three genuine attempts, and reading it used to take an external
  // script over the whole agent transcript.
  const settled = lastRunSettle(entries);
  // What the last settle CLAIMED about the work, beside the status it
  // transported (RV2703). `lastRunSettle` has returned this since the
  // persisted-terminal tail and inspect printed the acceptance decision
  // only, so a run that died before acceptance, or one resumed past it,
  // showed a reader nothing at all. Absent prints nothing (RV1209): a
  // workflow that makes no completion claim is not an incomplete run.
  if (settled?.completion !== undefined) {
    context.io.out(
      `completion: ${settled.completion}` +
        (settled.completion === 'complete'
          ? ' (the last settle claims the work is complete)'
          : ' (the last settle claims the work is NOT complete)'),
    );
  }
  // What the children produced, folded from the journal (RV2702). The
  // live field dies with the process that held it, and a post-mortem
  // has only this: for a run that crossed its ceiling mid-roster, these
  // are the only lines that account for work already paid for.
  for (const roster of childRostersFromJournal(entries)) {
    const statusCounts = new Map<string, number>();
    for (const child of roster.children) {
      if (child.status !== undefined) {
        statusCounts.set(child.status, (statusCounts.get(child.status) ?? 0) + 1);
      }
    }
    const settledChildren = roster.children.filter((child) => child.status !== undefined);
    const statuses = [...statusCounts.entries()]
      .map(([status, count]) => `${sanitizeTerminalText(status)} ${String(count)}`)
      .join(', ');
    context.io.out(
      `children under ${sanitizeTerminalText(roster.childScope)}: ${roster.admitted} admitted, ` +
        `${settledChildren.length} settled` +
        (statuses === '' ? '' : ` (${statuses})`) +
        (roster.rejected === 0 ? '' : `; ${roster.rejected} refused admission`),
    );
    if (roster.children.length < roster.admitted) {
      // An admission whose dispatch never reached the journal: named,
      // because a child that was authorised and never ran is a fact
      // about the run, not a rounding difference.
      context.io.out(
        `  admitted with no dispatch entry: ${roster.admitted - roster.children.length}`,
      );
    }
    const belowFloor = roster.children.filter(
      (child) => child.status === 'ok' && child.evidence?.met === false,
    );
    if (belowFloor.length > 0) {
      // The child that looks healthiest and is not (RV806).
      context.io.out(
        `  settled ok below their declared evidence floor: ${belowFloor.length} ` +
          `(handle${belowFloor.length === 1 ? '' : 's'} ` +
          `${belowFloor.map((child) => String(child.handle)).join(', ')})`,
      );
    }
    const unsettled = roster.children.filter((child) => child.status === undefined);
    if (unsettled.length > 0) {
      context.io.out(
        `  dispatched with no terminal in the journal: ${unsettled.length} ` +
          `(handle${unsettled.length === 1 ? '' : 's'} ` +
          `${unsettled.map((child) => String(child.handle)).join(', ')})`,
      );
    }
    const discarded = roster.children.filter((child) => child.abandoned === true);
    if (discarded.length > 0) {
      // Counted in the line above and thrown away all the same (RV2804):
      // the provider billed this work, and the run kept none of it.
      context.io.out(
        `  on branches the run ABANDONED: ${discarded.length} ` +
          `(handle${discarded.length === 1 ? '' : 's'} ` +
          `${discarded.map((child) => String(child.handle)).join(', ')})`,
      );
    }
  }
  // The observed tool-budget calibration (RV3103): the RV3003 fold
  // beside the roster it reads, so a parity post-mortem gets the
  // observed calls-per-evidence-entry without a hand-built script.
  // RV1209 in operator output: the aggregate line exists only when at
  // least one dispatch paired both sides, unpaired sides are named
  // instead of zeroed, and a journal carrying neither side prints
  // nothing at all.
  {
    const calibration = toolCalibrationFromJournal(entries);
    if (calibration.aggregate !== undefined) {
      const rate =
        calibration.aggregate.callsPerEntry === undefined
          ? 'no ratio (0 recorded entries)'
          : calibration.aggregate.callsPerEntry.toFixed(2);
      context.io.out(
        `observed tool calls per recorded evidence entry: ${rate} ` +
          `(${calibration.aggregate.toolCallsUsed} executed calls over ` +
          `${calibration.aggregate.recordedEntries} entries across ` +
          `${calibration.observed.length} paired dispatch` +
          `${calibration.observed.length === 1 ? '' : 'es'})`,
      );
    }
    if (calibration.evidenceOnly.length > 0) {
      context.io.out(
        `  declared evidence contracts with no journaled call counter: ` +
          `${calibration.evidenceOnly.length} (a journal written before the counter ` +
          `shipped records no rate)`,
      );
    }
    if (calibration.aggregate !== undefined && calibration.budgetOnly.length > 0) {
      context.io.out(
        `  journaled counters with no declared contract: ${calibration.budgetOnly.length}`,
      );
    }
  }
  const rejected = settled?.rejectedFinishCandidates ?? [];
  if (rejected.length > 0) {
    const distinct = new Set(rejected.map((row) => row.hash)).size;
    context.io.out(
      `rejected finish candidates: ${rejected.length}` +
        (distinct === rejected.length ? '' : ` (${distinct} distinct document(s))`),
    );
    for (const row of rejected) {
      context.io.out(
        `  ${sanitizeTerminalText(row.verdict)} ${sanitizeTerminalText(row.callId)}: ` +
          `${row.chars} chars, sha256 ${row.hash.slice(0, 12)}, failed ` +
          `${row.failed.map((entry) => sanitizeTerminalText(entry.name)).join(', ')}` +
          (row.ref === undefined ? '' : ` (bytes at ${sanitizeTerminalText(row.ref)})`),
      );
    }
  }
  // Cost view (M5-T03): the pure journal fold. Priced by the run's own
  // settle pins COMPOSED with the config's current table (RV611), the
  // engine's outcome-mirror rule: pin-covered rows at the rates their
  // own settle recorded, the tail past the last pin at the current
  // table; unpriced surfaces, never silent zero.
  const inspectSnapshot = journalPricingSnapshot(entries);
  const cost = costReportFromJournal(
    entries,
    inspectSnapshot === undefined
      ? assembled.priceUsd
      : inspectSnapshot.composedPriceUsd(assembled.priceUsd),
  );
  context.io.out(`cost: $${cost.totalUsd.toFixed(4)}`);
  // The provenance line (RV3311): a journal fold is deterministic
  // local accounting, and the inspect surface must say so before a
  // reader treats it as a bill.
  context.io.out(`billing basis: ${cost.basis} (a local estimate, never a provider statement)`);
  if (inspectSnapshot !== undefined) {
    context.io.out(
      'pricing: run-settle pins composed with the current table' +
        pinVersionsSuffix(inspectSnapshot, assembled.currentPricingVersion),
    );
  }
  // The gross/net split surfaces only when the run actually abandoned
  // paid work (P1.3); every other inspect output stays byte-identical.
  if (cost.abandoned.usd > 0) {
    context.io.out(
      `gross: $${cost.grossUsd.toFixed(4)} (abandoned: $${cost.abandoned.usd.toFixed(4)}; ` +
        'see rulvar invoice)',
    );
  }
  for (const [model, usd] of Object.entries(cost.byModel)) {
    context.io.out(`  ${model}: $${usd.toFixed(4)}`);
  }
  for (const item of cost.unpriced) {
    context.io.out(
      `  unpriced: ${item.model} (${item.usage.inputTokens + item.usage.outputTokens} tok)`,
    );
  }
  // The acceptance verdict from its journaled decision (RV806):
  // completion, salvage, and the per-child evidence verdicts. Transport
  // status alone does not say the work is complete; gate on the
  // (status, completion) pair.
  for (const entry of entries) {
    if (entry.kind !== 'decision') {
      continue;
    }
    const value = entry.value as
      | {
          decisionType?: string;
          verdict?: string;
          completion?: string;
          salvagedPartialChildren?: string[];
          salvagedTerminalOutputChildren?: string[];
          children?: Array<{
            child: string;
            status: string;
            salvage?: string;
            evidence?: {
              recordedEntries: number;
              minEntries: number;
              met: boolean;
              waivedBySalvage?: true;
            };
          }>;
        }
      | undefined;
    if (value?.decisionType === 'orchestrator_acceptance') {
      context.io.out(
        `acceptance: ${value.verdict ?? 'unknown'} (completion ${value.completion ?? 'unknown'}; ` +
          'gate on the status and completion PAIR)',
      );
      if ((value.salvagedPartialChildren?.length ?? 0) > 0) {
        context.io.out(`  salvaged partial: ${(value.salvagedPartialChildren ?? []).join(', ')}`);
      }
      if ((value.salvagedTerminalOutputChildren?.length ?? 0) > 0) {
        context.io.out(
          `  salvaged terminal output: ${(value.salvagedTerminalOutputChildren ?? []).join(', ')}`,
        );
      }
      for (const child of value.children ?? []) {
        if (child.evidence === undefined) {
          continue;
        }
        const marker = child.evidence.met
          ? 'met'
          : child.evidence.waivedBySalvage === true
            ? 'below floor, waived by salvage'
            : 'below floor';
        context.io.out(
          `  evidence ${child.child}: ${String(child.evidence.recordedEntries)} of ` +
            `${String(child.evidence.minEntries)} (${marker})`,
        );
      }
    }
    if (value?.decisionType === 'quota_drift') {
      const drift = entry.value as {
        provider?: string;
        model?: string;
        dimension?: string;
        declaredPerMinute?: number;
        reportedPerMinute?: number;
      };
      context.io.out(
        `quota drift: ${drift.provider ?? '?'}:${drift.model ?? '?'} ${drift.dimension ?? '?'} ` +
          `declared ${String(drift.declaredPerMinute ?? '?')}/min vs provider ` +
          `${String(drift.reportedPerMinute ?? '?')}/min (per-minute window, not cumulative)`,
      );
    }
  }
  for (const entry of entries) {
    const status = entry.status === undefined ? '' : ` ${entry.status}`;
    const served = entry.servedBy === undefined ? '' : ` servedBy=${entry.servedBy}`;
    context.io.out(`#${entry.seq} ${entry.kind}${status}${served}`);
  }
  return 0;
}

/**
 * rulvar invoice (P1.3): the per-dispatch reconciliation export from
 * the journal's providerCalls ledger, one row per billable provider
 * call with the provider's response id when the adapter surfaced one,
 * plus the gross/net ledger totals (`totalUsd` here is the GROSS
 * figure: abandoned subtrees included, exactly what a provider invoice
 * bills). --json prints the machine-readable InvoiceExport; the text
 * form prints one line per row and mirrors the export's declared
 * pricing basis honestly (RV511): fully attributed runs price per
 * request and the rows sum to gross; an aggregate-priced remainder or
 * legacy entry makes the export say `row usd is non-additive`, and
 * `allocatedUsd` is the additive column that sums to gross in every
 * case. Pricing folds at read time from the run's settle pins composed
 * with the assembled price table (RV611), the same numbers rulvar
 * inspect reports and the engine's own settle mirrors.
 */
export async function invoiceCommand(argv: string[], context: CommandContext): Promise<number> {
  const parsed = parseCommand(GRAMMAR.invoice, argv);
  const runId = parsed.positionals[0];
  const store = parsed.values.store as string | undefined;
  const json = parsed.values.json === true;
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(store === undefined ? {} : { storePath: store }),
    cwd: context.cwd,
  });
  const meta = await readRunMeta(assembled.store, runId);
  if (meta === undefined) {
    throw new ConfigError(`run '${runId}' not found in the store`);
  }
  const entries = await assembled.store.load(runId);
  // The run's settle pins compose with the config's current table
  // (RV611), the engine's outcome-mirror rule: pin-covered rows
  // reproduce the numbers the run settled with whatever the table says
  // today (RV407), and the tail past the last pin (a segment journaled
  // but never settled) prices at the current table instead of silently
  // at the last pin; journals without a pin keep the current-table
  // fold. The export declares the rule, every pinned version with its
  // boundaries, and the composition bound.
  const snapshot = journalPricingSnapshot(entries);
  // The current table names itself (RV706): the pinned segments each
  // declare their version, and the version that priced the tail (or,
  // without a snapshot, the whole fold) rides along instead of staying
  // anonymous. Absent when the config declares no table.
  const currentVersion =
    assembled.currentPricingVersion === undefined
      ? {}
      : { currentPricingVersion: assembled.currentPricingVersion };
  const invoice = invoiceFromJournal(
    entries,
    snapshot === undefined ? assembled.priceUsd : snapshot.composedPriceUsd(assembled.priceUsd),
    {
      pricing:
        snapshot === undefined
          ? { source: 'current-table', ...currentVersion }
          : {
              source: 'composed',
              ...(snapshot.pricingVersion === undefined
                ? {}
                : { pricingVersion: snapshot.pricingVersion }),
              ...currentVersion,
              rows: snapshot.rows,
              segments: snapshot.segments,
              pinnedThroughSeq: snapshot.pinnedThroughSeq,
            },
    },
  );
  if (json) {
    context.io.out(JSON.stringify(invoice, null, 2));
    return 0;
  }
  context.io.out(`run ${meta.runId}: invoice (${meta.status})`);
  context.io.out(
    `gross: $${invoice.totalUsd.toFixed(4)} | net: $${invoice.netUsd.toFixed(4)} | ` +
      `abandoned: $${invoice.abandonedUsd.toFixed(4)}${invoice.usageApprox === true ? ' (approx)' : ''}`,
  );
  context.io.out(
    `rows: ${invoice.rows.length} (reconciliation failures: ${invoice.reconciliationFailures}` +
      `${invoice.usageUnknownRows === undefined ? '' : `; usage unknown: ${invoice.usageUnknownRows}`})`,
  );
  context.io.out(
    `pricing basis: ${invoice.pricingBasis} ` +
      (invoice.rowUsdNonAdditive
        ? '(row usd is non-additive: an aggregate-priced remainder or legacy entry is in the ' +
          'fold; allocatedUsd sums to gross)'
        : '(rows are additive: every provider call priced per request; allocatedUsd agrees and ' +
          'sums to gross)'),
  );
  context.io.out(
    snapshot === undefined
      ? 'pricing rates: current table (no snapshot in the journal)'
      : 'pricing rates: run-settle pins composed with the current table' +
          pinVersionsSuffix(snapshot, assembled.currentPricingVersion),
  );
  const verified = ratesVerifiedLine(invoice, snapshot, assembled.pricingOf, Date.now());
  if (verified !== undefined) {
    context.io.out(verified);
  }
  for (const row of invoice.rows) {
    const usd = row.usd === undefined ? 'unpriced' : `$${row.usd.toFixed(4)}`;
    const tokens = row.usage.inputTokens + row.usage.outputTokens;
    const id = row.responseId ?? 'no-id';
    const flags =
      `${row.usageApprox === true ? ' approx' : ''}` +
      `${row.usageUnknown === true ? ' usage-unknown' : ''}` +
      `${row.abandoned === true ? ' abandoned' : ''}`;
    context.io.out(
      `#${row.entrySeq}.${row.ordinal} ${row.servedBy}` +
        `${row.role === undefined ? '' : ` ${row.role}`}` +
        `${row.attempt === undefined ? '' : ` attempt=${row.attempt}`}` +
        ` ${row.outcome} ${id} ${tokens} tok ${usd}${flags} [${row.reconciliation}]`,
    );
  }
  for (const item of invoice.unpriced) {
    context.io.out(
      `unpriced: ${item.model} (${item.usage.inputTokens + item.usage.outputTokens} tok)`,
    );
  }
  return 0;
}

/**
 * The six checks of one journal (RV1910, extracted for RV2209): the
 * roster is closed, the settle is recorded and is the billing
 * boundary, the settled fold, the invoice totals and the wire
 * cardinality agree, and the incremental rows match their terminals.
 */
interface RunCostAudit {
  report: ReturnType<typeof costReportFromJournal>;
  invoice: ReturnType<typeof invoiceFromJournal>;
  checks: Array<{ name: string; pass: boolean; detail: string }>;
  failed: Array<{ name: string; pass: boolean; detail: string }>;
}

function auditJournalEntries(
  entries: JournalEntry[],
  basePriceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined,
): RunCostAudit {
  const snapshot = journalPricingSnapshot(entries);
  const composed = snapshot === undefined ? basePriceUsd : snapshot.composedPriceUsd(basePriceUsd);
  const report = costReportFromJournal(entries, composed);
  const invoice = invoiceFromJournal(entries, composed);
  const terminalRefs = new Set(
    entries
      .filter((entry) => entry.kind === 'agent' && entry.status !== 'running')
      .map((entry) => entry.ref),
  );
  const openAgents = entries.filter(
    (entry) => entry.kind === 'agent' && entry.status === 'running' && !terminalRefs.has(entry.seq),
  );
  const settle = [...entries]
    .reverse()
    .find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle',
    );
  const agentsAfterSettle =
    settle === undefined
      ? []
      : entries.filter((entry) => entry.kind === 'agent' && entry.seq > settle.seq);
  const grossDelta = Math.abs(report.grossUsd - invoice.totalUsd);
  // The incremental billing lane (RV2008): every settled agent whose
  // journal carries provider-call rows must have them agree with its
  // terminal providerCalls set, count and per-ordinal usage alike.
  // Agents with no incremental rows pass vacuously: pre-RV2008
  // segments and fully replayed invocations journal none, and the
  // terminal set remains the canonical fold input either way.
  const usageKey = (usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  }): string =>
    [usage.inputTokens, usage.outputTokens, usage.cacheReadTokens, usage.cacheWriteTokens].join(
      ':',
    );
  const incrementalByAgent = new Map<number, Map<number, string>>();
  for (const entry of entries) {
    if (entry.kind !== 'decision') {
      continue;
    }
    const value = entry.value as
      | {
          decisionType?: string;
          agentRef?: number;
          record?: {
            ordinal?: number;
            usage?: {
              inputTokens: number;
              outputTokens: number;
              cacheReadTokens: number;
              cacheWriteTokens: number;
            };
          };
        }
      | undefined;
    if (
      value?.decisionType !== 'provider-call' ||
      typeof value.agentRef !== 'number' ||
      typeof value.record?.ordinal !== 'number' ||
      value.record.usage === undefined
    ) {
      continue;
    }
    const byOrdinal = incrementalByAgent.get(value.agentRef) ?? new Map<number, string>();
    byOrdinal.set(value.record.ordinal, usageKey(value.record.usage));
    incrementalByAgent.set(value.agentRef, byOrdinal);
  }
  const incrementalMismatches: number[] = [];
  for (const terminal of entries) {
    if (terminal.kind !== 'agent' || terminal.status === 'running' || terminal.ref === undefined) {
      continue;
    }
    const incremental = incrementalByAgent.get(terminal.ref);
    if (incremental === undefined || incremental.size === 0) {
      continue;
    }
    const records = terminal.providerCalls ?? [];
    const matches =
      records.length === incremental.size &&
      records.every((record) => incremental.get(record.ordinal) === usageKey(record.usage));
    if (!matches) {
      incrementalMismatches.push(terminal.ref);
    }
  }
  const checks: Array<{ name: string; pass: boolean; detail: string }> = [
    {
      name: 'roster-closed',
      pass: openAgents.length === 0,
      detail:
        openAgents.length === 0
          ? 'every agent entry has a terminal'
          : `${String(openAgents.length)} agent entr${openAgents.length === 1 ? 'y' : 'ies'} still running (seq ${openAgents.map((entry) => entry.seq).join(', ')})`,
    },
    {
      name: 'settle-recorded',
      pass: settle !== undefined,
      detail:
        settle === undefined ? 'no run_settle decision' : `run_settle at seq ${String(settle.seq)}`,
    },
    {
      name: 'settle-is-billing-boundary',
      pass: agentsAfterSettle.length === 0,
      detail:
        agentsAfterSettle.length === 0
          ? 'no agent entry follows the settle'
          : `${String(agentsAfterSettle.length)} agent entr${agentsAfterSettle.length === 1 ? 'y' : 'ies'} after the settle (seq ${agentsAfterSettle.map((entry) => entry.seq).join(', ')}), the benchmark recovery shape`,
    },
    {
      name: 'fold-matches-invoice',
      pass: grossDelta < 1e-9,
      detail: `settled gross $${report.grossUsd.toFixed(7)} vs invoice total $${invoice.totalUsd.toFixed(7)}`,
    },
    {
      name: 'wires-match',
      pass: (report.wireRequests ?? -1) === invoice.cardinality.wireRequests,
      detail: `fold wires ${String(report.wireRequests ?? 'absent')} vs invoice wires ${String(invoice.cardinality.wireRequests)}`,
    },
    {
      name: 'incremental-rows-match',
      pass: incrementalMismatches.length === 0,
      detail:
        incrementalMismatches.length === 0
          ? 'every terminal dispatch set equals its incremental rows (RV2008; absent rows pass)'
          : `terminal dispatch sets diverge from the incremental rows for agent seq ${incrementalMismatches.join(', ')}`,
    },
  ];
  const failed = checks.filter((check) => !check.pass);
  return { report, invoice, checks, failed };
}

/** The one JSON shape of a run's audit, shared by both command forms. */
function costAuditRunJson(runId: string, audit: RunCostAudit): Record<string, unknown> {
  return {
    runId,
    verdict: audit.failed.length === 0 ? 'one-denominator' : 'divergent',
    settled: {
      totalUsd: audit.report.totalUsd,
      grossUsd: audit.report.grossUsd,
      wireRequests: audit.report.wireRequests ?? null,
    },
    invoice: {
      totalUsd: audit.invoice.totalUsd,
      rows: audit.invoice.rows.length,
      wireRequests: audit.invoice.cardinality.wireRequests,
      ...(audit.invoice.orphanedReceipts === undefined
        ? {}
        : { orphanedReceipts: audit.invoice.orphanedReceipts }),
    },
    checks: audit.checks,
  };
}

/**
 * cost-audit (RV1910): the denominator diagnostic over one stored run.
 * The four-role benchmark's recovery run produced four mutually
 * inconsistent cost views; the lifecycle now admits one, and this
 * command VERIFIES it on a concrete journal instead of trusting the
 * doctrine: the roster is closed (every agent entry terminal), the
 * settle is recorded and is the billing boundary, and the settled
 * fold, the invoice totals and the wire cardinality agree. Exit 1
 * with the failing checks named when any diverge, which is exactly
 * what a pre-RV1904 journal (the benchmark's own) reports. `--all`
 * (RV2209) runs the same six checks over EVERY run the store lists,
 * one summary row each, exit 1 when any run diverges: the parity
 * sessions audited seven journals one invocation at a time, and a
 * catalog posture check should cost one command.
 *
 * The orphaned receipt lane (RV3501): when the invoice carries
 * `orphanedReceipts` (RV3405, paid wires the settled terminal's record
 * set does not cover), every output form surfaces it: the single run
 * text prints the lane totals plus one line per receipt, the JSON
 * shapes carry the lane verbatim under `invoice`, and the catalog
 * sweep appends an orphaned suffix to the run's row and a carrying
 * count to its header. The lane never moves the verdict or the exit
 * code: an orphaned receipt is the honest double payment window of a
 * resume, not a divergence, and before this surface a journal in that
 * shape passed all six checks while the money stayed invisible in
 * every printed figure. Journals without the lane render byte for
 * byte as before.
 */
export async function costAuditCommand(argv: string[], context: CommandContext): Promise<number> {
  const parsed = parseCommand(GRAMMAR['cost-audit'], argv);
  const runId = parsed.positionals[0];
  const all = parsed.values.all === true;
  const store = parsed.values.store as string | undefined;
  const json = parsed.values.json === true;
  if (all && runId !== undefined) {
    throw new ConfigError(
      `--all audits every run of the store; drop the '${runId}' positional; ` +
        usageOf(GRAMMAR['cost-audit']),
    );
  }
  if (!all && runId === undefined) {
    throw new ConfigError(
      `name a runId, or audit the whole store with --all; ${usageOf(GRAMMAR['cost-audit'])}`,
    );
  }
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(store === undefined ? {} : { storePath: store }),
    cwd: context.cwd,
  });
  if (runId !== undefined) {
    const meta = await readRunMeta(assembled.store, runId);
    if (meta === undefined) {
      throw new ConfigError(`run '${runId}' not found in the store`);
    }
    const entries = await assembled.store.load(runId);
    const audit = auditJournalEntries(entries, assembled.priceUsd);
    if (json) {
      context.io.out(JSON.stringify(costAuditRunJson(runId, audit), null, 2));
      return audit.failed.length === 0 ? 0 : 1;
    }
    context.io.out(
      `run ${runId}: cost audit (${audit.failed.length === 0 ? 'one denominator' : 'DIVERGENT'})`,
    );
    context.io.out(
      `settled: gross $${audit.report.grossUsd.toFixed(4)} | net $${audit.report.totalUsd.toFixed(4)} | wires ${String(audit.report.wireRequests ?? 'absent')}`,
    );
    context.io.out(
      `invoice: total $${audit.invoice.totalUsd.toFixed(4)} | rows ${String(audit.invoice.rows.length)} | wires ${String(audit.invoice.cardinality.wireRequests)}`,
    );
    const orphaned = audit.invoice.orphanedReceipts;
    if (orphaned !== undefined) {
      context.io.out(
        `orphaned receipts: $${orphaned.usd.toFixed(4)} | wires ${String(orphaned.wireRequests)} | ` +
          'paid wires the settled terminal does not cover (RV3405), outside the settled totals',
      );
      for (const row of orphaned.rows) {
        context.io.out(
          `  agent ${String(row.agentRef)} (${row.scope}) | ordinal ${String(row.ordinal)} attempt ${String(row.attempt)} ${row.outcome} | role ${row.role} | ${row.servedBy} | ${usdOf(row.usd)} | ${row.responseId === undefined ? 'no response id' : `id ${row.responseId}`}`,
        );
      }
    }
    for (const check of audit.checks) {
      context.io.out(`  [${check.pass ? 'pass' : 'FAIL'}] ${check.name}: ${check.detail}`);
    }
    return audit.failed.length === 0 ? 0 : 1;
  }
  // The catalog sweep: deterministic order whatever the store returns,
  // so two audits of the same directory diff cleanly.
  const metas = await assembled.store.listRuns();
  const sorted = [...metas].sort((a, b) => (a.runId < b.runId ? -1 : a.runId > b.runId ? 1 : 0));
  const rows: Array<{ runId: string; audit: RunCostAudit }> = [];
  for (const meta of sorted) {
    const entries = await assembled.store.load(meta.runId);
    rows.push({ runId: meta.runId, audit: auditJournalEntries(entries, assembled.priceUsd) });
  }
  const divergent = rows.filter((row) => row.audit.failed.length > 0);
  if (json) {
    context.io.out(
      JSON.stringify(
        {
          verdict: divergent.length === 0 ? 'one-denominator' : 'divergent',
          divergent: divergent.length,
          runs: rows.map((row) => costAuditRunJson(row.runId, row.audit)),
        },
        null,
        2,
      ),
    );
    return divergent.length === 0 ? 0 : 1;
  }
  const carryingOrphans = rows.filter(
    (row) => row.audit.invoice.orphanedReceipts !== undefined,
  ).length;
  context.io.out(
    `cost audit: ${String(rows.length)} run${rows.length === 1 ? '' : 's'}, ` +
      `${String(divergent.length)} divergent` +
      `${carryingOrphans === 0 ? '' : `, ${String(carryingOrphans)} carrying orphaned receipts`}`,
  );
  for (const row of rows) {
    const failedNames = row.audit.failed.map((check) => check.name).join(', ');
    const orphanedLane = row.audit.invoice.orphanedReceipts;
    context.io.out(
      `  ${row.runId}: ${row.audit.failed.length === 0 ? 'one denominator' : 'DIVERGENT'} | ` +
        `checks ${String(row.audit.checks.length - row.audit.failed.length)}/${String(row.audit.checks.length)}` +
        `${failedNames === '' ? '' : ` (failed ${failedNames})`} | ` +
        `gross $${row.audit.report.grossUsd.toFixed(4)} | ` +
        `wires ${String(row.audit.report.wireRequests ?? 'absent')}` +
        `${orphanedLane === undefined ? '' : ` | orphaned $${orphanedLane.usd.toFixed(4)} (${String(orphanedLane.wireRequests)})`}`,
    );
  }
  return divergent.length === 0 ? 0 : 1;
}

/** Formats an optional USD number for the preflight text rows. */
function usdOf(value: number | undefined): string {
  return value === undefined ? 'n/a' : `$${value.toFixed(4)}`;
}

/**
 * ` (v-a, v-b; current v-live)` across the pins in journal order,
 * deduplicated (RV611), plus the CLI's own current table version
 * (RV706): the composed fold prices the tail past the last pin at the
 * current table, so the text form names BOTH halves of the
 * composition. Empty when no pin carried a version and the config
 * declares no table; the pre-RV706 forms are preserved byte for byte
 * in that case and when only the pins carry versions.
 */
function pinVersionsSuffix(
  snapshot: JournalPricingSnapshot,
  currentPricingVersion: string | undefined,
): string {
  const versions = [
    ...new Set(
      snapshot.segments
        .map((segment) => segment.pricingVersion)
        .filter((version): version is string => version !== undefined),
    ),
  ];
  const parts: string[] = [];
  if (versions.length > 0) {
    parts.push(versions.join(', '));
  }
  if (currentPricingVersion !== undefined) {
    parts.push(`current ${currentPricingVersion}`);
  }
  return parts.length === 0 ? '' : ` (${parts.join('; ')})`;
}

/**
 * ` (age Nd)` for an ISO date against the wall clock; empty when the
 * date does not parse or lies in the future (a malformed or clock-skewed
 * stamp renders as the bare date, never as a negative age).
 */
function ageSuffixOf(date: string, nowMs: number): string {
  const parsed = Date.parse(date);
  if (!Number.isFinite(parsed) || parsed > nowMs) {
    return '';
  }
  return ` (age ${String(Math.floor((nowMs - parsed) / 86_400_000))}d)`;
}

/**
 * `rates verified: <model> <date> (age Nd), <model> no date` over the
 * models the invoice rows name (RV814). Per model, the date is the
 * LAST settle pin's row when the journal pins one, because those are
 * the rates that priced settled history whatever today's table says; a
 * model outside the pins reads the current table's row. A pinned row
 * without a stamp is honestly `no date`, never today's table date.
 * Undefined when no applicable row names a date: journals priced under
 * pre-stamp tables keep their historical output byte for byte.
 */
function ratesVerifiedLine(
  invoice: InvoiceExport,
  snapshot: JournalPricingSnapshot | undefined,
  pricingOf: (servedBy: ModelRef) => Pricing | undefined,
  nowMs: number,
): string | undefined {
  const models = [...new Set(invoice.rows.map((row) => row.servedBy))].sort();
  const dated = models.map((model) => {
    const pinRow = snapshot?.rows.find((row) => row.model === model);
    const date =
      pinRow !== undefined ? pinRow.rates.ratesVerifiedAt : pricingOf(model)?.ratesVerifiedAt;
    return { model, date };
  });
  if (!dated.some((entry) => entry.date !== undefined)) {
    return undefined;
  }
  const parts = dated.map(({ model, date }) =>
    date === undefined ? `${model} no date` : `${model} ${date}${ageSuffixOf(date, nowMs)}`,
  );
  return `rates verified: ${parts.join(', ')}`;
}

function renderPreflight(report: PreflightReport, io: CliIo): void {
  io.out('preflight: effective limits and admission projection (zero provider dispatches)');
  const perProvider = report.concurrency.perProvider;
  io.out(
    `concurrency: perRun=${report.concurrency.perRun}` +
      (perProvider === undefined
        ? ''
        : ` perProvider={${Object.entries(perProvider)
            .map(([id, cap]) => `${id}:${cap}`)
            .join(', ')}}`),
  );
  const budget = report.budget;
  io.out(
    `budget: ceiling=${usdOf(budget.ceilingUsd)} flatReserve=${usdOf(budget.flatReserveUsd)} ` +
      `lifetimeSpawnCap=${budget.lifetimeSpawnCap} childFraction=${budget.childBudgetFraction} ` +
      `maxDepth=${budget.maxDepth}`,
  );
  if (budget.orchestrator !== undefined) {
    const orch = budget.orchestrator;
    io.out(
      `orchestrator: effectiveCap=${usdOf(orch.effectiveCapUsd)} ` +
        `finalizeReserve=${usdOf(orch.finalizeReserveUsd)} over ${orch.finalizeTurns} turns ` +
        `(${orch.reserveCommitted ? 'committed against the run root' : 'not committed: no plan extension'})`,
    );
    if (orch.synthesis !== undefined) {
      io.out(
        `synthesis: servedBy=${orch.synthesis.servedBy ?? 'UNROUTED'}` +
          ` projectedTurns=${orch.synthesis.projectedProviderTurns}`,
      );
    }
  }
  io.out(
    `quota: ${report.quota.configured ? 'configured' : 'none'}` +
      (report.quota.tenant === undefined ? '' : ` tenant=${report.quota.tenant}`) +
      (report.quota.rules === undefined ? '' : ` rules=${report.quota.rules}`),
  );
  io.out(`run limits: ${JSON.stringify(report.runLimits)}`);
  for (const spawn of report.spawns) {
    io.out(
      `spawn '${spawn.label}' role=${spawn.role} x${spawn.count}` +
        ` servedBy=${spawn.servedBy ?? 'UNROUTED'}${spawn.unpriced === true ? ' (unpriced)' : ''}` +
        (spawn.ratesVerifiedAt === undefined
          ? ''
          : ` ratesVerified=${spawn.ratesVerifiedAt}${ageSuffixOf(spawn.ratesVerifiedAt, Date.now())}`) +
        ` reserve=${usdOf(spawn.admissionReserveUsd)} (${spawn.reserveSource})` +
        (spawn.maxOutputTokensPerTurn === undefined
          ? ''
          : ` maxOutput=${spawn.maxOutputTokensPerTurn}`) +
        (spawn.turnFloorUsd === undefined ? '' : ` turnFloor=${usdOf(spawn.turnFloorUsd)}`) +
        ` toolCallCeiling=${spawn.executedToolCallCeiling ?? 'unlimited'}` +
        ` projectedTurns=${spawn.projectedProviderTurns}`,
    );
    io.out(`  limits: ${JSON.stringify(spawn.limits)}`);
    for (const row of spawn.toolCeilings) {
      if (row.tool === '(any)' && row.ceiling === null) {
        continue;
      }
      io.out(
        `  tool ${row.tool}: ceiling=${row.ceiling ?? 'unlimited'}` +
          (row.boundBy === undefined ? '' : ` (${row.boundBy})`),
      );
    }
  }
  const admission = report.admission;
  if (admission.wave.length > 0) {
    io.out(
      `admission: ${admission.admitted} of ${admission.wave.length} admitted` +
        (admission.ceilingUsd === undefined
          ? ''
          : ` under ceiling=${usdOf(admission.ceilingUsd)}`) +
        (admission.reservedForFinalizationUsd === 0
          ? ''
          : ` (finalization holds ${usdOf(admission.reservedForFinalizationUsd)})`),
    );
    for (const row of admission.wave) {
      io.out(
        `  ${row.admitted ? 'admit' : 'DENY '} ${row.label} reserve=${usdOf(row.reserveUsd)}` +
          (row.deniedBy === undefined ? '' : ` [${row.deniedBy}]`),
      );
    }
  }
  io.out(
    `exposure: maxInFlight=${report.exposure.maxInFlight}` +
      (report.exposure.overshootOneTurnFloorUsd === undefined
        ? ''
        : ` overshootOneTurnFloor=${usdOf(report.exposure.overshootOneTurnFloorUsd)}`) +
      (report.exposure.runCeiling === undefined
        ? ''
        : ` runCeiling: requests=${report.exposure.runCeiling.requests}` +
          ` tokens=${report.exposure.runCeiling.tokens}`),
  );
  for (const [provider, row] of Object.entries(report.exposure.perProvider)) {
    io.out(
      `  provider ${provider}: inFlight=${row.inFlight} requestsPerWave=${row.requestsPerWave} ` +
        `tokensPerWaveFloor=${row.tokensPerWaveFloor}`,
    );
  }
  io.out(`findings: ${report.findings.length}`);
  for (const finding of report.findings) {
    io.out(
      `  ${finding.severity} ${finding.code}: ${finding.message}` +
        (finding.spawn === undefined ? '' : ` [spawn ${finding.spawn}]`),
    );
  }
}

/**
 * rulvar preflight (the experiment-review P2.2; grammar in grammar.ts):
 * the effective-config linter and dry-run estimator. Loads the SAME
 * config, module, and run-profile merge `rulvar run` would assemble,
 * but constructs no engine, opens no store, and dispatches nothing:
 * the report is computed by preflightEstimate over options alone, so
 * the command cannot pay for a single provider token by construction.
 * The declared spawn wave comes from the `preflight` export of the
 * config or workflow module (module wins), and --spawns JSON overrides
 * it from the command line. --json prints the machine-readable report.
 * Exit 1 when any finding has severity 'error' (the linter contract:
 * green preflight means the run can at least start), 0 otherwise.
 */
export async function preflightCommand(argv: string[], context: CommandContext): Promise<number> {
  const parsed = parseCommand(GRAMMAR.preflight, argv);
  const target = parsed.positionals[0];
  const profile = parsed.values.profile as string | undefined;
  const json = parsed.values.json === true;
  const budgetUsd =
    parsed.values['budget-usd'] === undefined
      ? undefined
      : parseBudgetValue('budget-usd', parsed.values['budget-usd'] as string);
  const config = await loadCliConfig(context.cwd);
  const module = looksLikeFile(target) ? await loadWorkflowModule(target, context.cwd) : undefined;
  // The target must resolve a workflow exactly like `rulvar run`: a
  // green preflight over a typo'd name would lint nothing and mislead.
  const workflows = { ...config.workflows, ...module?.workflows };
  const workflow = module?.workflow ?? workflows[target];
  if (workflow === undefined) {
    throw new ConfigError(
      looksLikeFile(target)
        ? `${target} exports no workflow (default export or named 'workflow')`
        : `no workflow named '${target}' in the registry; register it in rulvar.config.mjs`,
    );
  }
  let engineOptions: Partial<CreateEngineOptions> = {
    ...config.engineOptions,
    ...module?.engineOptions,
  };
  if (profile !== undefined) {
    const preset = runProfile(profile);
    if (preset === undefined) {
      throw new ConfigError(
        `unknown run profile '${profile}'; shipped: fast, standard, deep, ultra`,
      );
    }
    engineOptions = applyRunProfile(preset, engineOptions);
  }
  const declaration = { ...config.preflight, ...module?.preflight };
  let spawns = declaration.spawns;
  const spawnsJson = parsed.values.spawns as string | undefined;
  if (spawnsJson !== undefined) {
    let parsedSpawns: unknown;
    try {
      parsedSpawns = JSON.parse(spawnsJson);
    } catch (error) {
      throw new ConfigError(
        `--spawns is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!Array.isArray(parsedSpawns)) {
      throw new ConfigError('--spawns must be a JSON array of spawn specs');
    }
    spawns = parsedSpawns as PreflightSpawnSpec[];
  }
  const input: PreflightInput = {
    engine: engineOptions,
    run: { ...(budgetUsd === undefined ? {} : { budgetUsd }) },
    ...(declaration.orchestrator === undefined ? {} : { orchestrator: declaration.orchestrator }),
    ...(spawns === undefined ? {} : { spawns }),
    ...(declaration.quotaRules === undefined ? {} : { quotaRules: declaration.quotaRules }),
  };
  const report = preflightEstimate(input);
  if (json) {
    context.io.out(JSON.stringify(report, null, 2));
  } else {
    renderPreflight(report, context.io);
  }
  return report.findings.some((finding) => finding.severity === 'error') ? 1 : 0;
}

/**
 * rulvar plan (M6-T11; grammar in grammar.ts): plans a workflow script
 * through @rulvar/planner (loaded dynamically: the CLI's static
 * dependency stays @rulvar/core only), prints the accepted script and
 * its advisories, and runs it in the worker sandbox unless --dry-run.
 *
 * Both stages are paid runs with their OWN immutable ceilings (the
 * v1.16.2 review P1-1): --planning-budget-usd caps the planning run
 * (PlanOptions.run.budgetUsd, frozen at the planning journal's
 * genesis), --budget-usd caps the execution run (RunOptions.budgetUsd,
 * consistent with rulvar run). A machine-written workflow never runs
 * unbounded silently: missing ceilings fail loudly unless
 * --allow-unbounded waives them explicitly, and an execution ceiling
 * beside --dry-run is a contradiction, not an ignorable leftover.
 */
export async function planCommand(argv: string[], context: CommandContext): Promise<number> {
  const parsed = parseCommand(GRAMMAR.plan, argv);
  const goal = parsed.positionals[0];
  const dryRun = parsed.values['dry-run'] === true;
  const allowUnbounded = parsed.values['allow-unbounded'] === true;
  const planningBudgetUsd =
    parsed.values['planning-budget-usd'] === undefined
      ? undefined
      : parseBudgetValue('planning-budget-usd', parsed.values['planning-budget-usd'] as string);
  const executionBudgetUsd =
    parsed.values['budget-usd'] === undefined
      ? undefined
      : parseBudgetValue('budget-usd', parsed.values['budget-usd'] as string);
  if (dryRun && executionBudgetUsd !== undefined) {
    throw new ConfigError(
      '--dry-run never executes the planned workflow, so --budget-usd (the execution ' +
        'ceiling) has nothing to bound; drop one of the two',
    );
  }
  if (!allowUnbounded && planningBudgetUsd === undefined) {
    throw new ConfigError(
      'rulvar plan runs the planner model as a paid run; set --planning-budget-usd N ' +
        '(its immutable ceiling) or waive it explicitly with --allow-unbounded',
    );
  }
  if (!allowUnbounded && !dryRun && executionBudgetUsd === undefined) {
    throw new ConfigError(
      'executing the planned workflow is a second paid run; set --budget-usd N ' +
        '(its immutable ceiling) or waive it explicitly with --allow-unbounded',
    );
  }
  interface PlannerModule {
    plan: (
      engine: unknown,
      goal: string,
      options?: { run?: { budgetUsd?: number } },
    ) => Promise<{
      source: string;
      workflow: unknown;
      lint: Array<{ ruleId: string; message: string }>;
    }>;
  }
  const plannerModule = await loadCompanion<PlannerModule>(
    import('@rulvar/planner'),
    '@rulvar/planner',
    'rulvar plan',
    'rulvar plan requires @rulvar/planner (the plan agent, compileScript, and the worker ' +
      'sandbox live there); install it next to the CLI',
  );
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({ config, cwd: context.cwd });
  const planned = await plannerModule.plan(
    assembled.engine,
    goal,
    planningBudgetUsd === undefined ? undefined : { run: { budgetUsd: planningBudgetUsd } },
  );
  context.io.err(`plan: accepted with ${String(planned.lint.length)} advisory diagnostic(s)`);
  for (const diagnostic of planned.lint) {
    // Lint diagnostics can quote the model-written script; sanitize the
    // untrusted part before it reaches a terminal line (v1.24.1 review
    // P2-1).
    context.io.err(`  ${diagnostic.ruleId}: ${sanitizeTerminalText(diagnostic.message)}`);
  }
  if (dryRun) {
    context.io.out(planned.source);
    return 0;
  }
  const workflow = planned.workflow as Workflow<unknown, unknown>;
  const first = assembled.engine.run(
    workflow,
    null,
    executionBudgetUsd === undefined ? {} : { budgetUsd: executionBudgetUsd },
  );
  context.io.err(`runId: ${first.runId}`);
  const outcome = await driveRun({
    engine: assembled.engine,
    workflow: workflow as never,
    first,
    io: context.io,
    args: null,
  });
  return reportOutcome(outcome, context.io);
}

/**
 * rulvar kb list (M10-T04): the second
 * consumption path. Claims with full provenance for the humans who
 * author ladders, floors, and profiles; no run and no pin, so model
 * names render VERBATIM here (only in-run cards are nameless). Reads
 * the per-project file store (./rulvar.models.json).
 */
export async function kbCommand(argv: string[], context: CommandContext): Promise<number> {
  const [sub, ...rest] = argv;
  if (sub === 'inbox') {
    return await kbInboxCommand(rest, context);
  }
  if (sub === 'gate') {
    return await kbGateCommand(rest, context);
  }
  if (sub === 'sweep') {
    return await kbSweepCommand(rest, context);
  }
  if (sub !== 'list') {
    throw new ConfigError(KB_FAMILY_USAGE);
  }
  parseCommand(GRAMMAR['kb list'], rest);
  const path = join(context.cwd, 'rulvar.models.json');
  const store = new FileModelKnowledgeStore({ path });
  const snapshot = await store.current();
  context.io.out(
    `knowledge store: rulvar.models.json (version ${String(snapshot.version)}, ` +
      `${String(snapshot.claims.length)} claim${snapshot.claims.length === 1 ? '' : 's'})`,
  );
  renderKbList(snapshot, context);
  return 0;
}

function renderKbList(
  snapshot: Awaited<ReturnType<FileModelKnowledgeStore['current']>>,
  context: CommandContext,
): void {
  const now = new Date().toISOString();
  for (const claim of snapshot.claims) {
    const effort = claim.subject.effort === undefined ? '' : ` effort=${claim.subject.effort}`;
    const ttl =
      claim.status === 'active' ? (claimExpired(claim, now) ? ' TTL EXPIRED' : ' TTL holds') : '';
    context.io.out(
      `${claim.id} [${claim.status}${ttl}] ${claim.subject.model}${effort} :: ` +
        `${claim.taskClass} ${claim.polarity} (${claim.class}, confidence ${claim.confidence})`,
    );
    context.io.out(`  ${claim.statement}`);
    context.io.out(
      `  observed=${claim.observedAt} expires=${claim.expiresAt} ` +
        // The gate identity: the file lives under git review, so the
        // committer of record is the author; eval-pipeline authors are
        // the M11 committer identity.
        `author=${claim.author.kind}:${claim.author.id} gate=${
          claim.author.kind === 'human' ? 'human (git review)' : 'eval-committer'
        }`,
    );
    const evidence = claim.evidence
      .map((ref) =>
        ref.kind === 'journal'
          ? `journal ${ref.runId}#${String(ref.entryRef)}`
          : `eval ${ref.reportId} [${ref.caseIds.join(', ')}]`,
      )
      .join('; ');
    context.io.out(`  evidence: ${evidence}`);
    if (claim.metrics !== undefined) {
      context.io.out(
        `  metrics: passRate=${String(claim.metrics.passRate)} n=${String(claim.metrics.n)} ` +
          `grader=${claim.metrics.graderId}`,
      );
    }
    if (claim.supersedes !== undefined) {
      context.io.out(`  supersedes: ${claim.supersedes}`);
    }
    if (claim.origin !== undefined) {
      context.io.out(
        `  origin: ${claim.origin.kind} run=${claim.origin.runId}#${String(claim.origin.entryRef)}`,
      );
    }
  }
}

/** The structural face of the @rulvar/plan ledger fold (dynamic import). */
interface PlanLedgerModule {
  foldLedger: (
    entries: readonly unknown[],
    options?: { ledgerScope?: string; planScope?: string },
  ) => {
    observations: Array<{
      taskClass: string;
      logicalTaskId: string;
      tierObserved?: number;
      note: string;
      evidenceRefs: number[];
      subject?: { model: string; effort?: string };
      polarity?: 'strength' | 'weakness';
      trigger?: string;
      entryRef: number;
    }>;
  };
}

/**
 * rulvar kb inbox (M12-T03): aggregates kb_propose-born proposals from
 * FINISHED runs through the RunLedger fold behind the LedgerExport
 * seam. Grouping of matching (subject, taskClass, polarity) triples is
 * STRICTLY display: the command writes nothing, authorizes no spend,
 * and schedules no sweeps; gating a proposal into a claim is the
 * separate human gate flow. The age anchor is the run's terminal
 * updatedAt (journal entries carry no wall clock by design): proposals
 * of runs finished more than fourteen days ago expire out of the view.
 * This is the human review surface, so the quarantined note text and
 * concrete model names render here VERBATIM, exactly like kb list.
 */
async function kbInboxCommand(argv: string[], context: CommandContext): Promise<number> {
  const parsed = parseCommand(GRAMMAR['kb inbox'], argv);
  const flags = { store: parsed.values.store as string | undefined };
  const plan = await loadCompanion<PlanLedgerModule>(
    import('@rulvar/plan'),
    '@rulvar/plan',
    'rulvar kb inbox',
    'rulvar kb inbox requires @rulvar/plan (the RunLedger fold behind the LedgerExport seam)',
  );
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(flags.store === undefined ? {} : { storePath: flags.store }),
    cwd: context.cwd,
  });
  const metas = await assembled.store.listRuns();
  const finished = metas.filter((meta) => meta.status !== 'running');
  const cutoffMs = Date.now() - INBOX_PROPOSAL_TTL_DAYS * 24 * 60 * 60 * 1000;

  interface InboxMember {
    runId: string;
    runLabel: string;
    entryRef: number;
    logicalTaskId: string;
    tierObserved?: number;
    trigger: string;
    note: string;
    evidenceRefs: number[];
    finishedAt: string;
  }
  const groups = new Map<
    string,
    {
      subject: { model: string; effort?: string };
      taskClass: string;
      polarity: 'strength' | 'weakness';
      members: InboxMember[];
    }
  >();
  let expired = 0;
  for (const meta of finished) {
    const entries = await assembled.store.load(meta.runId);
    const view = plan.foldLedger(entries, { ledgerScope: '', planScope: 'plan' });
    for (const row of view.observations) {
      if (row.subject === undefined || row.polarity === undefined || row.trigger === undefined) {
        // A plain observation_add is advisory ledger content, not a
        // proposal: only kb_propose-born rows reach the inbox.
        continue;
      }
      if (Date.parse(meta.updatedAt) < cutoffMs) {
        expired += 1;
        continue;
      }
      const key = [row.subject.model, row.subject.effort ?? '', row.taskClass, row.polarity].join(
        '|',
      );
      const group = groups.get(key) ?? {
        subject: row.subject,
        taskClass: row.taskClass,
        polarity: row.polarity,
        members: [],
      };
      group.members.push({
        runId: meta.runId,
        runLabel: meta.name ?? meta.workflowName ?? '',
        entryRef: row.entryRef,
        logicalTaskId: row.logicalTaskId,
        ...(row.tierObserved === undefined ? {} : { tierObserved: row.tierObserved }),
        trigger: row.trigger,
        note: row.note,
        evidenceRefs: row.evidenceRefs,
        finishedAt: meta.updatedAt,
      });
      groups.set(key, group);
    }
  }

  const total = [...groups.values()].reduce((sum, group) => sum + group.members.length, 0);
  context.io.out(
    `kb inbox: ${String(total)} live proposal${total === 1 ? '' : 's'} in ` +
      `${String(groups.size)} group${groups.size === 1 ? '' : 's'} across ` +
      `${String(finished.length)} finished run${finished.length === 1 ? '' : 's'}` +
      (expired > 0 ? `; ${String(expired)} expired (older than 14 days)` : ''),
  );
  for (const key of [...groups.keys()].sort()) {
    const group = groups.get(key)!;
    const effort = group.subject.effort === undefined ? '' : ` effort=${group.subject.effort}`;
    context.io.out(
      `${group.subject.model}${effort} :: ${group.taskClass} ${group.polarity} ` +
        `(${String(group.members.length)} proposal${group.members.length === 1 ? '' : 's'})`,
    );
    context.io.out(
      `  statement: ${proposalStatement({
        taskClass: group.taskClass,
        polarity: group.polarity,
        trigger: group.members[0].trigger as never,
      })}`,
    );
    for (const member of group.members) {
      const tier = member.tierObserved === undefined ? '' : ` tier=${String(member.tierObserved)}`;
      const label = member.runLabel === '' ? '' : ` (${member.runLabel})`;
      context.io.out(
        `  - run=${member.runId}${label}#${String(member.entryRef)}${tier} ` +
          `trigger=${member.trigger} lineage=${member.logicalTaskId} finished=${member.finishedAt}`,
      );
      if (member.note !== '') {
        context.io.out(`    note: ${member.note}`);
      }
      if (member.evidenceRefs.length > 0) {
        context.io.out(
          `    evidence: ${member.evidenceRefs.map((ref) => `#${String(ref)}`).join(', ')}`,
        );
      }
    }
  }
  return 0;
}

const RULED_OUT_VOCABULARY = ['prompt', 'tools', 'difficulty', 'transient-provider'] as const;

/**
 * rulvar kb gate (M12-T04): the human gate turning ONE inbox proposal
 * into a human-editorial claim. The attribution attestation is
 * mandatory by construction: without --ruled-out the GateRecord does
 * not assemble and nothing is written. The born claim carries the
 * typed template statement (never the quarantined note), the origin
 * provenance back to the proposing run, evidence resolving into that
 * run's journal, and the editorial TTL; the commit is CAS against the
 * per-project file store, whose git review is the authenticating gate.
 */
async function kbGateCommand(argv: string[], context: CommandContext): Promise<number> {
  const parsed = parseCommand(GRAMMAR['kb gate'], argv);
  // Every kb gate flag carries a value placeholder, so no booleans here.
  const values = parsed.values as Record<string, string | undefined>;
  const usage = usageOf(GRAMMAR['kb gate']);
  const runId = parsed.positionals[0];
  const entryRefRaw = parsed.positionals[1];
  const entryRef = Number(entryRefRaw);
  if (!Number.isInteger(entryRef) || entryRef < 1) {
    throw new ConfigError(`entryRef must be a positive integer entry seq, got '${entryRefRaw}'`);
  }
  const approver = values.approver;
  if (approver === undefined || approver === '') {
    throw new ConfigError(`--approver is required: the attestation names its human. ${usage}`);
  }
  // The attestation is the whole point: no checklist, no GateRecord,
  // no claim (constructively impossible to rubber-stamp).
  const ruledOutRaw = values['ruled-out'];
  if (ruledOutRaw === undefined || ruledOutRaw === '') {
    throw new ConfigError(
      '--ruled-out is required: the attribution attestation lists the alternative causes ' +
        `you ruled out (${RULED_OUT_VOCABULARY.join(', ')}). ${usage}`,
    );
  }
  const ruledOut = ruledOutRaw.split(',').map((entry) => entry.trim());
  for (const entry of ruledOut) {
    if (!(RULED_OUT_VOCABULARY as readonly string[]).includes(entry)) {
      throw new ConfigError(
        `--ruled-out '${entry}' is not in the attestation vocabulary ` +
          `(${RULED_OUT_VOCABULARY.join(', ')})`,
      );
    }
  }
  // --contrast-run and --contrast-eval exclusivity is enforced by the
  // grammar (exclusiveGroup) before this command body runs.
  let contrastEvidence: EvidenceRef | undefined;
  if (values['contrast-run'] !== undefined) {
    const [contrastRun, seqRaw, ...tail] = values['contrast-run'].split('#');
    const seq = Number(seqRaw);
    if (
      contrastRun === undefined ||
      contrastRun === '' ||
      tail.length > 0 ||
      !Number.isInteger(seq) ||
      seq < 1
    ) {
      throw new ConfigError("--contrast-run must look like 'runId#seq'");
    }
    contrastEvidence = { kind: 'journal', runId: contrastRun, entryRef: seq };
  }
  if (values['contrast-eval'] !== undefined) {
    const [reportId, caseList, ...tail] = values['contrast-eval'].split(':');
    const caseIds = (caseList ?? '').split(',').filter((entry) => entry !== '');
    if (reportId === undefined || reportId === '' || tail.length > 0 || caseIds.length === 0) {
      throw new ConfigError("--contrast-eval must look like 'reportId:caseId[,caseId...]'");
    }
    contrastEvidence = { kind: 'eval', reportId, caseIds };
  }
  const confidence = (values.confidence ?? 'medium') as ModelClaim['confidence'];
  if (!['high', 'medium', 'low'].includes(confidence)) {
    throw new ConfigError(
      `--confidence must be high, medium or low, got '${String(values.confidence)}'`,
    );
  }

  const plan = await loadCompanion<PlanLedgerModule>(
    import('@rulvar/plan'),
    '@rulvar/plan',
    'rulvar kb gate',
    'rulvar kb gate requires @rulvar/plan (the RunLedger fold behind the LedgerExport seam)',
  );
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(values.store === undefined ? {} : { storePath: values.store }),
    cwd: context.cwd,
  });
  const meta = await readRunMeta(assembled.store, runId);
  if (meta === undefined) {
    throw new ConfigError(`run '${runId}' not found in the store`);
  }
  if (meta.status === 'running') {
    throw new ConfigError(`run '${runId}' is still running; proposals gate from finished runs`);
  }
  if (Date.parse(meta.updatedAt) < Date.now() - INBOX_PROPOSAL_TTL_DAYS * 24 * 60 * 60 * 1000) {
    throw new ConfigError(
      `the proposal expired: run '${runId}' finished ${meta.updatedAt}, and inbox entries ` +
        `expire after ${String(INBOX_PROPOSAL_TTL_DAYS)} days`,
    );
  }
  const entries = await assembled.store.load(runId);
  const view = plan.foldLedger(entries, { ledgerScope: '', planScope: 'plan' });
  const proposal = view.observations.find((row) => row.entryRef === entryRef);
  if (
    proposal === undefined ||
    proposal.subject === undefined ||
    proposal.polarity === undefined ||
    proposal.trigger === undefined
  ) {
    // An ungated proposal can never become a claim, and a NON-proposal
    // can never enter the gate: only kb_propose-born observations
    // carry the engine-resolved fields.
    throw new ConfigError(
      `run '${runId}' entry ${String(entryRef)} is not a kb_propose proposal ` +
        '(see rulvar kb inbox for the gateable entries)',
    );
  }

  const path = join(context.cwd, 'rulvar.models.json');
  const store = new FileModelKnowledgeStore({ path });
  const snapshot = await store.current();
  const already = snapshot.claims.find(
    (claim) =>
      claim.origin?.kind === 'kb-proposal' &&
      claim.origin.runId === runId &&
      claim.origin.entryRef === entryRef &&
      claim.status === 'active',
  );
  if (already !== undefined) {
    throw new ConfigError(
      `this proposal is already gated as claim '${already.id}' (supersede is the edit path)`,
    );
  }

  const observedAt = meta.updatedAt;
  const evidence: EvidenceRef[] =
    proposal.evidenceRefs.length > 0
      ? proposal.evidenceRefs.map((ref) => ({ kind: 'journal', runId, entryRef: ref }))
      : [{ kind: 'journal', runId, entryRef }];
  const claim: ModelClaim = {
    id: `kb-proposal-${runId}-${String(entryRef)}`,
    subject: {
      model: proposal.subject.model as ModelRef,
      ...(proposal.subject.effort === undefined
        ? {}
        : { effort: proposal.subject.effort as NonNullable<ModelClaim['subject']['effort']> }),
    },
    taskClass: proposal.taskClass,
    polarity: proposal.polarity,
    // The typed template over the closed vocabulary: the quarantined
    // note is for the reviewing human and never enters persistence.
    statement: proposalStatement({
      taskClass: proposal.taskClass,
      polarity: proposal.polarity,
      trigger: proposal.trigger as never,
    }),
    class: 'human-editorial',
    status: 'active',
    evidence,
    confidence,
    observedAt,
    expiresAt: claimExpiry('human-editorial', proposal.polarity, observedAt),
    author: { kind: 'human', id: approver },
    origin: { kind: 'kb-proposal', runId, entryRef },
  };
  const gate: GateRecord = {
    kind: 'human',
    approver,
    at: new Date().toISOString(),
    attribution: {
      ruledOut: ruledOut as Array<'prompt' | 'tools' | 'difficulty' | 'transient-provider'>,
      ...(contrastEvidence === undefined ? {} : { contrastEvidence }),
    },
  };
  const version = await store.commit([{ op: 'add', claim, gate }], snapshot.version);
  context.io.out(
    `gated: ${claim.id} (store version ${String(version)}); the git review of ` +
      'rulvar.models.json is the authenticating gate',
  );
  context.io.out(
    `  ${claim.subject.model}${claim.subject.effort === undefined ? '' : ` effort=${claim.subject.effort}`} :: ${claim.taskClass} ${claim.polarity}`,
  );
  context.io.out(`  ${claim.statement}`);
  context.io.out(
    `  origin: kb-proposal run=${runId}#${String(entryRef)} expires=${claim.expiresAt}`,
  );
  return 0;
}

/** The debit-only aggregate envelope instance (v1.16.2 review P1-2). */
interface SpendEnvelopeInstance {
  readonly maxTotalUsd: number;
  readonly authorizedUsd: number;
  readonly remainingUsd: number;
  authorize(ceilingUsd: number | undefined, runLabel: string): void;
}

/** The structural face of @rulvar/evals (loaded dynamically at command time). */
interface EvalsModule {
  runSweepMatrix: (
    pool: { models: unknown[]; cases: unknown[] },
    options: Record<string, unknown>,
  ) => Promise<{
    reportId: string;
    cells: Array<{
      model: string;
      taskClass: string;
      passRate: number;
      n: number;
      /** Cases the cell was asked to measure; n < plannedN is incomplete. */
      plannedN: number;
      /** Count of target runs that hit their own ceiling; the cell emits no claim. */
      exhaustedRuns?: number;
      /** Count of rows whose judge could not finish for budget reasons; no claim. */
      judgeIncompleteRuns?: number;
      /** The envelope refused a TARGET run; what already ran stays reported. */
      envelopeExhausted?: true;
      incompleteReason?: string;
      refusedRunLabel?: string;
    }>;
    claims: Array<{ id: string; polarity: string; taskClass: string }>;
    committedVersion?: number;
  }>;
  /**
   * Runs the probe set and returns the drift-flip gate: allOk is false
   * when any probe did not settle ok (budget exhaustion or a transient
   * failure fingerprints differently WITHOUT the model having drifted),
   * so the caller must not flip claims on a non-ok fingerprint.
   */
  runCanary: (
    engine: unknown,
    probes: { agentType: string; prompts: string[] },
    options?: { budgetUsd?: number; envelope?: unknown },
  ) => Promise<{
    fingerprint: string;
    allOk: boolean;
    probes: Array<{ prompt: string; status: string }>;
  }>;
  flipStaleOnCanaryDrift: (
    store: unknown,
    model: string,
    fingerprint: string,
  ) => Promise<{ flipped: string[]; version?: number }>;
  /** The aggregate debit-only envelope constructor; one instance per sweep. */
  SpendEnvelope: new (maxTotalUsd: number) => SpendEnvelopeInstance;
}

/**
 * rulvar kb sweep (M11-T05):
 * falsification sweeps, run manually, from CI, or from a user cron,
 * NEVER engine-scheduled. The matrix is the config's FIXED pool
 * UNIONED with the store's falsification set: every model carrying an
 * active, unexpired negative claim MUST be included, and the
 * re-measurement queue (expired active eval claims) rides along. With
 * canary probes configured, drift flips stale strictly BEFORE the
 * sweep re-measures.
 */
async function kbSweepCommand(argv: string[], context: CommandContext): Promise<number> {
  parseCommand(GRAMMAR['kb sweep'], argv);
  const config = await loadCliConfig(context.cwd);
  const sweep = config.kbSweep;
  if (sweep === undefined) {
    throw new ConfigError(
      'rulvar kb sweep requires a kbSweep section in rulvar.config.mjs ' +
        '({ committerId, models, cases })',
    );
  }
  // Budget posture (v1.16.2 review P1-2): a sweep runs paid target,
  // judge, and canary runs, so it carries immutable per-run ceilings
  // and an aggregate envelope, OR the config waives them explicitly.
  // Never silently unbounded.
  const budgets = sweep.budgets;
  if (budgets === undefined && sweep.allowUnbounded !== true) {
    throw new ConfigError(
      'rulvar kb sweep runs paid target, judge, and canary runs; set kbSweep.budgets ' +
        '({ targetUsd, judgeUsd, canaryUsd, maxTotalUsd }) so every run carries an immutable ' +
        'ceiling and the whole sweep stays under maxTotalUsd, or waive the ceilings explicitly ' +
        'with kbSweep.allowUnbounded: true',
    );
  }
  if (budgets !== undefined) {
    for (const field of ['targetUsd', 'judgeUsd', 'canaryUsd', 'maxTotalUsd'] as const) {
      const value = budgets[field];
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new ConfigError(
          `kbSweep.budgets.${field} must be a positive finite number, got ${String(value)}`,
        );
      }
    }
  }
  const evals = await loadCompanion<EvalsModule>(
    import('@rulvar/evals'),
    '@rulvar/evals',
    'rulvar kb sweep',
    'rulvar kb sweep requires @rulvar/evals (matrix sweeps, the eval-committer identity, ' +
      'and the canary live there); install it next to the CLI',
  );
  const store = new FileModelKnowledgeStore({ path: join(context.cwd, 'rulvar.models.json') });
  const snapshot = await store.current();
  const observedAt = new Date().toISOString();

  // The pool: config members first, then the falsification union.
  type Member = { model: ModelRef; effort?: string };
  const memberKey = (member: Member): string => `${member.model} :: ${member.effort ?? ''}`;
  const pool = new Map<string, { member: Member; origin: string }>();
  for (const member of sweep.models) {
    pool.set(memberKey(member), { member, origin: 'config' });
  }
  for (const claim of snapshot.claims) {
    if (
      claim.status === 'active' &&
      claim.polarity === 'weakness' &&
      !claimExpired(claim, observedAt)
    ) {
      const member: Member = { ...claim.subject };
      if (!pool.has(memberKey(member))) {
        pool.set(memberKey(member), { member, origin: 'falsification (active negative claim)' });
      }
    }
  }
  for (const claim of remeasureQueue(snapshot.claims, observedAt)) {
    const member: Member = { ...claim.subject };
    if (!pool.has(memberKey(member))) {
      pool.set(memberKey(member), { member, origin: 're-measure (expired eval claim)' });
    }
  }
  if (pool.size === 0) {
    context.io.out('kb sweep: the pool is empty (no configured models, no falsification targets)');
    return 0;
  }
  const base: Partial<CreateEngineOptions> = config.engineOptions ?? {};
  const engineFor =
    sweep.engineFor ??
    ((member: Member) =>
      createEngine({
        ...base,
        adapters: base.adapters ?? [],
        defaults: {
          ...base.defaults,
          routing: {
            ...base.defaults?.routing,
            loop: member.model,
            extract: member.model,
          },
        },
      }));
  // The aggregate debit-only envelope, shared across the canary loop
  // and the matrix so probes, targets, and judges all draw from one
  // remainder. The worst-case authorized target and canary spend is
  // printed BEFORE the first provider call; judge counts are grader
  // behavior (unknowable upfront) and authorize against the same
  // envelope at grade time.
  const usd = (amount: number): string => `$${String(Math.round(amount * 1_000_000) / 1_000_000)}`;
  let envelope: SpendEnvelopeInstance | undefined;
  if (budgets !== undefined) {
    envelope = new evals.SpendEnvelope(budgets.maxTotalUsd);
    const probeCount = sweep.canary?.prompts.length ?? 0;
    const canaryRuns = probeCount * pool.size;
    const targetRuns = sweep.cases.length * pool.size;
    context.io.out(
      `sweep budget: ${usd(budgets.maxTotalUsd)} maxTotalUsd hard ceiling; authorizes up to ` +
        `${usd(canaryRuns * budgets.canaryUsd + targetRuns * budgets.targetUsd)} for ` +
        `${String(canaryRuns)} canary + ${String(targetRuns)} target run(s) before judges ` +
        `(each judge run up to ${usd(budgets.judgeUsd)} draws from the same envelope at grade time)`,
    );
  } else {
    context.io.err(
      'kb sweep: running UNBOUNDED (kbSweep.allowUnbounded); no target, judge, or canary run ' +
        'carries a ceiling',
    );
  }

  for (const { member, origin } of pool.values()) {
    const effort = member.effort === undefined ? '' : ` effort=${member.effort}`;
    context.io.out(`pool: ${member.model}${effort} [${origin}]`);
  }

  // Canary before measurement (drift flips eval claims to stale
  // immediately; the sweep then re-measures the subjects). Flipping is
  // gated on allOk: a non-ok probe (budget exhaustion, transient
  // failure) fingerprints differently WITHOUT the model having
  // drifted, so it must never flip claims (v1.16.2 review, canary
  // safety). An envelope refusal skips the member honestly.
  if (sweep.canary !== undefined) {
    for (const { member } of pool.values()) {
      const engine = await engineFor(member);
      let canary;
      try {
        canary = await evals.runCanary(engine, sweep.canary, {
          ...(budgets === undefined ? {} : { budgetUsd: budgets.canaryUsd, envelope }),
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'SweepBudgetError') {
          context.io.out(`canary ${member.model}: envelope exhausted, skipped`);
          continue;
        }
        throw error;
      }
      if (!canary.allOk) {
        const refused = canary.probes.filter((probe) => probe.status === 'refused').length;
        context.io.out(
          `canary ${member.model}: ${canary.fingerprint.slice(0, 12)}... incomplete ` +
            (refused > 0
              ? `(${String(refused)} probe(s) refused by the envelope); NOT flipping claims`
              : '(a probe did not settle ok); NOT flipping claims'),
        );
        continue;
      }
      const drift = await evals.flipStaleOnCanaryDrift(store, member.model, canary.fingerprint);
      context.io.out(
        `canary ${member.model}: ${canary.fingerprint.slice(0, 12)}...` +
          (drift.flipped.length === 0
            ? ' no drift'
            : ` DRIFT, ${String(drift.flipped.length)} claim(s) flipped stale`),
      );
    }
  }

  const report = await evals.runSweepMatrix(
    { models: [...pool.values()].map((entry) => entry.member), cases: sweep.cases },
    {
      reportId: sweep.reportId ?? `kb-sweep-${observedAt}`,
      committerId: sweep.committerId,
      observedAt,
      engineFor,
      store,
      ...(sweep.thresholds === undefined ? {} : { thresholds: sweep.thresholds }),
      ...(budgets === undefined
        ? {}
        : {
            suite: { budgetUsd: budgets.targetUsd, judgeBudgetUsd: budgets.judgeUsd },
            envelope,
          }),
    },
  );
  for (const cell of report.cells) {
    // Monotone reporting (v1.17.0 review P1-5): incomplete cells keep
    // whatever was measured and paid; only a cell refused before ANY
    // work reads as not measured.
    if (cell.envelopeExhausted === true && cell.n === 0) {
      context.io.out(
        `cell ${cell.model} :: ${cell.taskClass}: envelope exhausted, not measured (no claim)`,
      );
      continue;
    }
    const notes: string[] = [];
    if (cell.envelopeExhausted === true) {
      notes.push(
        `INCOMPLETE: envelope refused ${cell.refusedRunLabel ?? 'a run'} after ` +
          `${String(cell.n)} of ${String(cell.plannedN)} case(s)`,
      );
    } else if (cell.n < cell.plannedN) {
      notes.push(`INCOMPLETE: ${String(cell.n)} of ${String(cell.plannedN)} case(s) measured`);
    }
    if (cell.exhaustedRuns !== undefined) {
      notes.push(`${String(cell.exhaustedRuns)} run(s) hit their own ceiling`);
    }
    if (cell.judgeIncompleteRuns !== undefined) {
      notes.push(
        `${String(cell.judgeIncompleteRuns)} case(s) kept as evidence with an unfinished judge ` +
          `(${cell.incompleteReason ?? 'judge budget'})`,
      );
    }
    const suffix = notes.length === 0 ? '' : ` (${notes.join('; ')}; no claim)`;
    context.io.out(
      `cell ${cell.model} :: ${cell.taskClass}: passRate ${cell.passRate.toFixed(2)} ` +
        `over ${String(cell.n)} case${cell.n === 1 ? '' : 's'}${suffix}`,
    );
  }
  for (const claim of report.claims) {
    context.io.out(`claim ${claim.id}: ${claim.taskClass} ${claim.polarity}`);
  }
  context.io.out(
    report.committedVersion === undefined
      ? 'no claims crossed a threshold; nothing committed'
      : `committed ${String(report.claims.length)} claim(s) as store version ` +
          `${String(report.committedVersion)} (report ${report.reportId})`,
  );
  if (envelope !== undefined) {
    context.io.out(
      `sweep budget: authorized ${usd(envelope.authorizedUsd)} of ${usd(envelope.maxTotalUsd)}`,
    );
  }
  return 0;
}
