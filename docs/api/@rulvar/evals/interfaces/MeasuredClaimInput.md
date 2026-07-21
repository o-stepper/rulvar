[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / MeasuredClaimInput

# Interface: MeasuredClaimInput

Defined in: [packages/evals/src/committer.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L34)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-confidence"></a> `confidence` | `"low"` \| `"medium"` \| `"high"` | - | [packages/evals/src/committer.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L49) |
| <a id="property-evidence"></a> `evidence` | [`EvidenceRef`](/api/@rulvar/rulvar/type-aliases/EvidenceRef.md)[] | - | [packages/evals/src/committer.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L52) |
| <a id="property-id"></a> `id` | `string` | ULID (or any unique id); the caller mints it deterministically. | [packages/evals/src/committer.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L36) |
| <a id="property-metrics"></a> `metrics` | \{ `baseline?`: \{ `model`: `` `${string}:${string}` ``; `passRate`: `number`; \}; `cost?`: `number`; `graderId`: `string`; `n`: `number`; `passRate`: `number`; \} | - | [packages/evals/src/committer.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L42) |
| `metrics.baseline?` | \{ `model`: `` `${string}:${string}` ``; `passRate`: `number`; \} | - | [packages/evals/src/committer.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L47) |
| `metrics.baseline.model` | `` `${string}:${string}` `` | - | [packages/evals/src/committer.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L47) |
| `metrics.baseline.passRate` | `number` | - | [packages/evals/src/committer.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L47) |
| `metrics.cost?` | `number` | - | [packages/evals/src/committer.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L46) |
| `metrics.graderId` | `string` | - | [packages/evals/src/committer.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L45) |
| `metrics.n` | `number` | - | [packages/evals/src/committer.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L44) |
| `metrics.passRate` | `number` | - | [packages/evals/src/committer.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L43) |
| <a id="property-modelepoch"></a> `modelEpoch?` | \{ `canaryFingerprint?`: `string`; `capsHash?`: `string`; `pricingVersion?`: `string`; `registryVersion?`: `string`; \} | - | [packages/evals/src/committer.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L53) |
| `modelEpoch.canaryFingerprint?` | `string` | - | `packages/core/dist/index.d.ts` |
| `modelEpoch.capsHash?` | `string` | - | `packages/core/dist/index.d.ts` |
| `modelEpoch.pricingVersion?` | `string` | - | `packages/core/dist/index.d.ts` |
| `modelEpoch.registryVersion?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-observedat"></a> `observedAt` | `string` | ISO date of the sweep run. | [packages/evals/src/committer.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L51) |
| <a id="property-polarity"></a> `polarity` | `"strength"` \| `"weakness"` | - | [packages/evals/src/committer.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L39) |
| <a id="property-statement"></a> `statement` | `string` | A typed template render, never a quote from tool output. | [packages/evals/src/committer.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L41) |
| <a id="property-subject"></a> `subject` | \{ `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `model`: `` `${string}:${string}` ``; \} | - | [packages/evals/src/committer.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L37) |
| `subject.effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | [packages/evals/src/committer.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L37) |
| `subject.model` | `` `${string}:${string}` `` | - | [packages/evals/src/committer.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L37) |
| <a id="property-taskclass"></a> `taskClass` | [`TaskClass`](/api/@rulvar/rulvar/type-aliases/TaskClass.md) | - | [packages/evals/src/committer.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L38) |
