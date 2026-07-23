[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / BenchmarkFingerprint

# Interface: BenchmarkFingerprint

Defined in: [packages/evals/src/benchmark.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L169)

Where the numbers came from; percentiles without this are hearsay.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-arch"></a> `arch` | `string` | - | [packages/evals/src/benchmark.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L172) |
| <a id="property-labels"></a> `labels?` | `Record`\&lt;`string`, `string`\&gt; | - | [packages/evals/src/benchmark.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L177) |
| <a id="property-node"></a> `node` | `string` | - | [packages/evals/src/benchmark.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L170) |
| <a id="property-packages"></a> `packages` | `Record`\&lt;`string`, `string`\&gt; | Resolved versions of the rulvar packages doing the measuring. | [packages/evals/src/benchmark.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L174) |
| <a id="property-platform"></a> `platform` | `string` | - | [packages/evals/src/benchmark.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L171) |
| <a id="property-startedat"></a> `startedAt?` | `string` | The first run's run:start timestamp (event time, no clock read). | [packages/evals/src/benchmark.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L176) |
