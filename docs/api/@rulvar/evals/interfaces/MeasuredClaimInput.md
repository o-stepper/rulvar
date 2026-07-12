[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / MeasuredClaimInput

# Interface: MeasuredClaimInput

Defined in: [packages/evals/src/committer.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L20)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-confidence"></a> `confidence` | `"low"` \| `"medium"` \| `"high"` | - | [packages/evals/src/committer.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L35) |
| <a id="property-evidence"></a> `evidence` | [`EvidenceRef`](/api/@rulvar/rulvar/type-aliases/EvidenceRef.md)[] | - | [packages/evals/src/committer.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L38) |
| <a id="property-id"></a> `id` | `string` | ULID (or any unique id); the caller mints it deterministically. | [packages/evals/src/committer.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L22) |
| <a id="property-metrics"></a> `metrics` | \{ `baseline?`: \{ `model`: `` `${string}:${string}` ``; `passRate`: `number`; \}; `cost?`: `number`; `graderId`: `string`; `n`: `number`; `passRate`: `number`; \} | - | [packages/evals/src/committer.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L28) |
| `metrics.baseline?` | \{ `model`: `` `${string}:${string}` ``; `passRate`: `number`; \} | - | [packages/evals/src/committer.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L33) |
| `metrics.baseline.model` | `` `${string}:${string}` `` | - | [packages/evals/src/committer.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L33) |
| `metrics.baseline.passRate` | `number` | - | [packages/evals/src/committer.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L33) |
| `metrics.cost?` | `number` | - | [packages/evals/src/committer.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L32) |
| `metrics.graderId` | `string` | - | [packages/evals/src/committer.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L31) |
| `metrics.n` | `number` | - | [packages/evals/src/committer.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L30) |
| `metrics.passRate` | `number` | - | [packages/evals/src/committer.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L29) |
| <a id="property-modelepoch"></a> `modelEpoch?` | \{ `canaryFingerprint?`: `string`; `capsHash?`: `string`; `pricingVersion?`: `string`; `registryVersion?`: `string`; \} | - | [packages/evals/src/committer.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L39) |
| `modelEpoch.canaryFingerprint?` | `string` | - | `packages/core/dist/index.d.ts` |
| `modelEpoch.capsHash?` | `string` | - | `packages/core/dist/index.d.ts` |
| `modelEpoch.pricingVersion?` | `string` | - | `packages/core/dist/index.d.ts` |
| `modelEpoch.registryVersion?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-observedat"></a> `observedAt` | `string` | ISO date of the sweep run. | [packages/evals/src/committer.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L37) |
| <a id="property-polarity"></a> `polarity` | `"strength"` \| `"weakness"` | - | [packages/evals/src/committer.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L25) |
| <a id="property-statement"></a> `statement` | `string` | A typed template render, never a quote from tool output. | [packages/evals/src/committer.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L27) |
| <a id="property-subject"></a> `subject` | \{ `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `model`: `` `${string}:${string}` ``; \} | - | [packages/evals/src/committer.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L23) |
| `subject.effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | [packages/evals/src/committer.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L23) |
| `subject.model` | `` `${string}:${string}` `` | - | [packages/evals/src/committer.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L23) |
| <a id="property-taskclass"></a> `taskClass` | [`TaskClass`](/api/@rulvar/rulvar/type-aliases/TaskClass.md) | - | [packages/evals/src/committer.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L24) |
