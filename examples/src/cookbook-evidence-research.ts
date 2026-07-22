/**
 * Evidence-preserving research (cookbook recipe; the rendered
 * walk-through is https://docs.rulvar.com/guide/cookbook). A research
 * orchestration that cannot silently lose the specialists' evidence:
 * the children's full reports stay reachable through the evidence
 * tools, the finish result must carry the required sections and
 * preserve the children's citations (with the fabrication guard on),
 * and a rejected finish gets one bounded repair turn before the run
 * fails typed. Composition over public options only; the library ships
 * no "research" mode.
 */
import {
  evidencePreservedValidator,
  requiredSectionsValidator,
  type OrchestrateOptions,
} from '@rulvar/core';

export interface EvidenceResearchSpec {
  /** Section markers the final report must carry literally. */
  sections: string[];
  /** Preserved share of the children's distinct citations; default 0.95. */
  minShare?: number;
}

/**
 * Orchestration options for a research goal whose final report must
 * preserve the evidence. Pass as the third argument of
 * `orchestrate(engine, goal, evidenceResearchOptions(spec), { budgetUsd })`:
 * the root ceiling stays a run option, never part of the recipe.
 */
export function evidenceResearchOptions(spec: EvidenceResearchSpec): OrchestrateOptions {
  return {
    // The digest an await returns is a 400 char wake signal; these two
    // tools let the orchestrator page the settled children's FULL
    // reports and artifacts before it synthesizes.
    exposeChildResultTools: true,
    // Child statuses are part of the contract: a failed specialist can
    // never be presented as complete success.
    acceptance: { childPolicy: 'all-ok' },
    finishValidation: {
      validators: [
        requiredSectionsValidator({ sections: spec.sections }),
        // At least minShare of the children's citations must survive
        // into the final report, and requireKnown rejects citations no
        // child ever produced, so fabricated evidence cannot pad the
        // count.
        evidencePreservedValidator({
          ...(spec.minShare === undefined ? {} : { minShare: spec.minShare }),
          requireKnown: true,
        }),
      ],
      // One repair turn: the rejection reasons return to the model as
      // the finish call's error result, then the run fails typed.
      maxRepairs: 1,
    },
  };
}
