/**
 * The adversarial claim corpus (RV1704). The eighteenth comparison
 * benchmark shipped a dossier whose three worst failures were SEMANTIC
 * and each rode straight past a green mechanical surface: "real models
 * were not run" beside 125 recorded wire requests, `@rulvar/plan`
 * described through a `packages/planner` citation, and a store default
 * inverted in prose. A judge model can only rule on what the folds put
 * in front of it, so the regression that matters offline is the
 * PRECONDITION: for every named failure class, do the deterministic
 * layers still form the pair, trigger on the run facts, prioritize the
 * declared claim, and grade the coverage honestly?
 *
 * This module pins that precondition as data plus one pure runner.
 * Each case carries a draft written to commit one class of falsehood,
 * the pool readings or recorded fact sheet that contradict it, and the
 * mechanical expectations. `runClaimCorpus()` executes every case
 * through the SAME pure folds the orchestrator runs (`pairDraftClaims`,
 * `pairRunFactClaims`, `claimCoverageOf`), no engine and no model, and
 * reports per-case verdicts; the shipped test asserts every case
 * passes, so a change that stops forming any of these pairs fails the
 * suite by name.
 *
 * What this deliberately does NOT claim: that the pairs would be judged
 * correctly. The pool excerpts ride every pair precisely so a host can
 * feed them to a real judge (`judgeGrader`, or the orchestrator's own
 * claim-consistency pass with `critical` declared) and adjudicate the
 * semantic half with a model of their choosing, on their budget.
 */
import type {
  ClaimCoverageGrade,
  ClaimPair,
  ContradictionSource,
  RunFactsSheet,
} from '@rulvar/core';
import { claimCoverageOf, pairDraftClaims, pairRunFactClaims } from '@rulvar/core';

/**
 * The failure classes the eighteenth benchmark shipped, plus the bound
 * classes, plus the nineteenth benchmark's pair (RV1809):
 * 'modality-overclaim' is a mitigation stated as an unconditional
 * guarantee, and 'scope-ambiguity' is a child-only total printed as a
 * whole-workflow figure.
 */
export type ClaimCorpusClass =
  | 'live-fact'
  | 'package-identity'
  | 'inverted-default'
  | 'numeric-range'
  | 'negation'
  | 'bounded-coverage'
  | 'modality-overclaim'
  | 'scope-ambiguity';

/** One adversarial case: a draft, its contradicting evidence, and the mechanical expectations. */
export interface ClaimCorpusCase {
  id: string;
  class: ClaimCorpusClass;
  /** The composed prose committing the falsehood. */
  draft: string;
  /** Settled pool readings that contradict it (source-claim classes). */
  pool?: readonly ContradictionSource[];
  /** The recorded fact sheet that contradicts it (run-claim classes). */
  runFacts?: RunFactsSheet;
  /** Caller-style substring triggers for the run-facts arm. */
  runFactTerms?: readonly string[];
  /** Critical anchor declarations, exactly as a caller would pass them. */
  critical?: readonly string[];
  /** Pair bound override, for the bounded-coverage class. */
  max?: number;
  expect: {
    /** Source-claim pairs the fold must form, at minimum. */
    minPairs?: number;
    /** Run-facts pairs the fold must form, at minimum. */
    minRunFactPairs?: number;
    /** Anchors that must appear among the formed pairs. */
    anchors?: readonly string[];
    /** The coverage grade the assembled meta must carry. */
    coverage?: ClaimCoverageGrade;
  };
}

