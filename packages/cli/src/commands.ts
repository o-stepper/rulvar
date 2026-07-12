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
  claimExpiry,
  ConfigError,
  costReportFromJournal,
  createEngine,
  FileModelKnowledgeStore,
  INBOX_PROPOSAL_TTL_DAYS,
  proposalStatement,
  remeasureQueue,
  type CreateEngineOptions,
  type EvidenceRef,
  type GateRecord,
  type ModelClaim,
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
        `that name in rulvar.config.mjs workflows to resume ` +
        '(resume requires the in-process workflow value)',
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
  if (sub !== 'list' || rest.length > 0) {
    throw new ConfigError('usage: rulvar kb <list | inbox | gate | sweep> (no aliases in v1)');
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
  const flags = parseCommonFlags(argv);
  if (flags.positionals.length > 0) {
    throw new ConfigError('usage: rulvar kb inbox [--store PATH]');
  }
  let plan: PlanLedgerModule;
  try {
    plan = (await import('@rulvar/plan')) as unknown as PlanLedgerModule;
  } catch {
    throw new ConfigError(
      'rulvar kb inbox requires @rulvar/plan (the RunLedger fold behind the LedgerExport seam)',
    );
  }
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
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      store: { type: 'string' },
      approver: { type: 'string' },
      'ruled-out': { type: 'string' },
      'contrast-run': { type: 'string' },
      'contrast-eval': { type: 'string' },
      confidence: { type: 'string' },
    },
  });
  const usage =
    'usage: rulvar kb gate <runId> <entryRef> --approver NAME --ruled-out a,b,c ' +
    '[--contrast-run runId#seq | --contrast-eval reportId:caseId[,caseId...]] ' +
    '[--confidence high|medium|low] [--store PATH]';
  const runId = positionals[0];
  const entryRefRaw = positionals[1];
  if (runId === undefined || entryRefRaw === undefined || positionals.length > 2) {
    throw new ConfigError(usage);
  }
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
  if (values['contrast-run'] !== undefined && values['contrast-eval'] !== undefined) {
    throw new ConfigError('--contrast-run and --contrast-eval are mutually exclusive');
  }
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

  let plan: PlanLedgerModule;
  try {
    plan = (await import('@rulvar/plan')) as unknown as PlanLedgerModule;
  } catch {
    throw new ConfigError(
      'rulvar kb gate requires @rulvar/plan (the RunLedger fold behind the LedgerExport seam)',
    );
  }
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
        '({ committerId, models, cases })',
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
