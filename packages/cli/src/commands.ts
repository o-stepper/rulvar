/**
 * The four M5 commands of the canonical CLI grammar (no aliases in v1):
 *
 *   rulvar run <file|name> [--args JSON] [--store PATH] [--budget-usd N]
 *   rulvar resume <runId>  [--store PATH]
 *   rulvar runs ls         [--store PATH]
 *   rulvar inspect <runId> [--store PATH]
 *
 * `plan` and `kb` land with M6+/M10. Every command builds strictly from
 * the public @rulvar/core API.
 */
import { join } from 'node:path';

import {
  claimExpired,
  claimExpiry,
  ConfigError,
  costReportFromJournal,
  createEngine,
  FileModelKnowledgeStore,
  hashRunArgs,
  INBOX_PROPOSAL_TTL_DAYS,
  proposalStatement,
  remeasureQueue,
  type CreateEngineOptions,
  type EvidenceRef,
  type GateRecord,
  type ModelClaim,
  type ModelRef,
  type RunMeta,
  type RunOptions,
  type Workflow,
} from '@rulvar/core';

import { loadCliConfig, loadWorkflowModule, looksLikeFile } from './config.js';
import { assembleEngine } from './engine-assembly.js';
import { driveRun, reportDryRun, reportOutcome } from './drive.js';
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

/** Parses --args JSON into workflow arguments; undefined when absent. */
function parseArgsJson(raw: string | undefined): unknown {
  if (raw === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new ConfigError(`--args is not valid JSON: ${raw}`);
  }
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
  return reportOutcome(outcome, context.io);
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
}): void {
  const { meta, argsGiven, args, allowChange, io } = input;
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
        `warning: run '${meta.runId}' predates the args binding; the supplied --args cannot ` +
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
      io.err(`warning: resuming '${meta.runId}' without its genesis args (--allow-args-change)`);
      return;
    }
    if (meta.argsHash === undefined) {
      io.err(
        `warning: run '${meta.runId}' recorded args presence but no hash (the genesis args ` +
          'were not JCS-serializable); the supplied --args cannot be verified',
      );
      return;
    }
    const supplied = hashRunArgs(args);
    if (supplied !== meta.argsHash) {
      if (!allowChange) {
        throw new ConfigError(
          `--args does not match the args run '${meta.runId}' was started with (recorded ` +
            `hash ${meta.argsHash.slice(0, 12)}, supplied ${supplied?.slice(0, 12) ?? 'none'}); ` +
            'changed args silently change the logical run and re-pay every args-dependent ' +
            `call. Force deliberately with --allow-args-change; ${usageOf(GRAMMAR.resume)}`,
        );
      }
      io.err(`warning: resuming '${meta.runId}' with changed args (--allow-args-change)`);
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
    io.err(`warning: resuming no-args run '${meta.runId}' with args (--allow-args-change)`);
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
  const metas = await assembled.store.listRuns();
  const meta = metas.find((m) => m.runId === runId);
  if (meta === undefined) {
    throw new ConfigError(`run '${runId}' not found in the store`);
  }
  enforceArgsBinding({ meta, argsGiven, args, allowChange, io: context.io });
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
  return reportOutcome(outcome, context.io);
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
  const metas = await assembled.store.listRuns();
  const meta = metas.find((m) => m.runId === runId);
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
  // Cost view (M5-T03): the pure journal fold, priced through the
  // config's adapters and table; unpriced surfaces, never silent zero.
  const cost = costReportFromJournal(entries, assembled.priceUsd);
  context.io.out(`cost: $${cost.totalUsd.toFixed(4)}`);
  for (const [model, usd] of Object.entries(cost.byModel)) {
    context.io.out(`  ${model}: $${usd.toFixed(4)}`);
  }
  for (const item of cost.unpriced) {
    context.io.out(
      `  unpriced: ${item.model} (${item.usage.inputTokens + item.usage.outputTokens} tok)`,
    );
  }
  for (const entry of entries) {
    const status = entry.status === undefined ? '' : ` ${entry.status}`;
    const served = entry.servedBy === undefined ? '' : ` servedBy=${entry.servedBy}`;
    context.io.out(`#${entry.seq} ${entry.kind}${status}${served}`);
  }
  return 0;
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
    context.io.err(`  ${diagnostic.ruleId}: ${diagnostic.message}`);
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
  const metas = await assembled.store.listRuns();
  const meta = metas.find((candidate) => candidate.runId === runId);
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
