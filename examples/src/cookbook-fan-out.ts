/**
 * Research fan out (cookbook recipe; the rendered walk-through is
 * https://docs.rulvar.com/guide/cookbook). The tenth comparison
 * experiment assembled its fan out by hand and paid for every seam:
 * the children never received the task text, the call cap sat a
 * quarter below the template with no extension to convert the unspent
 * money, and an all ok acceptance with no salvage arm rejected the
 * whole run on one specialist's surplus bookkeeping call at 22 percent
 * of the budget. The recipe composes the shipped pieces instead:
 * `researchFanOut()` pairs the research profile (finalization window
 * with the surplus turn, the reserve summary, the money to calls
 * extension) with the acceptance that salvages what it can and
 * forecasts what it cannot, `childBrief: 'goal'` hands every child the
 * goal, and the evidence contract can demand the spread of sources the
 * task actually wants. Composition over public options only.
 */
import {
  researchFanOut,
  type AgentProfile,
  type EvidenceCategory,
  type OrchestrateOptions,
  type ResearchEvidenceEntry,
} from '@rulvar/core';

export interface FanOutResearchSpec {
  /** The confined repository root the specialists read. */
  root: string;
  /** Declared money per specialist, in USD. */
  budgetUsd: number;
  /** Specialists the acceptance requires; the spawn cap allows one replacement. */
  children: number;
  /** Verified evidence entries each specialist must record; default 4. */
  minEntries?: number;
  /** The spread of sources the task demands, e.g. `{ implementation: 2, tests: 1 }`. */
  distribution?: Partial<Record<EvidenceCategory, number>>;
}

export interface FanOutResearch {
  /** Register under the `researcher` name in `createEngine defaults.profiles`. */
  profile: AgentProfile;
  /** Pass as the third argument of `orchestrate(engine, goal, options, { budgetUsd })`. */
  options: OrchestrateOptions;
  /** The specialists' verified evidence, host side. */
  evidence: () => ResearchEvidenceEntry[];
}

/**
 * The fan out, assembled once: the preset's profile and acceptance, the
 * goal as every child's brief, a spawn cap of one seat above the roster
 * (a replacement stays possible), and the child result tools so the
 * coordinator reads full reports before composing.
 */
export function fanOutResearch(spec: FanOutResearchSpec): FanOutResearch {
  const kit = researchFanOut({
    root: spec.root,
    budgetUsd: spec.budgetUsd,
    children: spec.children,
    evidenceContract: {
      minEntries: spec.minEntries ?? 4,
      ...(spec.distribution === undefined ? {} : { distribution: spec.distribution }),
    },
  });
  return {
    profile: kit.profile,
    evidence: kit.evidence,
    options: {
      profiles: ['researcher'],
      maxSpawns: spec.children + 1,
      childBrief: 'goal',
      acceptance: kit.acceptance,
      exposeChildResultTools: true,
    },
  };
}
