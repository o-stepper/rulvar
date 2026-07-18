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
 * terminal usage exactly once, priced per serving slice, entries under
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
import { priceEntryUsage, type JournalEntry } from '../l0/entries.js';
import type { InvocationRole, ModelRef, Usage } from '../l0/messages.js';
import type { CostAttribution } from './ctx.js';
import type { CostReport } from './run-handle.js';

const ROLES: InvocationRole[] = ['orchestrate', 'plan', 'loop', 'finalize', 'extract', 'summarize'];

function emptyByRole(): Record<InvocationRole, number> {
  return Object.fromEntries(ROLES.map((role) => [role, 0])) as Record<InvocationRole, number>;
}

/** The orchestrator sub-account naming rule of makeOrchestratorWorkflow. */
function isOrchestratorAccount(scope: string): boolean {
  return scope === 'orchestrator' || scope.endsWith('/orchestrator');
}

/** Folds the per-run attribution buckets into the normative CostReport. */
export function buildCostReport(attribution: CostAttribution, totalUsd: number): CostReport {
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
 * the same summation the kernel ledger uses (terminal usage exactly
 * once, priced per servedBy slice, abandoned subtrees contribute zero).
 * The orchestrator block folds too: spend attributed to the
 * orchestrator sub-account, the reserve-funded share of it, the armed
 * wake count, and the at-cap freeze flag from the journaled cap
 * decision, so a replay-only resume reproduces the block instead of
 * reading this process's live accounts (which a replay never charges).
 */
export function costReportFromJournal(
  entries: readonly JournalEntry[],
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined,
): CostReport {
  const abandonFold = buildAbandonFold(entries);
  const byModel: Record<string, number> = {};
  const byPhase: Record<string, number> = {};
  const byAgentType: Record<string, number> = {};
  const byRole = emptyByRole();
  const unpriced: Array<{ model: string; usage: Usage }> = [];
  let totalUsd = 0;
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
      continue;
    }
    if (entry.status === 'running' || entry.usage === undefined) {
      continue;
    }
    // One agent call can span several serving models (loop, extract,
    // finalize, and summarize route independently): every slice is
    // priced at its own model's rate. An entry with no split prices its
    // whole usage at servedBy, exactly as before.
    const priced = priceEntryUsage(entry, priceUsd);
    for (const slice of priced.unpriced) {
      unpriced.push({ model: slice.servedBy, usage: slice.usage });
    }
    for (const slice of priced.priced) {
      byModel[slice.servedBy] = (byModel[slice.servedBy] ?? 0) + slice.usd;
    }
    totalUsd += priced.usd;
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
    for (const slice of priced.priced) {
      byRole[slice.role ?? primaryRole] += slice.usd;
    }
    if (facts?.budgetAccount !== undefined && isOrchestratorAccount(facts.budgetAccount)) {
      orchestratorSpentUsd += priced.usd;
      if (facts.finalizeReserve === true) {
        reserveUsedUsd += priced.usd;
      }
    }
  }
  return {
    totalUsd,
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
  };
}
