/**
 * @lurker/store-conformance: the executable store conformance kit
 * (M2-T11, DEF-4). A store implementation passes journalStoreConformance
 * (and leasableStoreConformance when it has the lease capability) or it
 * is not a lurker store; the kit is the executable definition of the
 * storage seam frozen at 1.0 (docs/02, section "Compatibility policy").
 *
 * Usage under Vitest:
 *
 *   const suite = journalStoreConformance(() => new MyStore());
 *   registerConformance(suite, { describe, it });
 *
 * Owning specs: docs/03, section "Conformance obligations"; docs/11,
 * section "Conformance tier".
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
export {
  GOLDEN_FOLD_JOURNAL,
  GOLDEN_FOLD_STATE_SHA256,
  foldStateSha256,
  materializeFoldState,
} from './fixtures/golden-fold.js';