/** The shipped corpus, one case per failure class, adversarial by design. */
export const CLAIM_CORPUS: readonly ClaimCorpusCase[] = [
  {
    id: 'live-fact-models-not-run',
    class: 'live-fact',
    draft:
      'The analysis stayed strictly offline: real models were not run in this experiment, ' +
      'and no provider traffic was generated at any point of the audit.',
    runFacts: {
      text:
        'The run recorded 125 wire requests across its agents, 6592771 input tokens and ' +
        '115788 output tokens, all identity-bearing.',
      ids: ['comparison-run-aug03'],
      numbers: [125, 6592771, 115788],
    },
    runFactTerms: ['not run', 'no provider traffic'],
    expect: { minRunFactPairs: 1 },
  },
  {
    id: 'package-identity-plan-planner',
    class: 'package-identity',
    draft:
      'The @rulvar/plan package is the hybrid that writes workflow scripts before the run ' +
      '(packages/planner/src/plan.ts:1).',
    pool: [
      {
        nodeId: 'agent:2',
        text:
          'The plan-writing hybrid is @rulvar/planner: the plan agent, compileScript, and ' +
          'the worker sandbox are its exports (packages/planner/src/plan.ts:1-40). The ' +
          '@rulvar/plan package is the PlanRunner orchestration extension and contains no ' +
          'plan agent (packages/plan/src/plan-state.ts:1-30).',
      },
    ],
    critical: ['packages/planner/src/plan.ts'],
    expect: { minPairs: 1, anchors: ['packages/planner/src/plan.ts:1'], coverage: 'full' },
  },
  {
    id: 'inverted-default-repair-on-load',
    class: 'inverted-default',
    draft:
      'Repair on load ships disabled by default, so a torn journal tail stays broken until ' +
      'an operator opts in (packages/core/src/stores/jsonl.ts:123).',
    pool: [
      {
        nodeId: 'agent:4',
        text:
          'JsonlFileStore repairs a salvageable torn tail on load BY DEFAULT; repairOnLoad: ' +
          'false is the verify-only opt-out for auditors ' +
          '(packages/core/src/stores/jsonl.ts:123-140).',
      },
    ],
    expect: { minPairs: 1, anchors: ['packages/core/src/stores/jsonl.ts:123'], coverage: 'full' },
  },
  {
    id: 'numeric-range-evidence-counts',
    class: 'numeric-range',
    draft:
      'Every role preserved 18-20 evidence entries, comfortably inside the declared floor ' +
      'for all six specialists.',
    runFacts: {
      text: 'Recorded evidence entries per child: 23, 18, 22, 20, 20, 20; six children ok.',
      ids: ['comparison-run-aug03'],
      numbers: [23, 18, 22, 20],
    },
    expect: { minRunFactPairs: 1 },
  },
  {
    id: 'negation-synthesis-wires',
    class: 'negation',
    draft:
      'No provider requests were dispatched during synthesis; the composition phase ' +
      'performed zero wire calls end to end.',
    runFacts: {
      text: 'The synthesize role dispatched 2 wire requests totaling 27528 tokens.',
      ids: ['comparison-run-aug03'],
      numbers: [27528],
    },
    runFactTerms: ['zero wire', 'no provider requests'],
    expect: { minRunFactPairs: 1 },
  },
  {
    id: 'bounded-coverage-grades-partial',
    class: 'bounded-coverage',
    draft:
      'The executor refuses masked writes (src/exec.ts:10-20). The ledger records every ' +
      'intent (src/ledger.ts:5-9). The outbox settles receipts exactly once per key ' +
      '(src/outbox.ts:30-44).',
    pool: [
      {
        nodeId: 'agent:1',
        text: 'The executor admits masked writes when forced (src/exec.ts:12).',
      },
      { nodeId: 'agent:2', text: 'The ledger drops intents over the cap (src/ledger.ts:7).' },
      { nodeId: 'agent:3', text: 'The outbox re-settles a duplicate key (src/outbox.ts:35).' },
    ],
    max: 1,
    expect: { minPairs: 1, coverage: 'partial' },
  },
  {
    id: 'modality-overclaim-attestation-stop',
    class: 'modality-overclaim',
    draft:
      'Any drift of an attested toolset, the executable body included, is stopped pre-wire ' +
      'unconditionally: a changed tool always refuses at spawn time ' +
      '(packages/core/src/tools/toolset-hash.ts:85).',
    pool: [
      {
        nodeId: 'agent:3',
        text:
          'The attestation pin holds the resolved toolset to the attested CONTRACT hash, ' +
          'name, description, parameters, and version ' +
          '(packages/core/src/tools/toolset-hash.ts:85). An executable body edit under an ' +
          'unchanged contract does not move that hash by design; version is the drift ' +
          'lever, and the authority hash covers risk, needsApproval, executor, and ' +
          'executorSpec (packages/core/src/l0/spi/toolsource.ts:53).',
      },
    ],
    critical: ['packages/core/src/tools/toolset-hash.ts'],
    expect: {
      minPairs: 1,
      anchors: ['packages/core/src/tools/toolset-hash.ts:85'],
      coverage: 'full',
    },
  },
  {
    id: 'scope-ambiguity-child-totals-as-workflow',
    class: 'scope-ambiguity',
    draft:
      'The current workflow performed exactly 100 wire requests in total, 6126893 input ' +
      'tokens and 94555 output tokens end to end.',
    runFacts: {
      text:
        'RUN FACTS, scope settled-children-only: 100 wire requests, 6126893 input tokens ' +
        'and 94555 output tokens across the six settled children; the terminal workflow ' +
        'invoice additionally carries the orchestrator, the judges, and the synthesis at ' +
        '118 wires, 6517187 input and 138947 output.',
      ids: ['comparison-run-aug04'],
      numbers: [100, 6126893, 94555, 118, 6517187, 138947],
    },
    runFactTerms: ['in total', 'end to end'],
    expect: { minRunFactPairs: 1 },
  },
];

