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
import { parseArgs } from 'node:util';
import { join } from 'node:path';

import {
  claimExpired,
  ConfigError,
  costReportFromJournal,
  createEngine,
  FileModelKnowledgeStore,
  remeasureQueue,
  type CreateEngineOptions,
  type ModelRef,
  type RunOptions,
  type Workflow,
} from '@rulvar/core';

import { loadCliConfig, loadWorkflowModule, looksLikeFile } from './config.js';
import { assembleEngine } from './engine-assembly.js';
import { driveRun, reportOutcome } from './drive.js';
import type { CliIo } from './io.js';

export interface CommandContext {
  cwd: string;
  io: CliIo;
}

interface CommonFlags {
  store?: string;
}

function parseRunFlags(argv: string[]): {
  positionals: string[];
  store?: string;
  args?: string;
  budgetUsd?: number;
  profile?: string;
} {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      args: { type: 'string' },
      store: { type: 'string' },
      'budget-usd': { type: 'string' },
      profile: { type: 'string' },
    },
  });
  const parsed: ReturnType<typeof parseRunFlags> = { positionals };
  if (values.store !== undefined) {
    parsed.store = values.store;
  }
  if (values.profile !== undefined) {
    parsed.profile = values.profile;
  }
  if (values.args !== undefined) {
    parsed.args = values.args;
  }
  if (values['budget-usd'] !== undefined) {
    const budget = Number(values['budget-usd']);
    if (!Number.isFinite(budget) || budget <= 0) {
      throw new ConfigError(
        `--budget-usd must be a positive number, got '${values['budget-usd']}'`,
      );
    }
    parsed.budgetUsd = budget;
  }
  return parsed;
}

function parseCommonFlags(argv: string[]): { positionals: string[] } & CommonFlags {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { store: { type: 'string' } },
  });
  return { positionals, ...(values.store === undefined ? {} : { store: values.store }) };
}

