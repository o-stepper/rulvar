/**
 * CostReport builders (M5-T03; follow-up: one pure fold).
 *
 * `costReportFromJournal` is THE report: a pure fold over terminal
 * entries that both the engine's settle path and stored-run inspection
 * (shells, `rulvar inspect`) use, so a replayed run reports the same
 * numbers byte for byte. Terminal entries carry their attribution facts
 * (`costAttribution`: phase, agent type, primary role, budget account,
 * finalize-reserve flag) exactly so this fold can reproduce every
 * breakdown without live state; entries written before the facts
 * shipped fold under the documented fallbacks (empty phase, 'unknown'
 * agent type, role 'loop').
 *
 * Inclusion policy, applied to the total and EVERY breakdown alike:
 * terminal usage once, priced per serving slice, entries under
 * abandoned subtrees contribute zero (their spend is tracked separately
 * in the abandoned-spend ledger the orchestrator sees). Attempts that
 * were paid but never abandoned (a cancelled root attempt, a dangling
 * child) are real spend and stay included everywhere.
 *
 * `buildCostReport` folds the LIVE per-run attribution buckets around
 * the ledger total; it remains for hosts that accumulated their own
 * `CostAttribution`, but the engine no longer builds outcomes from it.
 *
 * Unpriced models surface in `unpriced`, never as a silent zero.
 */
import { buildAbandonFold } from '../journal/disposition.js';
import { priceEntryBilling, type JournalEntry } from '../l0/entries.js';
import { ROOT_ACCOUNT } from './budget.js';
import { requireFiniteNumbersDeep } from '../l0/validate-numbers.js';
import type { InvocationRole, ModelRef, Usage } from '../l0/messages.js';
import type { CostAttribution } from './ctx.js';
import type { CostReport } from './run-handle.js';

// The uncast literal is the exhaustiveness gate: a role missing here is
// a compile error, not a bucket that folds `undefined + usd` into NaN
// (v1.59.0 review P0: 'synthesize' was absent from the cast array).
function emptyByRole(): Record<InvocationRole, number> {
  return {
    orchestrate: 0,
    plan: 0,
    loop: 0,
    finalize: 0,
    extract: 0,
    summarize: 0,
    synthesize: 0,
  };
}

/** The orchestrator sub-account naming rule of makeOrchestratorWorkflow. */
function isOrchestratorAccount(scope: string): boolean {
  return scope === 'orchestrator' || scope.endsWith('/orchestrator');
}

/**
 * The named fallback bucket of the attribution folds (RV3604): an
 * absent phase, an EMPTY phase and an empty agentType all fold under
 * 'unknown' instead of minting a '' key. The third comparison run's
 * report read `byPhase {"": 5.58}` for the whole run and a '' bucket
 * beside the named agent types: the empty string passed the `??`
 * fallback, and a '' key is unaddressable in every downstream table.
 * Both builders and both live accumulation sites apply this one rule,
 * so the live report and the journal fold cannot disagree on the key.
 */
export function attributionBucket(value: string | undefined): string {
  return value === undefined || value === '' ? 'unknown' : value;
}

/** {@link attributionBucket} over a whole live map, merging folded keys. */
function foldBuckets(source: ReadonlyMap<string, number>): Record<string, number> {
  const folded: Record<string, number> = {};
  for (const [key, usd] of source) {
    const bucket = attributionBucket(key);
    folded[bucket] = (folded[bucket] ?? 0) + usd;
  }
  return folded;
}

/**
 * Folds the per-run attribution buckets into the normative CostReport.
 * Live attribution buckets never see abandoned subtrees, so a host
 * that tracked abandoned spend itself passes it as `abandoned`;
 * omitted, the report shows a gross equal to the net. Non-finite
 * numbers anywhere in the inputs are a typed refusal (RV705): this
 * exported builder is the same public surface as
 * {@link costReportFromJournal} and holds the same RV610 doctrine,
 * instead of letting an Infinity or NaN serialize into null downstream.
 */
export function buildCostReport(
  attribution: CostAttribution,
  totalUsd: number,
  abandoned: CostReport['abandoned'] = { usd: 0, unpriced: [] },
): CostReport {
  const byRole = emptyByRole();
  for (const [role, usd] of attribution.byRole) {
    byRole[role] = usd;
  }
  const orchestrator = attribution.orchestrator ?? {
    spentUsd: 0,
    wakes: 0,
    forcedFinish: false,
    reserveUsedUsd: 0,
  };
  const report: CostReport = {
    basis: 'locally-estimated',
    totalUsd,
    grossUsd: totalUsd + abandoned.usd,
    abandoned,
    byModel: Object.fromEntries(attribution.byModel),
    byPhase: foldBuckets(attribution.byPhase),
    byAgentType: foldBuckets(attribution.byAgentType),
    byRole,
    orchestrator: {
      ...orchestrator,
      // H-OrchShare: the epsilon-floored share.
      share: orchestrator.spentUsd / Math.max(totalUsd, 0.01),
    },
    unpriced: attribution.unpriced,
  };
  // The public boundary (RV610, completed by RV705): the journal fold
  // refuses non-finite reports, and the live builder a host feeds its
  // own accumulation must refuse them identically.
  requireFiniteNumbersDeep(report, 'costReport');
  return report;
}

