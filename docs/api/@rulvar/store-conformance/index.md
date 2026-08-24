[**Rulvar API reference**](../../index.md)

***

[Rulvar API reference](/api/index.md) / @rulvar/store-conformance

# @rulvar/store-conformance

The executable conformance kit for Rulvar store adapters: append
atomicity, total per-run order, read-your-writes, payload opacity, lease
fencing, golden fold-state fixtures, the adversarial multi-process soak,
and the engine-level kill-point suite (a child process SIGKILLed around
each durable write, resumed from another process, with the documented
re-pay counts asserted). If you implement a custom store, this suite is
the contract your implementation must pass. Exports
`journalStoreConformance`, `leasableStoreConformance`,
`runMultiProcessSoak`, `killPointConformance`, and
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
| [ConformanceSuite](/api/@rulvar/store-conformance/interfaces/ConformanceSuite.md) | @rulvar/store-conformance: the executable store conformance kit (M2-T11, DEF-4). A store implementation passes journalStoreConformance (and leasableStoreConformance when it has the lease capability, fencedWritesConformance when it declares the fencedWrites promise, and fencedTranscriptsConformance when its transcript store declares the same promise) or it is not a Rulvar store; the kit is the executable definition of the storage seam frozen at 1.0. Stores meant for multi-process queue deployments additionally run the adversarial multi-process soak (runMultiProcessSoak: real OS processes storm one store location through every fenced write surface and the referee diffs the state against the serial history the epochs promise) and the engine-level kill-point suite (killPointConformance: a child process SIGKILLs itself around each durable write of a scripted run, and the referee resumes over the same store asserting the documented recovery semantics, re-pay counts included). |
| [FencedTranscriptsFixture](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md) | The paired factory product: the transcript store under test plus the leasable journal store sharing its fencing domain. |
| [KillPointConformanceOptions](/api/@rulvar/store-conformance/interfaces/KillPointConformanceOptions.md) | - |
| [KillPointExpectation](/api/@rulvar/store-conformance/interfaces/KillPointExpectation.md) | The pinned recovery semantics a scenario asserts. |
| [KillPointObservation](/api/@rulvar/store-conformance/interfaces/KillPointObservation.md) | What a green scenario returns (the observed recovery). |
| [KillPointScenario](/api/@rulvar/store-conformance/interfaces/KillPointScenario.md) | - |
| [KillPointScenarioOptions](/api/@rulvar/store-conformance/interfaces/KillPointScenarioOptions.md) | - |
| [KillPointTarget](/api/@rulvar/store-conformance/interfaces/KillPointTarget.md) | Per-scenario isolation a consumer's `prepare` hands the suite. |
| [KillPointWorkerConfig](/api/@rulvar/store-conformance/interfaces/KillPointWorkerConfig.md) | The per-scenario contract, serialized as JSON into the `RULVAR_KILL_POINT_CONFIG` environment variable of the spawned worker. |
| [KillPointWorkerHooks](/api/@rulvar/store-conformance/interfaces/KillPointWorkerHooks.md) | Consumer hooks for [runKillPointWorker](/api/@rulvar/store-conformance/functions/runKillPointWorker.md). |
| [MultiProcessSoakOptions](/api/@rulvar/store-conformance/interfaces/MultiProcessSoakOptions.md) | - |
| [MultiProcessSoakResult](/api/@rulvar/store-conformance/interfaces/MultiProcessSoakResult.md) | What a green soak returns (the storm's observed coverage). |
| [RestorableEffectLaneStore](/api/@rulvar/store-conformance/interfaces/RestorableEffectLaneStore.md) | The store shape under test: the capability plus the restore verb. |
| [SoakActivity](/api/@rulvar/store-conformance/interfaces/SoakActivity.md) | Activity counters derived from the merged report events. |
| [SoakQuorum](/api/@rulvar/store-conformance/interfaces/SoakQuorum.md) | Minimum activity the storm must reach before the referee stops it: run-until-quorum makes the soak adaptive (a slow CI machine storms longer, it never asserts on thin coverage). |
| [SoakWriterConfig](/api/@rulvar/store-conformance/interfaces/SoakWriterConfig.md) | The per-writer contract, serialized as JSON into the `RULVAR_SOAK_CONFIG` environment variable of each spawned writer. |
| [SoakWriterHooks](/api/@rulvar/store-conformance/interfaces/SoakWriterHooks.md) | Consumer hooks for [runSoakWriter](/api/@rulvar/store-conformance/functions/runSoakWriter.md). |
| [TestRegistrar](/api/@rulvar/store-conformance/interfaces/TestRegistrar.md) | Structural subset of the Vitest/Jest registration API. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [KillPointEvent](/api/@rulvar/store-conformance/type-aliases/KillPointEvent.md) | One JSONL line of a worker's report file. |
| [KillPointName](/api/@rulvar/store-conformance/type-aliases/KillPointName.md) | The five durable writes a scenario kills around. |
| [KillPointPhase](/api/@rulvar/store-conformance/type-aliases/KillPointPhase.md) | `before` = the write is lost; `after` = everything past it is lost. |
| [KillPointWorkflowKind](/api/@rulvar/store-conformance/type-aliases/KillPointWorkflowKind.md) | The two scripted runs: two plain steps, or one tool-capped agent. |
| [QuotaLimiterConstructor](/api/@rulvar/store-conformance/type-aliases/QuotaLimiterConstructor.md) | Constructs a limiter over the given rules; the suite closes whatever it returns (a `close` method is called and awaited when present), so factories may open real resources for the negative control. |
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
| [KILL\_POINT\_SCENARIOS](/api/@rulvar/store-conformance/variables/KILL_POINT_SCENARIOS.md) | The full table: both brackets of all five write points. The expected counts ARE the engine's documented recovery semantics; a count moving here means the durability contract moved and the change must be deliberate. |

## Functions

| Function | Description |
| ------ | ------ |
| [countSoakActivity](/api/@rulvar/store-conformance/functions/countSoakActivity.md) | Derives the activity counters the quorum is judged against. |
| [effectLaneStoreConformance](/api/@rulvar/store-conformance/functions/effectLaneStoreConformance.md) | - |
| [ensure](/api/@rulvar/store-conformance/functions/ensure.md) | @rulvar/store-conformance: the executable store conformance kit (M2-T11, DEF-4). A store implementation passes journalStoreConformance (and leasableStoreConformance when it has the lease capability, fencedWritesConformance when it declares the fencedWrites promise, and fencedTranscriptsConformance when its transcript store declares the same promise) or it is not a Rulvar store; the kit is the executable definition of the storage seam frozen at 1.0. Stores meant for multi-process queue deployments additionally run the adversarial multi-process soak (runMultiProcessSoak: real OS processes storm one store location through every fenced write surface and the referee diffs the state against the serial history the epochs promise) and the engine-level kill-point suite (killPointConformance: a child process SIGKILLs itself around each durable write of a scripted run, and the referee resumes over the same store asserting the documented recovery semantics, re-pay counts included). |
| [fencedTranscriptsConformance](/api/@rulvar/store-conformance/functions/fencedTranscriptsConformance.md) | - |
| [fencedWritesConformance](/api/@rulvar/store-conformance/functions/fencedWritesConformance.md) | - |
| [foldStateSha256](/api/@rulvar/store-conformance/functions/foldStateSha256.md) | - |
| [journalStoreConformance](/api/@rulvar/store-conformance/functions/journalStoreConformance.md) | - |
| [killPointConformance](/api/@rulvar/store-conformance/functions/killPointConformance.md) | The whole [KILL\_POINT\_SCENARIOS](/api/@rulvar/store-conformance/variables/KILL_POINT_SCENARIOS.md) table as a conformance suite: one check per scenario, each over the fresh isolation `prepare` returns. Register it with a test API whose `it` allows at least thirty seconds per case (spawn, run, die, lease lapse, resume). |
| [killPointWorkerConfigFromEnv](/api/@rulvar/store-conformance/functions/killPointWorkerConfigFromEnv.md) | Reads the worker contract a referee serialized into the child env. |
| [leasableStoreConformance](/api/@rulvar/store-conformance/functions/leasableStoreConformance.md) | - |
| [makeSuite](/api/@rulvar/store-conformance/functions/makeSuite.md) | @rulvar/store-conformance: the executable store conformance kit (M2-T11, DEF-4). A store implementation passes journalStoreConformance (and leasableStoreConformance when it has the lease capability, fencedWritesConformance when it declares the fencedWrites promise, and fencedTranscriptsConformance when its transcript store declares the same promise) or it is not a Rulvar store; the kit is the executable definition of the storage seam frozen at 1.0. Stores meant for multi-process queue deployments additionally run the adversarial multi-process soak (runMultiProcessSoak: real OS processes storm one store location through every fenced write surface and the referee diffs the state against the serial history the epochs promise) and the engine-level kill-point suite (killPointConformance: a child process SIGKILLs itself around each durable write of a scripted run, and the referee resumes over the same store asserting the documented recovery semantics, re-pay counts included). |
| [materializeFoldState](/api/@rulvar/store-conformance/functions/materializeFoldState.md) | Materializes the observable fold state of a journal: ref-entry classifications (invalid details excluded: validator message wording is not contractual), suspension states, and per-seq abandon coverage. |
| [parseKillPointReport](/api/@rulvar/store-conformance/functions/parseKillPointReport.md) | Parses one report file, tolerating a torn trailing line. |
| [parseSoakReport](/api/@rulvar/store-conformance/functions/parseSoakReport.md) | Parses one report file, tolerating a torn trailing line. |
| [quotaRulesConformance](/api/@rulvar/store-conformance/functions/quotaRulesConformance.md) | - |
| [registerConformance](/api/@rulvar/store-conformance/functions/registerConformance.md) | @rulvar/store-conformance: the executable store conformance kit (M2-T11, DEF-4). A store implementation passes journalStoreConformance (and leasableStoreConformance when it has the lease capability, fencedWritesConformance when it declares the fencedWrites promise, and fencedTranscriptsConformance when its transcript store declares the same promise) or it is not a Rulvar store; the kit is the executable definition of the storage seam frozen at 1.0. Stores meant for multi-process queue deployments additionally run the adversarial multi-process soak (runMultiProcessSoak: real OS processes storm one store location through every fenced write surface and the referee diffs the state against the serial history the epochs promise) and the engine-level kill-point suite (killPointConformance: a child process SIGKILLs itself around each durable write of a scripted run, and the referee resumes over the same store asserting the documented recovery semantics, re-pay counts included). |
| [runKillPointScenario](/api/@rulvar/store-conformance/functions/runKillPointScenario.md) | Spawns the worker, asserts it died AT the configured write by SIGKILL, waits out the dead owner's lease, resumes the run over the referee's own store instance, and asserts the scenario's pinned recovery semantics. Throws one Error naming every violation. |
| [runKillPointWorker](/api/@rulvar/store-conformance/functions/runKillPointWorker.md) | The worker protocol: run it in a spawned process against the consumer-constructed store pair. Wraps the journal so the configured write kills the process (`before` = ahead of the write, `after` = once it is durable), appends every observation to the report file first (the appends are synchronous, so the report survives the SIGKILL), and reports `ran-to-completion` when the kill point is never reached, which the referee treats as a violation. |
| [runMultiProcessSoak](/api/@rulvar/store-conformance/functions/runMultiProcessSoak.md) | Spawns the writer processes, stops the storm at quorum (or at the hard cap), verifies the serial history against the store, and throws one Error naming every violation. The returned result is the storm's observed coverage; assert on it if the caller wants a floor beyond the quorum. |
| [runSoakWriter](/api/@rulvar/store-conformance/functions/runSoakWriter.md) | The writer protocol: run it in a spawned process against the consumer-constructed store pair. Appends every observation to the report file; protocol-level anomalies (a stale acceptance, an unexpected error class) are logged as events for the referee, never thrown, so one writer's finding cannot vanish with its process. |
| [soakWriterConfigFromEnv](/api/@rulvar/store-conformance/functions/soakWriterConfigFromEnv.md) | Reads the writer contract a referee serialized into the child env. |
| [stableStringify](/api/@rulvar/store-conformance/functions/stableStringify.md) | @rulvar/store-conformance: the executable store conformance kit (M2-T11, DEF-4). A store implementation passes journalStoreConformance (and leasableStoreConformance when it has the lease capability, fencedWritesConformance when it declares the fencedWrites promise, and fencedTranscriptsConformance when its transcript store declares the same promise) or it is not a Rulvar store; the kit is the executable definition of the storage seam frozen at 1.0. Stores meant for multi-process queue deployments additionally run the adversarial multi-process soak (runMultiProcessSoak: real OS processes storm one store location through every fenced write surface and the referee diffs the state against the serial history the epochs promise) and the engine-level kill-point suite (killPointConformance: a child process SIGKILLs itself around each durable write of a scripted run, and the referee resumes over the same store asserting the documented recovery semantics, re-pay counts included). |
| [verifySoakHistory](/api/@rulvar/store-conformance/functions/verifySoakHistory.md) | The pure referee: rebuilds the serial history from the merged report events and diffs it against the actual post-storm store state. Returns every violation as a descriptive string; an empty array means the fencing promise held for the whole storm. |
