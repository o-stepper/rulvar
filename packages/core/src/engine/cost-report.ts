/**
 * CostReport builders (M5-T03; docs/09, section "CostReport"). Two
 * sources, one shape:
 *
 * - `buildCostReport` folds the LIVE per-run attribution buckets (ctx
 *   accumulates byModel/byPhase/byAgentType/byRole per call) around the
 *   ledger-fold total, so report totals equal the budget ledger fold
 *   totals exactly at settle.
 * - `costReportFromJournal` is the pure journal fold for STORED runs
 *   (shells, `lurker inspect`): terminal usage priced per servedBy with
 *   abandoned subtrees contributing zero, exactly like the kernel's
 *   ledger fold. Phase, agentType, and role attribution are live-run
 *   facts that entries do not carry, so those buckets are empty here;
 *   byRole and the orchestrator block complete in M7 (DEF-7).
 *
 * Unpriced models surface in `unpriced`, never as a silent zero
 * (docs/04, section "Pricing").
 */
import { buildAbandonFold } from '../journal/disposition.js';
import type { JournalEntry } from '../l0/entries.js';
import type { InvocationRole, ModelRef, Usage } from '../l0/messages.js';
import type { CostAttribution } from './ctx.js';
import type { CostReport } from './run-handle.js';

const ROLES: InvocationRole[] = ['orchestrate', 'plan', 'loop', 'finalize', 'extract', 'summarize'];

function emptyByRole(): Record<InvocationRole, number> {
  return Object.fromEntries(ROLES.map((role) => [role, 0])) as Record<InvocationRole, number>;
}

function zeroOrchestrator(): CostReport['orchestrator'] {
  return { spentUsd: 0, share: 0, wakes: 0, forcedFinish: false, reserveUsedUsd: 0 };
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
      // H-OrchShare: the epsilon-floored share (docs/06, Appendix A).
      share: orchestrator.spentUsd / Math.max(totalUsd, 0.01),
    },
    unpriced: attribution.unpriced,
  };
}

/**
 * The pure journal fold: byModel and totals from terminal entries, the
 * same summation the kernel ledger uses (terminal usage exactly once,
 * priced per servedBy, abandoned subtrees contribute zero).
 */
export function costReportFromJournal(
  entries: readonly JournalEntry[],
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined,
): CostReport {
  const abandonFold = buildAbandonFold(entries);
  const byModel: Record<string, number> = {};
  const unpriced: Array<{ model: string; usage: Usage }> = [];
  let totalUsd = 0;
  for (const entry of entries) {
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
    const servedBy = entry.servedBy;
    if (servedBy === undefined) {
      continue;
    }
    const usd = priceUsd(servedBy, entry.usage);
    if (usd === undefined) {
      unpriced.push({ model: servedBy, usage: entry.usage });
      continue;
    }
    byModel[servedBy] = (byModel[servedBy] ?? 0) + usd;
    totalUsd += usd;
  }
  return {
    totalUsd,
    byModel,
    byPhase: {},
    byAgentType: {},
    byRole: emptyByRole(),
    orchestrator: zeroOrchestrator(),
    unpriced,
  };
}