/** One case's verdict: mechanical expectations against the folds' output. */
export interface ClaimCorpusVerdict {
  id: string;
  class: ClaimCorpusClass;
  pass: boolean;
  /** Every unmet expectation, named; empty exactly when `pass`. */
  failures: string[];
  /** The formed source-claim pairs, for judge handoff. */
  pairs: ClaimPair[];
  /** The formed run-facts pairs, for judge handoff. */
  runFactPairs: ClaimPair[];
  /** The grade the assembled meta carries. */
  coverage: ClaimCoverageGrade;
}

/**
 * Runs every corpus case through the pure folds and grades the
 * mechanical expectations. No engine, no model, no journal: the same
 * functions the orchestrator runs, on the same bytes.
 */
export function runClaimCorpus(
  cases: readonly ClaimCorpusCase[] = CLAIM_CORPUS,
): ClaimCorpusVerdict[] {
  return cases.map((corpusCase) => {
    const failures: string[] = [];
    const fold = pairDraftClaims(corpusCase.draft, corpusCase.pool ?? [], {
      ...(corpusCase.critical === undefined ? {} : { critical: corpusCase.critical }),
      ...(corpusCase.max === undefined ? {} : { max: corpusCase.max }),
    });
    const runFold =
      corpusCase.runFacts === undefined
        ? undefined
        : pairRunFactClaims(corpusCase.draft, corpusCase.runFacts, {
            ...(corpusCase.runFactTerms === undefined ? {} : { terms: corpusCase.runFactTerms }),
          });
    const expected = corpusCase.expect;
    if (expected.minPairs !== undefined && fold.pairs.length < expected.minPairs) {
      failures.push(
        `formed ${String(fold.pairs.length)} source-claim pair(s), expected at least ` +
          String(expected.minPairs),
      );
    }
    const runFactPairs = runFold?.pairs ?? [];
    if (expected.minRunFactPairs !== undefined && runFactPairs.length < expected.minRunFactPairs) {
      failures.push(
        `formed ${String(runFactPairs.length)} run-facts pair(s), expected at least ` +
          String(expected.minRunFactPairs),
      );
    }
    for (const anchor of expected.anchors ?? []) {
      if (!fold.pairs.some((pair) => pair.anchor === anchor)) {
        failures.push(`no formed pair carries the expected anchor '${anchor}'`);
      }
    }
    const coverage = claimCoverageOf({
      draftCitingSentences: fold.draftCitingSentences,
      truncated: fold.truncated,
      coveredCitingSentences: fold.coveredCitingSentences,
      ...(fold.criticalUncoveredTotal === undefined
        ? {}
        : { criticalUncoveredTotal: fold.criticalUncoveredTotal }),
      ...(runFold?.truncated === true ? { runFactPairsTruncated: true as const } : {}),
    });
    if (expected.coverage !== undefined && coverage !== expected.coverage) {
      failures.push(`coverage graded '${coverage}', expected '${expected.coverage}'`);
    }
    return {
      id: corpusCase.id,
      class: corpusCase.class,
      pass: failures.length === 0,
      failures,
      pairs: fold.pairs,
      runFactPairs,
      coverage,
    };
  });
}