export async function runCommand(argv: string[], context: CommandContext): Promise<number> {
  const flags = parseRunFlags(argv);
  const target = flags.positionals[0];
  if (target === undefined) {
    throw new ConfigError(
      'usage: rulvar run <file|name> [--args JSON] [--store PATH] [--budget-usd N]',
    );
  }
  const config = await loadCliConfig(context.cwd);
  const module = looksLikeFile(target) ? await loadWorkflowModule(target, context.cwd) : undefined;
  const assembled = assembleEngine({
    config,
    ...(module === undefined ? {} : { module }),
    ...(flags.store === undefined ? {} : { storePath: flags.store }),
    ...(flags.profile === undefined ? {} : { profile: flags.profile }),
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
  let args: unknown;
  if (flags.args !== undefined) {
    try {
      args = JSON.parse(flags.args);
    } catch {
      throw new ConfigError(`--args is not valid JSON: ${flags.args}`);
    }
  }
  const runOptions: RunOptions = {
    ...(flags.budgetUsd === undefined ? {} : { budgetUsd: flags.budgetUsd }),
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

export async function resumeCommand(argv: string[], context: CommandContext): Promise<number> {
  const flags = parseRunFlags(argv);
  const runId = flags.positionals[0];
  if (runId === undefined) {
    throw new ConfigError('usage: rulvar resume <runId> [--args JSON] [--store PATH]');
  }
  // Original arguments are not journaled for in-process workflows in
  // v1: the host re-supplies them on resume (the resume binding
  // residuals stay an open question).
  let args: unknown;
  if (flags.args !== undefined) {
    try {
      args = JSON.parse(flags.args);
    } catch {
      throw new ConfigError(`--args is not valid JSON: ${flags.args}`);
    }
  }
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(flags.store === undefined ? {} : { storePath: flags.store }),
    cwd: context.cwd,
  });
  const metas = await assembled.store.listRuns();
  const meta = metas.find((m) => m.runId === runId);
  if (meta === undefined) {
    throw new ConfigError(`run '${runId}' not found in the store`);
  }
  const name = meta.workflowName;
  const workflow =
    name === undefined
      ? undefined
      : (assembled.workflows[name] as Workflow<never, unknown> | undefined);
  if (workflow === undefined) {
    throw new ConfigError(
      `run '${runId}' was started from workflow '${name ?? '(unknown)'}'; register it under ` +
        `that name in rulvar.config.mjs workflows to resume (docs/06, section 10.2: resume ` +
        'requires the in-process workflow value)',
    );
  }
  const first = assembled.engine.resume(runId, workflow as unknown as Workflow<unknown, unknown>, {
    args,
  });
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
  const flags = parseCommonFlags(argv);
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(flags.store === undefined ? {} : { storePath: flags.store }),
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
  const flags = parseCommonFlags(argv);
  const runId = flags.positionals[0];
  if (runId === undefined) {
    throw new ConfigError('usage: rulvar inspect <runId> [--store PATH]');
  }
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(flags.store === undefined ? {} : { storePath: flags.store }),
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
 * rulvar plan "<goal>" [--dry-run] (M6-T11): plans a
 * workflow script through @rulvar/planner (loaded dynamically: the CLI's
 * static dependency stays @rulvar/core only),
 * prints the accepted script and its advisories, and runs it in the
 * worker sandbox unless --dry-run.
 */
export async function planCommand(argv: string[], context: CommandContext): Promise<number> {
  const parsed = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { 'dry-run': { type: 'boolean' } },
  });
  const goal = parsed.positionals[0];
  if (goal === undefined || parsed.positionals.length > 1) {
    throw new ConfigError('usage: rulvar plan "<goal>" [--dry-run]');
  }
  let plannerModule: {
    plan: (
      engine: unknown,
      goal: string,
    ) => Promise<{
      source: string;
      workflow: unknown;
      lint: Array<{ ruleId: string; message: string }>;
    }>;
  };
  try {
    plannerModule = (await import('@rulvar/planner')) as unknown as typeof plannerModule;
  } catch {
    throw new ConfigError(
      'rulvar plan requires @rulvar/planner (the plan agent, compileScript, and the worker ' +
        'sandbox live there); install it next to the CLI',
    );
  }
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({ config, cwd: context.cwd });
  const planned = await plannerModule.plan(assembled.engine, goal);
  context.io.err(`plan: accepted with ${String(planned.lint.length)} advisory diagnostic(s)`);
  for (const diagnostic of planned.lint) {
    context.io.err(`  ${diagnostic.ruleId}: ${diagnostic.message}`);
  }
  if (parsed.values['dry-run'] === true) {
    context.io.out(planned.source);
    return 0;
  }
  const workflow = planned.workflow as Workflow<unknown, unknown>;
  const first = assembled.engine.run(workflow, null);
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
 * the per-project file store (./rulvar.models.json). The grammar
 * members inbox (phase 3) and sweep (phase 2) fail loudly until their
 * phases ship.
 */
export async function kbCommand(argv: string[], context: CommandContext): Promise<number> {
  const [sub, ...rest] = argv;
  if (sub === 'inbox') {
    throw new ConfigError(
      'rulvar kb inbox arrives with ModelKnowledge phase 3 (M12, gated by the measured-value ' +
        'checkpoint; docs/05, section "Phases and placement")',
    );
  }
  if (sub === 'sweep') {
    return await kbSweepCommand(rest, context);
  }
  if (sub !== 'list' || rest.length > 0) {
    throw new ConfigError('usage: rulvar kb <list | inbox | sweep> (no aliases in v1)');
  }
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

/** The structural face of @rulvar/evals (loaded dynamically at command time). */
interface EvalsModule {
  runSweepMatrix: (
    pool: { models: unknown[]; cases: unknown[] },
    options: Record<string, unknown>,
  ) => Promise<{
    reportId: string;
    cells: Array<{ model: string; taskClass: string; passRate: number; n: number }>;
    claims: Array<{ id: string; polarity: string; taskClass: string }>;
    committedVersion?: number;
  }>;
  canaryFingerprint: (
    engine: unknown,
    probes: { agentType: string; prompts: string[] },
  ) => Promise<string>;
  flipStaleOnCanaryDrift: (
    store: unknown,
    model: string,
    fingerprint: string,
  ) => Promise<{ flipped: string[]; version?: number }>;
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
  if (argv.length > 0) {
    throw new ConfigError('usage: rulvar kb sweep (configuration lives in rulvar.config.mjs)');
  }
  const config = await loadCliConfig(context.cwd);
  const sweep = config.kbSweep;
  if (sweep === undefined) {
    throw new ConfigError(
      'rulvar kb sweep requires a kbSweep section in rulvar.config.mjs ' +
        "({ committerId, models, cases }; docs/05, section 'Grounding and decay')",
    );
  }
  let evals: EvalsModule;
  try {
    evals = (await import('@rulvar/evals')) as unknown as EvalsModule;
  } catch {
    throw new ConfigError(
      'rulvar kb sweep requires @rulvar/evals (matrix sweeps, the eval-committer identity, ' +
        'and the canary live there); install it next to the CLI',
    );
  }
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
  for (const { member, origin } of pool.values()) {
    const effort = member.effort === undefined ? '' : ` effort=${member.effort}`;
    context.io.out(`pool: ${member.model}${effort} [${origin}]`);
  }

  // Canary before measurement (drift flips eval claims to
  // stale immediately; the sweep then re-measures the subjects).
  if (sweep.canary !== undefined) {
    for (const { member } of pool.values()) {
      const engine = await engineFor(member);
      const fingerprint = await evals.canaryFingerprint(engine, sweep.canary);
      const drift = await evals.flipStaleOnCanaryDrift(store, member.model, fingerprint);
      context.io.out(
        `canary ${member.model}: ${fingerprint.slice(0, 12)}...` +
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
    },
  );
  for (const cell of report.cells) {
    context.io.out(
      `cell ${cell.model} :: ${cell.taskClass}: passRate ${cell.passRate.toFixed(2)} ` +
        `over ${String(cell.n)} case${cell.n === 1 ? '' : 's'}`,
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
  return 0;
}