/**
 * The pure journal fold: the complete CostReport from terminal entries,
 * the same summation the kernel ledger uses (each terminal entry's
 * usage enters the sum once, priced per servedBy slice, abandoned
 * subtrees contribute zero).
 * The orchestrator block folds too: spend attributed to the
 * orchestrator sub-account, the reserve-funded share of it, the armed
 * wake count, and the at-cap freeze flag from the journaled cap
 * decision, so a replay-only resume reproduces the block instead of
 * reading this process's live accounts (which a replay never charges).
 */
export function costReportFromJournal(
  entries: readonly JournalEntry[],
  priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined,
): CostReport {
  const abandonFold = buildAbandonFold(entries);
  const byModel: Record<string, number> = {};
  const byPhase: Record<string, number> = {};
  const byAgentType: Record<string, number> = {};
  const byRole = emptyByRole();
  const unpriced: Array<{ model: string; usage: Usage }> = [];
  let totalUsd = 0;
  let usageApprox = false;
  // The gross side of the split (P1.3): abandoned terminal usage,
  // priced by the same slice fold but kept out of totalUsd and every
  // breakdown, so the net report stays byte for byte what it was.
  let abandonedUsd = 0;
  const abandonedUnpriced: Array<{ model: string; usage: Usage }> = [];
  let abandonedApprox = false;
  let orchestratorSpentUsd = 0;
  let reserveUsedUsd = 0;
  let wakes = 0;
  let forcedFinish = false;
  let wireRequests = 0;
  for (const entry of entries) {
    // The wire denominator (RV1904): every settled entry's dispatch
    // records, abandoned included (those attempts hit the wire all the
    // same), each record counting its absorbed continuations. Counted
    // before the abandoned skip on purpose.
    if (entry.status !== 'running') {
      for (const record of entry.providerCalls ?? []) {
        wireRequests += record.wireRequests ?? 1;
      }
    }
    // Orchestrator lifecycle facts ride non-usage entries and are
    // counted before the usage skips: the at-cap freeze decision and
    // the armed wake suspensions.
    if (
      entry.kind === 'decision' &&
      (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'orchestrator_budget_cap'
    ) {
      forcedFinish = true;
    }
    if (
      entry.kind === 'external' &&
      entry.status === 'suspended' &&
      typeof (entry.value as { key?: string } | undefined)?.key === 'string' &&
      ((entry.value as { key: string }).key.startsWith('wake:') ||
        (entry.value as { key: string }).key.includes(':wake:'))
    ) {
      wakes += 1;
    }
    if (
      entry.kind !== 'resolution' &&
      entry.kind !== 'abandon' &&
      abandonFold.isAbandoned(entry.ref ?? entry.seq)
    ) {
      // The provider billed these attempts all the same: they fold into
      // the abandoned ledger (and so into grossUsd), never into the net
      // total or its breakdowns.
      if (entry.status !== 'running' && entry.usage !== undefined) {
        const abandonedPriced = priceEntryBilling(entry, priceUsd);
        abandonedUsd += abandonedPriced.usd;
        for (const slice of abandonedPriced.unpriced) {
          abandonedUnpriced.push({ model: slice.servedBy, usage: slice.usage });
        }
        if (entry.usageApprox === true) {
          abandonedApprox = true;
        }
      }
      continue;
    }
    if (entry.status === 'running' || entry.usage === undefined) {
      continue;
    }
    // One agent call can span several serving models (loop, extract,
    // finalize, and summarize route independently). A fully attributed
    // entry prices per provider call (RV504: a nonlinear tier fires per
    // request, never on the aggregate); anything else prices per slice
    // at its own model's rate, exactly as before.
    const priced = priceEntryBilling(entry, priceUsd);
    for (const slice of priced.unpriced) {
      unpriced.push({ model: slice.servedBy, usage: slice.usage });
    }
    for (const unit of priced.units) {
      byModel[unit.servedBy] = (byModel[unit.servedBy] ?? 0) + unit.usd;
    }
    totalUsd += priced.usd;
    // One contributing entry with approximate usage makes the whole total
    // an estimate: raise the flag on the same entries the total sums over.
    if (entry.usageApprox === true) {
      usageApprox = true;
    }
    const facts = entry.costAttribution;
    // The named fallback (RV3604): absent AND empty fold under
    // 'unknown'; `?? 'unknown'` alone let '' through, and phase used
    // to fall back to '' itself.
    const phase = attributionBucket(facts?.phase);
    byPhase[phase] = (byPhase[phase] ?? 0) + priced.usd;
    const agentType = attributionBucket(facts?.agentType);
    byAgentType[agentType] = (byAgentType[agentType] ?? 0) + priced.usd;
    // Each priced slice lands in ITS OWN phase bucket (v1.19.0 review
    // P1-2): a slice without a role (written before roles shipped, or
    // the whole-entry fallback slice) folds under the entry's primary
    // role, the same documented fallback as the other facts.
    const primaryRole = facts?.role ?? 'loop';
    for (const unit of priced.units) {
      byRole[unit.role ?? primaryRole] += unit.usd;
    }
    if (facts?.budgetAccount !== undefined && isOrchestratorAccount(facts.budgetAccount)) {
      orchestratorSpentUsd += priced.usd;
      if (facts.finalizeReserve === true) {
        reserveUsedUsd += priced.usd;
      }
    }
  }
  const report: CostReport = {
    // The provenance marker (RV1413): both builders stamp the same
    // literal, so a journal fold and a live accumulation report their
    // dollars under the same declared basis.
    basis: 'locally-estimated',
    totalUsd,
    grossUsd: totalUsd + abandonedUsd,
    wireRequests,
    abandoned: {
      usd: abandonedUsd,
      unpriced: abandonedUnpriced,
      ...(abandonedApprox ? { usageApprox: true } : {}),
    },
    byModel,
    byPhase,
    byAgentType,
    byRole,
    orchestrator: {
      spentUsd: orchestratorSpentUsd,
      // H-OrchShare: the epsilon-floored share.
      share: orchestratorSpentUsd / Math.max(totalUsd, 0.01),
      wakes,
      forcedFinish,
      reserveUsedUsd,
    },
    unpriced,
    // Only when true: an absent field reads as exact, and every existing
    // exact usage report stays byte for byte what it was.
    ...(usageApprox ? { usageApprox: true } : {}),
  };
  // The public boundary (RV610): per-entry folds are guarded, but the
  // CROSS-entry accumulation can still overflow finite fold sums, and a
  // published report must never carry Infinity or NaN.
  requireFiniteNumbersDeep(report, 'costReport');
  return report;
}

/**
 * The per-account settled fold (RV1505, closing the DEF-7 remainder):
 * each budget account's INCLUSIVE spend from the same entries, skips,
 * and per-request pricing the net CostReport folds, with the account
 * tree read from the journaled spawn-admission decisions
 * (childScope -> parentAccountScope). A scope with no journaled edge
 * folds under the root, which is where its spend already lands. Two
 * consumers: hosts and audits hold any account's accumulated spend
 * against its cap after the fact, and the engine seeds these rows
 * into every re-opened account on resume (RunBudget seed.accounts),
 * so a resumed segment admits against the same history a continuous
 * run would have accumulated; the seed is safe for continuations
 * because reruns of journaled invocations re-admit as recovered
 * rather than re-clearing projected admission. Unpriced slices
 * contribute zero, exactly like the net total, and an admission-edge
 * cycle (a corrupt journal) terminates the walk instead of spinning.
 */
export function accountSpendFromJournal(
  entries: readonly JournalEntry[],
  priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined,
): Record<string, number> {
  const abandonFold = buildAbandonFold(entries);
  const parents = new Map<string, string>();
  const direct = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind === 'decision') {
      const value = entry.value as
        { decisionType?: string; childScope?: unknown; parentAccountScope?: unknown } | undefined;
      if (
        value?.decisionType === 'spawn-admission' &&
        typeof value.childScope === 'string' &&
        typeof value.parentAccountScope === 'string'
      ) {
        parents.set(value.childScope, value.parentAccountScope);
      }
    }
    if (
      entry.kind !== 'resolution' &&
      entry.kind !== 'abandon' &&
      abandonFold.isAbandoned(entry.ref ?? entry.seq)
    ) {
      // The provider billed these attempts, but they fold into the
      // abandoned ledger, never into any account's admissible spend,
      // exactly the net-total rule.
      continue;
    }
    if (entry.status === 'running' || entry.usage === undefined) {
      continue;
    }
    const priced = priceEntryBilling(entry, priceUsd);
    const account = entry.costAttribution?.budgetAccount ?? ROOT_ACCOUNT;
    direct.set(account, (direct.get(account) ?? 0) + priced.usd);
  }
  const inclusive: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const [account, usd] of direct) {
    let cursor: string | undefined = account;
    const visited = new Set<string>();
    while (cursor !== undefined && !visited.has(cursor)) {
      visited.add(cursor);
      inclusive[cursor] = (inclusive[cursor] ?? 0) + usd;
      cursor = cursor === ROOT_ACCOUNT ? undefined : (parents.get(cursor) ?? ROOT_ACCOUNT);
    }
  }
  return { ...inclusive };
}
