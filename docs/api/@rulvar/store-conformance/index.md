[**Rulvar API reference**](../../index.md)

***

[Rulvar API reference](/api/index.md) / @rulvar/store-conformance

# @rulvar/store-conformance

The executable conformance kit for Rulvar store adapters: append
atomicity, total per-run order, read-your-writes, payload opacity, lease
fencing, and golden fold-state fixtures. If you implement a custom
store, this suite is the contract your implementation must pass. Exports
`journalStoreConformance`, `leasableStoreConformance`, and
`registerConformance`.

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add -D @rulvar/store-conformance
```

## Documentation

- [Store authors](https://docs.rulvar.com/guide/store-authors)
- [Stores](https://docs.rulvar.com/guide/stores)
- [API reference](https://docs.rulvar.com/api/%40rulvar/store-conformance/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)

## Interfaces

| Interface | Description |
| ------ | ------ |
| [ConformanceCheck](/api/@rulvar/store-conformance/interfaces/ConformanceCheck.md) | One mandatory check; `run` rejects with a descriptive Error on violation. |
| [ConformanceSuite](/api/@rulvar/store-conformance/interfaces/ConformanceSuite.md) | @rulvar/store-conformance: the executable store conformance kit (M2-T11, DEF-4). A store implementation passes journalStoreConformance (and leasableStoreConformance when it has the lease capability, fencedWritesConformance when it declares the fencedWrites promise, and fencedTranscriptsConformance when its transcript store declares the same promise) or it is not a Rulvar store; the kit is the executable definition of the storage seam frozen at 1.0. Stores meant for multi-process queue deployments additionally run the adversarial multi-process soak (runMultiProcessSoak: real OS processes storm one store location through every fenced write surface and the referee diffs the state against the serial history the epochs promise). |
| [FencedTranscriptsFixture](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md) | The paired factory product: the transcript store under test plus the leasable journal store sharing its fencing domain. |
| [MultiProcessSoakOptions](/api/@rulvar/store-conformance/interfaces/MultiProcessSoakOptions.md) | - |
| [MultiProcessSoakResult](/api/@rulvar/store-conformance/interfaces/MultiProcessSoakResult.md) | What a green soak returns (the storm's observed coverage). |
| [SoakActivity](/api/@rulvar/store-conformance/interfaces/SoakActivity.md) | Activity counters derived from the merged report events. |
| [SoakQuorum](/api/@rulvar/store-conformance/interfaces/SoakQuorum.md) | Minimum activity the storm must reach before the referee stops it: run-until-quorum makes the soak adaptive (a slow CI machine storms longer, it never asserts on thin coverage). |
| [SoakWriterConfig](/api/@rulvar/store-conformance/interfaces/SoakWriterConfig.md) | The per-writer contract, serialized as JSON into the `RULVAR_SOAK_CONFIG` environment variable of each spawned writer. |
| [SoakWriterHooks](/api/@rulvar/store-conformance/interfaces/SoakWriterHooks.md) | Consumer hooks for [runSoakWriter](/api/@rulvar/store-conformance/functions/runSoakWriter.md). |
| [TestRegistrar](/api/@rulvar/store-conformance/interfaces/TestRegistrar.md) | Structural subset of the Vitest/Jest registration API. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [SoakAcceptSurface](/api/@rulvar/store-conformance/type-aliases/SoakAcceptSurface.md) | Accepted-mutation surfaces of the soaked run (serial-history members). |
| [SoakEvent](/api/@rulvar/store-conformance/type-aliases/SoakEvent.md) | One JSONL line of a writer's report file (`w` is the writer index). |
| [SoakProbeSurface](/api/@rulvar/store-conformance/type-aliases/SoakProbeSurface.md) | Surfaces of the stale-probe sweep; every one must reject typed. |
| [StoreFactory](/api/@rulvar/store-conformance/type-aliases/StoreFactory.md) | The factory contract: every call MUST return a fresh, isolated store (checks run against independent instances; a JsonlFileStore factory uses a fresh temp directory per call). |

## Variables

| Variable | Description |
| ------ | ------ |
| [DEFAULT\_SOAK\_QUORUM](/api/@rulvar/store-conformance/variables/DEFAULT_SOAK_QUORUM.md) | Default quorum: a few seconds of storm on a developer machine. |
| [GOLDEN\_FOLD\_JOURNAL](/api/@rulvar/store-conformance/variables/GOLDEN_FOLD_JOURNAL.md) | seq 0 agent spawn (running; abandoned by seq 6) seq 1 suspended external gate-a under the spawn's child scope seq 2 suspended external gate-b at the root seq 3 resolution of gate-a: schema-INVALID (never closes) seq 4 resolution of gate-a: applied seq 5 resolution of gate-a: noop (already_resolved) seq 6 abandon of the spawn: applied (covers the agent:0 subtree) seq 7 resolution of gate-b: applied (root scope, not covered) seq 8 abandon of gate-b: noop (already_resolved; first-closing-wins) seq 9 abandon of the spawn again: noop (target_abandoned) |
| [GOLDEN\_FOLD\_STATE\_SHA256](/api/@rulvar/store-conformance/variables/GOLDEN_FOLD_STATE_SHA256.md) | The reference hash; computed once from the kernel fold and frozen. |

## Functions

| Function | Description |
| ------ | ------ |
| [countSoakActivity](/api/@rulvar/store-conformance/functions/countSoakActivity.md) | Derives the activity counters the quorum is judged against. |
| [fencedTranscriptsConformance](/api/@rulvar/store-conformance/functions/fencedTranscriptsConformance.md) | - |
| [fencedWritesConformance](/api/@rulvar/store-conformance/functions/fencedWritesConformance.md) | - |
| [foldStateSha256](/api/@rulvar/store-conformance/functions/foldStateSha256.md) | - |
| [journalStoreConformance](/api/@rulvar/store-conformance/functions/journalStoreConformance.md) | - |
| [leasableStoreConformance](/api/@rulvar/store-conformance/functions/leasableStoreConformance.md) | - |
| [makeSuite](/api/@rulvar/store-conformance/functions/makeSuite.md) | @rulvar/store-conformance: the executable store conformance kit (M2-T11, DEF-4). A store implementation passes journalStoreConformance (and leasableStoreConformance when it has the lease capability, fencedWritesConformance when it declares the fencedWrites promise, and fencedTranscriptsConformance when its transcript store declares the same promise) or it is not a Rulvar store; the kit is the executable definition of the storage seam frozen at 1.0. Stores meant for multi-process queue deployments additionally run the adversarial multi-process soak (runMultiProcessSoak: real OS processes storm one store location through every fenced write surface and the referee diffs the state against the serial history the epochs promise). |
| [materializeFoldState](/api/@rulvar/store-conformance/functions/materializeFoldState.md) | Materializes the observable fold state of a journal: ref-entry classifications (invalid details excluded: validator message wording is not contractual), suspension states, and per-seq abandon coverage. |
| [parseSoakReport](/api/@rulvar/store-conformance/functions/parseSoakReport.md) | Parses one report file, tolerating a torn trailing line. |
| [registerConformance](/api/@rulvar/store-conformance/functions/registerConformance.md) | @rulvar/store-conformance: the executable store conformance kit (M2-T11, DEF-4). A store implementation passes journalStoreConformance (and leasableStoreConformance when it has the lease capability, fencedWritesConformance when it declares the fencedWrites promise, and fencedTranscriptsConformance when its transcript store declares the same promise) or it is not a Rulvar store; the kit is the executable definition of the storage seam frozen at 1.0. Stores meant for multi-process queue deployments additionally run the adversarial multi-process soak (runMultiProcessSoak: real OS processes storm one store location through every fenced write surface and the referee diffs the state against the serial history the epochs promise). |
| [runMultiProcessSoak](/api/@rulvar/store-conformance/functions/runMultiProcessSoak.md) | Spawns the writer processes, stops the storm at quorum (or at the hard cap), verifies the serial history against the store, and throws one Error naming every violation. The returned result is the storm's observed coverage; assert on it if the caller wants a floor beyond the quorum. |
| [runSoakWriter](/api/@rulvar/store-conformance/functions/runSoakWriter.md) | The writer protocol: run it in a spawned process against the consumer-constructed store pair. Appends every observation to the report file; protocol-level anomalies (a stale acceptance, an unexpected error class) are logged as events for the referee, never thrown, so one writer's finding cannot vanish with its process. |
| [soakWriterConfigFromEnv](/api/@rulvar/store-conformance/functions/soakWriterConfigFromEnv.md) | Reads the writer contract a referee serialized into the child env. |
| [stableStringify](/api/@rulvar/store-conformance/functions/stableStringify.md) | @rulvar/store-conformance: the executable store conformance kit (M2-T11, DEF-4). A store implementation passes journalStoreConformance (and leasableStoreConformance when it has the lease capability, fencedWritesConformance when it declares the fencedWrites promise, and fencedTranscriptsConformance when its transcript store declares the same promise) or it is not a Rulvar store; the kit is the executable definition of the storage seam frozen at 1.0. Stores meant for multi-process queue deployments additionally run the adversarial multi-process soak (runMultiProcessSoak: real OS processes storm one store location through every fenced write surface and the referee diffs the state against the serial history the epochs promise). |
| [verifySoakHistory](/api/@rulvar/store-conformance/functions/verifySoakHistory.md) | The pure referee: rebuilds the serial history from the merged report events and diffs it against the actual post-storm store state. Returns every violation as a descriptive string; an empty array means the fencing promise held for the whole storm. |
