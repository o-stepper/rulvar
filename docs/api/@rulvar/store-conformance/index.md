[**rulvar API reference**](../../index.md)

***

[rulvar API reference](/api/index.md) / @rulvar/store-conformance

# @rulvar/store-conformance

## Interfaces

| Interface | Description |
| ------ | ------ |
| [ConformanceCheck](/api/@rulvar/store-conformance/interfaces/ConformanceCheck.md) | One mandatory check; `run` rejects with a descriptive Error on violation. |
| [ConformanceSuite](/api/@rulvar/store-conformance/interfaces/ConformanceSuite.md) | @rulvar/store-conformance: the executable store conformance kit (M2-T11, DEF-4). A store implementation passes journalStoreConformance (and leasableStoreConformance when it has the lease capability) or it is not a rulvar store; the kit is the executable definition of the storage seam frozen at 1.0 (docs/02, section "Compatibility policy"). |
| [TestRegistrar](/api/@rulvar/store-conformance/interfaces/TestRegistrar.md) | Structural subset of the Vitest/Jest registration API. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [StoreFactory](/api/@rulvar/store-conformance/type-aliases/StoreFactory.md) | The factory contract: every call MUST return a fresh, isolated store (checks run against independent instances; a JsonlFileStore factory uses a fresh temp directory per call). |

## Variables

| Variable | Description |
| ------ | ------ |
| [GOLDEN\_FOLD\_JOURNAL](/api/@rulvar/store-conformance/variables/GOLDEN_FOLD_JOURNAL.md) | seq 0 agent spawn (running; abandoned by seq 6) seq 1 suspended external gate-a under the spawn's child scope seq 2 suspended external gate-b at the root seq 3 resolution of gate-a: schema-INVALID (never closes) seq 4 resolution of gate-a: applied seq 5 resolution of gate-a: noop (already_resolved) seq 6 abandon of the spawn: applied (covers the agent:0 subtree) seq 7 resolution of gate-b: applied (root scope, not covered) seq 8 abandon of gate-b: noop (already_resolved; first-closing-wins) seq 9 abandon of the spawn again: noop (target_abandoned) |
| [GOLDEN\_FOLD\_STATE\_SHA256](/api/@rulvar/store-conformance/variables/GOLDEN_FOLD_STATE_SHA256.md) | The reference hash; computed once from the kernel fold and frozen. |

## Functions

| Function | Description |
| ------ | ------ |
| [foldStateSha256](/api/@rulvar/store-conformance/functions/foldStateSha256.md) | - |
| [journalStoreConformance](/api/@rulvar/store-conformance/functions/journalStoreConformance.md) | - |
| [leasableStoreConformance](/api/@rulvar/store-conformance/functions/leasableStoreConformance.md) | - |
| [makeSuite](/api/@rulvar/store-conformance/functions/makeSuite.md) | @rulvar/store-conformance: the executable store conformance kit (M2-T11, DEF-4). A store implementation passes journalStoreConformance (and leasableStoreConformance when it has the lease capability) or it is not a rulvar store; the kit is the executable definition of the storage seam frozen at 1.0 (docs/02, section "Compatibility policy"). |
| [materializeFoldState](/api/@rulvar/store-conformance/functions/materializeFoldState.md) | Materializes the observable fold state of a journal: ref-entry classifications (invalid details excluded: validator message wording is not contractual), suspension states, and per-seq abandon coverage. |
| [registerConformance](/api/@rulvar/store-conformance/functions/registerConformance.md) | @rulvar/store-conformance: the executable store conformance kit (M2-T11, DEF-4). A store implementation passes journalStoreConformance (and leasableStoreConformance when it has the lease capability) or it is not a rulvar store; the kit is the executable definition of the storage seam frozen at 1.0 (docs/02, section "Compatibility policy"). |
| [stableStringify](/api/@rulvar/store-conformance/functions/stableStringify.md) | @rulvar/store-conformance: the executable store conformance kit (M2-T11, DEF-4). A store implementation passes journalStoreConformance (and leasableStoreConformance when it has the lease capability) or it is not a rulvar store; the kit is the executable definition of the storage seam frozen at 1.0 (docs/02, section "Compatibility policy"). |
