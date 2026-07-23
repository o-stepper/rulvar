/**
 * @rulvar/store-conformance: the executable store conformance kit
 * (M2-T11, DEF-4). A store implementation passes journalStoreConformance
 * (and leasableStoreConformance when it has the lease capability,
 * fencedWritesConformance when it declares the fencedWrites promise, and
 * fencedTranscriptsConformance when its transcript store declares the
 * same promise) or it is not a Rulvar store; the kit is the executable
 * definition of the storage seam frozen at 1.0. Stores meant for
 * multi-process queue deployments additionally run the adversarial
 * multi-process soak (runMultiProcessSoak: real OS processes storm one
 * store location through every fenced write surface and the referee
 * diffs the state against the serial history the epochs promise).
 *
 * Usage under Vitest:
 *
 *   const suite = journalStoreConformance(() => new MyStore());
 *   registerConformance(suite, { describe, it });
 *
 * Public docs: https://docs.rulvar.com/guide/stores (conformance
 * obligations) and https://docs.rulvar.com/guide/testing (conformance tier).
 */
export {
  registerConformance,
  makeSuite,
  stableStringify,
  type ConformanceCheck,
  type ConformanceSuite,
  type StoreFactory,
  type TestRegistrar,
} from './types.js';
export { journalStoreConformance } from './journal.js';
export { leasableStoreConformance } from './leasable.js';
export { fencedWritesConformance } from './fenced-writes.js';
export {
  fencedTranscriptsConformance,
  type FencedTranscriptsFixture,
} from './fenced-transcripts.js';
export {
  countSoakActivity,
  DEFAULT_SOAK_QUORUM,
  parseSoakReport,
  runMultiProcessSoak,
  runSoakWriter,
  soakWriterConfigFromEnv,
  verifySoakHistory,
  type MultiProcessSoakOptions,
  type MultiProcessSoakResult,
  type SoakAcceptSurface,
  type SoakActivity,
  type SoakEvent,
  type SoakProbeSurface,
  type SoakQuorum,
  type SoakWriterConfig,
  type SoakWriterHooks,
} from './multi-process-soak.js';
export {
  GOLDEN_FOLD_JOURNAL,
  GOLDEN_FOLD_STATE_SHA256,
  foldStateSha256,
  materializeFoldState,
} from './fixtures/golden-fold.js';
