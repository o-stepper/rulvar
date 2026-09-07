/**
 * Research fan out (cookbook recipe; the rendered walk through is
 * https://docs.rulvar.com/guide/cookbook). The tenth comparison
 * experiment assembled its fan out by hand and paid for every seam:
 * the frozen question sat in a directory the research profile ignored
 * and the coordinator copied role strings into every spawn, so no
 * specialist ever read the task; the specialists ran a model class
 * below the coordinator's; the call cap sat a quarter below the
 * template with no extension to convert the unspent money; an all ok
 * acceptance with no salvage arm and no spare seat rejected the whole
 * run on one surplus bookkeeping call at 22 percent of the budget; and
 * the demand for citations across implementation, tests, docs, and
 * examples could not be declared, so the specialists cited docs alone.
 * This module is the same setup assembled right, from public options
 * only: the question file inside the readable root, one model class
 * for every specialist, `researchFanOut()` for the limits and the
 * acceptance (its forecast reaction raised to 'degrade' so the
 * synthesis still composes over a shortfall), the goal as every
 * child's brief, a spare seat in `maxSpawns`, the evidence spread in
 * the contract, and the synthesis that produces the document a judge
 * reads. Composition over public options only.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  researchFanOut,
  type AgentProfile,
  type EvidenceCategory,
  type ModelSpec,
  type OrchestrateAcceptance,
  type OrchestrateOptions,
  type ResearchEvidenceEntry,
} from '@rulvar/core';

/**
 * The research toolset's always on ignore list (`repositoryResearchToolset`
 * merges `ignore` over it); the recipe refuses to hide the question
 * behind either list.
 */
const TOOLSET_ALWAYS_IGNORED = ['.git', 'node_modules'];

export interface FanOutSpec {
  /** The confined repository root the specialists read; the frozen question lives under it. */
  root: string;
  /**
   * Root relative POSIX path of the frozen question. Every segment must
   * be listable by the research tools: not in `ignore`, not in the
   * toolset's always on list, and not hidden (a dot entry), or
   * `list_files` and `search_files` would never show it, which is the
   * seam the tenth comparison experiment's harness opened.
   */
  questionFile: string;
  /** Extra basenames the research tools skip, merged over the always on list. */
  ignore?: string[];
  /** Specialist agentType to its role brief: the task specific half of every child's card. */
  roles: Record<string, string>;
  /** One model class for every specialist; absent, the `loop` routing entry serves all of them. */
  specialistModel?: ModelSpec;
  /** Declared money per specialist, in USD: the profile's `estCost` and the extension's headroom floor. */
  budgetUsd: number;
  /** The evidence floor and the spread of sources the task demands. */
  evidence: {
    minEntries: number;
    distribution?: Partial<Record<EvidenceCategory, number>>;
  };
  /** Deterministic instruction lines for the synthesis that composes the deliverable. */
  synthesisInstructions?: string;
}

export interface FanOut {
  /** Register verbatim as `createEngine defaults.profiles`, one entry per role. */
  profiles: Record<string, AgentProfile>;
  /** The frozen question plus the run discipline; `childBrief: 'goal'` hands it to every child. */
  goal: string;
  /** Pass as the third argument of `orchestrate(engine, goal, options, { budgetUsd })`. */
  options: OrchestrateOptions;
  /** Every specialist's verified evidence, host side, keyed by role. */
  evidence: () => Record<string, ResearchEvidenceEntry[]>;
}

/**
 * The fan out, assembled once. The question is read from the root
 * first (a missing or hidden file fails here, loudly, instead of in
 * four specialists), one `researchFanOut` kit is built per role so
 * every specialist owns its evidence pool, and the profiles, the goal,
 * and the orchestrate options that pair with them come back together.
 */
export function assembleFanOut(spec: FanOutSpec): FanOut {
  const ignored = new Set([...TOOLSET_ALWAYS_IGNORED, ...(spec.ignore ?? [])]);
  for (const segment of spec.questionFile.split('/')) {
    if (segment === '' || segment === '.' || segment === '..') {
      throw new Error(
        `questionFile must be a clean root relative path; got '${spec.questionFile}'`,
      );
    }
    if (ignored.has(segment) || segment.startsWith('.')) {
      throw new Error(
        `the frozen question '${spec.questionFile}' would be invisible to the research tools: ` +
          `'${segment}' is ignored or hidden`,
      );
    }
  }
  const question = readFileSync(join(spec.root, spec.questionFile), 'utf8').trimEnd();

  const roles = Object.entries(spec.roles);
  const kits: Array<{ name: string; kit: ReturnType<typeof researchFanOut> }> = [];
  let acceptance: OrchestrateAcceptance | undefined;
  for (const [name, role] of roles) {
    const kit = researchFanOut({
      root: spec.root,
      ...(spec.ignore === undefined ? {} : { ignore: spec.ignore }),
      budgetUsd: spec.budgetUsd,
      children: roles.length,
      description: role,
      evidenceContract: {
        minEntries: spec.evidence.minEntries,
        ...(spec.evidence.distribution === undefined
          ? {}
          : { distribution: spec.evidence.distribution }),
      },
    });
    kits.push({ name, kit });
    // Every kit pairs the same acceptance with its profile.
    acceptance = kit.acceptance;
  }
  if (acceptance === undefined) {
    throw new Error('assembleFanOut needs at least one role');
  }

  const profiles: Record<string, AgentProfile> = {};
  for (const { name, kit } of kits) {
    profiles[name] = {
      ...kit.profile,
      ...(spec.specialistModel === undefined ? {} : { model: spec.specialistModel }),
    };
  }

  const goal = [
    question,
    '',
    'RUN DISCIPLINE:',
    `The frozen question above is also the file '${spec.questionFile}' under the research root. ` +
      `Spawn the ${String(roles.length)} specialists below in one parallel_agents call, one task ` +
      `per role, each with budgetUsd ${String(spec.budgetUsd)}. Wait for every handle, read every ` +
      'full settled result, and finish with a draft; the synthesis composes the final document.',
    ...roles.map(([name, role], index) => `${String(index + 1)}. agentType=${name}: ${role}`),
  ].join('\n');

  return {
    profiles,
    goal,
    options: {
      profiles: roles.map(([name]) => name),
      // One seat above the roster, so a replacement spawn stays possible.
      maxSpawns: roles.length + 1,
      childBrief: 'goal',
      // The preset's acceptance (all ok with both salvage arms, the
      // binding evidence floor, the roster floor, the forecast) with the
      // forecast's reaction raised from 'notify' to 'degrade': an unmet
      // policy settles as a named partial and the synthesis still runs.
      acceptance: { ...acceptance, onUnreachable: 'degrade' },
      exposeChildResultTools: true,
      synthesis: {
        mode: 'single',
        // The document a judge reads is composed over every specialist's
        // FULL output, with the run's own budget facts beside it.
        context: 'full',
        policyFacts: true,
        ...(spec.synthesisInstructions === undefined
          ? {}
          : { instructions: spec.synthesisInstructions }),
      },
    },
    evidence: () => Object.fromEntries(kits.map(({ name, kit }) => [name, kit.evidence()])),
  };
}
