/**
 * Bounded-budget orchestration (cookbook recipe; the rendered
 * walk-through is https://docs.rulvar.com/guide/cookbook). Two layers
 * bound the spend: the ROOT ceiling (`RunOptions.budgetUsd`, immutable
 * after start, covering the orchestrator and every child) and the
 * orchestrator's own sub-account cap with an explicit at-cap policy. A
 * spawn the remaining budget cannot fund is REFUSED by admission as a
 * typed tool error the model sees and works around; the run itself
 * keeps going and finishes under the ceiling.
 */
import type { OrchestrateOptions, RunOptions } from '@rulvar/core';

export interface BoundedBudgetSpec {
  /** The orchestrator sub-account cap in absolute dollars. */
  orchestratorCapUsd: number;
  /** Reserved for the final synthesis wake at the cap; default engine policy. */
  finalizeReserveUsd?: number;
}

/**
 * The orchestrator budget shape: a hard sub-cap with the
 * finish-with-partial policy, so hitting the cap produces an honest
 * partial (run status 'exhausted' territory), never a silent overrun.
 * Pass with a ROOT ceiling: `orchestrate(engine, goal,
 * boundedBudgetOptions(spec), rootCeiling(usd))`.
 */
export function boundedBudgetOptions(spec: BoundedBudgetSpec): OrchestrateOptions {
  return {
    budget: {
      capUsd: spec.orchestratorCapUsd,
      atCap: 'finish-with-partial',
      ...(spec.finalizeReserveUsd === undefined
        ? {}
        : { finalizeReserveUsd: spec.finalizeReserveUsd }),
    },
  };
}

/** The root hard ceiling over the WHOLE tree, frozen into RunMeta. */
export function rootCeiling(budgetUsd: number): RunOptions {
  return { budgetUsd };
}
