/**
 * Rubric grader: scores the output against
 * declared, named criteria with per-criterion verdicts. Criteria are pure
 * predicates; the grader is host-side and involves no engine calls.
 */
import type { Json } from '@rulvar/core';
import type { Grader, GraderVerdict } from '../case.js';

export interface RubricCriterion {
  name: string;
  check: (value: Json | undefined) => boolean;
}

export interface RubricGraderOptions {
  name?: string;
  /**
   * Minimum fraction of criteria that must pass; default 1 (all).
   * The fraction is also reported as the verdict score.
   */
  passThreshold?: number;
}

export function rubricGrader(
  criteria: RubricCriterion[],
  options: RubricGraderOptions = {},
): Grader {
  const name = options.name ?? 'rubric';
  const threshold = options.passThreshold ?? 1;
  return {
    name,
    grade(context): GraderVerdict {
      const rows = criteria.map((criterion) => ({
        name: criterion.name,
        passed: criterion.check(context.value),
      }));
      const score =
        criteria.length === 0 ? 1 : rows.filter((row) => row.passed).length / rows.length;
      return {
        grader: name,
        passed: score >= threshold,
        score,
        details: { criteria: rows },
      };
    },
  };
}
