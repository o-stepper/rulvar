/**
 * Conformance kit surface (M2-T11, DEF-4): an executable suite
 * parameterized by a store factory. A store implementation passes or it
 * is not a Rulvar store.
 */

/** One mandatory check; `run` rejects with a descriptive Error on violation. */
export interface ConformanceCheck {
  id: string;
  title: string;
  run(): Promise<void>;
}

export interface ConformanceSuite {
  name: string;
  checks: readonly ConformanceCheck[];
  /** Runs every check sequentially; throws on the first violation. */
  run(): Promise<void>;
}

/**
 * The factory contract: every call MUST return a fresh, isolated store
 * (checks run against independent instances; a JsonlFileStore factory
 * uses a fresh temp directory per call).
 */
export type StoreFactory<S> = () => Promise<S> | S;

/** Structural subset of the Vitest/Jest registration API. */
export interface TestRegistrar {
  describe(name: string, factory: () => void): void;
  it(name: string, fn: () => Promise<void>): void;
}

/** Registers the suite as one `describe` block with one `it` per check. */
export function registerConformance(suite: ConformanceSuite, api: TestRegistrar): void {
  api.describe(suite.name, () => {
    for (const check of suite.checks) {
      api.it(`${check.id}: ${check.title}`, () => check.run());
    }
  });
}

export function makeSuite(name: string, checks: readonly ConformanceCheck[]): ConformanceSuite {
  return {
    name,
    checks,
    async run(): Promise<void> {
      for (const check of checks) {
        await check.run();
      }
    },
  };
}

/** Assertion helper: conformance failures are plain Errors naming the check. */
export function ensure(condition: boolean, checkId: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`store-conformance ${checkId}: ${message}`);
  }
}

/** Canonical JSON with recursively sorted keys (fold-state hashing). */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
