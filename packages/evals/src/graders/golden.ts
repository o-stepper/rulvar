/**
 * Golden-output grader (docs/09, section 7.1): compares the run's
 * structured output against a committed expected output by deep JSON
 * equality. Pure and host-side; no engine involvement.
 */
import type { Json } from '@lurker/core';
import type { Grader, GraderVerdict } from '../case.js';

function deepEqual(a: Json | undefined, b: Json | undefined): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || b === null || a === undefined || b === undefined) {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length || aKeys.some((key, index) => key !== bKeys[index])) {
      return false;
    }
    return aKeys.every((key) =>
      deepEqual((a as Record<string, Json>)[key], (b as Record<string, Json>)[key]),
    );
  }
  return false;
}

export interface GoldenGraderOptions {
  name?: string;
}

export function goldenGrader(expected: Json, options: GoldenGraderOptions = {}): Grader {
  const name = options.name ?? 'golden';
  return {
    name,
    grade(context): GraderVerdict {
      const passed = deepEqual(context.value, expected);
      return {
        grader: name,
        passed,
        ...(passed ? {} : { details: { expected, actual: context.value ?? null } }),
      };
    },
  };
}
