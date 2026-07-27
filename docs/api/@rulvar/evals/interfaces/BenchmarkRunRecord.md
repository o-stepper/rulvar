[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / BenchmarkRunRecord

# Interface: BenchmarkRunRecord

Defined in: [packages/evals/src/benchmark.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L142)

The full record of one benchmark run, scored or not.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agentdispatches"></a> `agentDispatches` | `number` | agent:end events on the live stream (logical dispatches). | [packages/evals/src/benchmark.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L159) |
| <a id="property-costusd"></a> `costUsd` | `number` | The target run's cost (judge runs are separate). | [packages/evals/src/benchmark.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L154) |
| <a id="property-error"></a> `error?` | [`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md) | - | [packages/evals/src/benchmark.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L166) |
| <a id="property-invocations"></a> `invocations` | `number` | agent:phase:end events on the live stream (model activations). | [packages/evals/src/benchmark.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L161) |
| <a id="property-judgecostusd"></a> `judgeCostUsd` | `number` | The judge-run share this run's grading spent. | [packages/evals/src/benchmark.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L156) |
| <a id="property-metrics"></a> `metrics` | `Record`\&lt;`string`, `number`\&gt; | Extractor values for this run. | [packages/evals/src/benchmark.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L165) |
| <a id="property-ordinal"></a> `ordinal` | `number` | 1-based ordinal in execution order. | [packages/evals/src/benchmark.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L144) |
| <a id="property-rejectedreasons"></a> `rejectedReasons` | `string`[] | Why the run was excluded; empty when scored. | [packages/evals/src/benchmark.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L150) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/evals/src/benchmark.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L145) |
| <a id="property-scored"></a> `scored` | `boolean` | Counted into the percentile series. | [packages/evals/src/benchmark.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L148) |
| <a id="property-status"></a> `status` | `"ok"` \| `"error"` \| `"cancelled"` \| `"exhausted"` \| `"suspended"` | - | [packages/evals/src/benchmark.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L146) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | - | [packages/evals/src/benchmark.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L157) |
| <a id="property-verdicts"></a> `verdicts` | [`GraderVerdict`](/api/@rulvar/evals/interfaces/GraderVerdict.md)[] | - | [packages/evals/src/benchmark.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L162) |
| <a id="property-verification"></a> `verification` | [`BenchmarkVerification`](/api/@rulvar/evals/interfaces/BenchmarkVerification.md) | - | [packages/evals/src/benchmark.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L163) |
| <a id="property-wallms"></a> `wallMs` | `number` | run:start to run:end, from event timestamps. | [packages/evals/src/benchmark.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L152) |
