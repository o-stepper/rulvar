[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / BenchmarkVerification

# Interface: BenchmarkVerification

Defined in: [packages/evals/src/benchmark.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L117)

The replay-strict verification verdict of one run.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-determinismwarnings"></a> `determinismWarnings` | `number` | Workflow-provenance determinism warnings across live and replay. | [packages/evals/src/benchmark.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L136) |
| <a id="property-outputhash"></a> `outputHash?` | `string` | The journaled output digest, when the settle recorded one. | [packages/evals/src/benchmark.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L125) |
| <a id="property-outputreproduced"></a> `outputReproduced` | `boolean` | Digest equality where comparable. A run that settled ok with a value but no journaled digest (a non-JCS-serializable result) fails this clause explicitly: a benchmark demands comparable outputs. A run with no output value passes it vacuously. | [packages/evals/src/benchmark.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L134) |
| <a id="property-purereplay"></a> `pureReplay` | `boolean` | The dry-run resume had zero misses and zero reruns. | [packages/evals/src/benchmark.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L121) |
| <a id="property-reasons"></a> `reasons` | `string`[] | Machine-readable failure reasons; empty when verified. | [packages/evals/src/benchmark.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L138) |
| <a id="property-replayedoutputhash"></a> `replayedOutputHash?` | `string` | The digest of the replayed result, when hashable. | [packages/evals/src/benchmark.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L127) |
| <a id="property-statusreproduced"></a> `statusReproduced` | `boolean` | The replayed settle status equals the journaled one. | [packages/evals/src/benchmark.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L123) |
| <a id="property-verified"></a> `verified` | `boolean` | Every clause below held. | [packages/evals/src/benchmark.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L119) |
