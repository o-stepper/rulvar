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
 * Folds the per-run attribution buckets into the normative CostReport.
 * Live attribution buckets never see abandoned subtrees, so a host
 * that tracked abandoned spend itself passes it as `abandoned`;
 * omitted, the report shows a gross equal to the net.
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
  return {
    totalUsd,
    grossUsd: totalUsd + abandoned.usd,
    abandoned,
    byModel: Object.fromEntries(attribution.byModel),
    byPhase: Object.fromEntries(attribution.byPhase),
    byAgentType: Object.fromEntries(attribution.byAgentType),
    byRole,
    orchestrator: {
      ...orchestrator,
      // H-OrchShare: the epsilon-floored share.
      share: orchestrator.spentUsd / Math.max(totalUsd, 0.01),
    },
    unpriced: attribution.unpriced,
  };
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
  for (const entry of entries) {
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
    const phase = facts?.phase ?? '';
    byPhase[phase] = (byPhase[phase] ?? 0) + priced.usd;
    const agentType = facts?.agentType ?? 'unknown';
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
    totalUsd,
    grossUsd: totalUsd + abandonedUsd,
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
