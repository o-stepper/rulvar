[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ModelClaim

# Interface: ModelClaim

Defined in: [packages/core/src/l0/spi/knowledge.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L42)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-author"></a> `author` | \{ `id`: `string`; `kind`: `"eval-pipeline"` \| `"human"`; \} | - | [packages/core/src/l0/spi/knowledge.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L76) |
| `author.id` | `string` | - | [packages/core/src/l0/spi/knowledge.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L76) |
| `author.kind` | `"eval-pipeline"` \| `"human"` | - | [packages/core/src/l0/spi/knowledge.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L76) |
| <a id="property-class"></a> `class` | [`ClaimClass`](/api/@rulvar/core/type-aliases/ClaimClass.md) | eval-measured is committable only through the eval-committer identity (M11). | [packages/core/src/l0/spi/knowledge.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L52) |
| <a id="property-confidence"></a> `confidence` | `"low"` \| `"medium"` \| `"high"` | - | [packages/core/src/l0/spi/knowledge.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L64) |
| <a id="property-evidence"></a> `evidence` | [`EvidenceRef`](/api/@rulvar/core/type-aliases/EvidenceRef.md)[] | Mandatory, >=1. | [packages/core/src/l0/spi/knowledge.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L55) |
| <a id="property-expiresat"></a> `expiresAt` | `string` | TTL by class and polarity (the grounding and decay rules). | [packages/core/src/l0/spi/knowledge.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L68) |
| <a id="property-id"></a> `id` | `string` | ULID. | [packages/core/src/l0/spi/knowledge.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L44) |
| <a id="property-metrics"></a> `metrics?` | \{ `baseline?`: \{ `model`: `` `${string}:${string}` ``; `passRate`: `number`; \}; `cost?`: `number`; `graderId`: `string`; `n`: `number`; `passRate`: `number`; \} | Writable ONLY by the eval-committer identity (schema-enforced from M11). | [packages/core/src/l0/spi/knowledge.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L57) |
| `metrics.baseline?` | \{ `model`: `` `${string}:${string}` ``; `passRate`: `number`; \} | - | [packages/core/src/l0/spi/knowledge.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L62) |
| `metrics.baseline.model` | `` `${string}:${string}` `` | - | [packages/core/src/l0/spi/knowledge.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L62) |
| `metrics.baseline.passRate` | `number` | - | [packages/core/src/l0/spi/knowledge.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L62) |
| `metrics.cost?` | `number` | - | [packages/core/src/l0/spi/knowledge.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L61) |
| `metrics.graderId` | `string` | - | [packages/core/src/l0/spi/knowledge.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L60) |
| `metrics.n` | `number` | - | [packages/core/src/l0/spi/knowledge.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L59) |
| `metrics.passRate` | `number` | - | [packages/core/src/l0/spi/knowledge.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L58) |
| <a id="property-modelepoch"></a> `modelEpoch?` | \{ `canaryFingerprint?`: `string`; `capsHash?`: `string`; `pricingVersion?`: `string`; `registryVersion?`: `string`; \} | Honestly best-effort drift signal. | [packages/core/src/l0/spi/knowledge.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L70) |
| `modelEpoch.canaryFingerprint?` | `string` | - | [packages/core/src/l0/spi/knowledge.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L74) |
| `modelEpoch.capsHash?` | `string` | - | [packages/core/src/l0/spi/knowledge.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L73) |
| `modelEpoch.pricingVersion?` | `string` | - | [packages/core/src/l0/spi/knowledge.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L72) |
| `modelEpoch.registryVersion?` | `string` | - | [packages/core/src/l0/spi/knowledge.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L71) |
| <a id="property-observedat"></a> `observedAt` | `string` | ISO date. | [packages/core/src/l0/spi/knowledge.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L66) |
| <a id="property-origin"></a> `origin?` | \{ `entryRef`: `number`; `kind`: `"kb-proposal"`; `runId`: `string`; \} | Orchestrator proposal provenance (phase 3). | [packages/core/src/l0/spi/knowledge.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L78) |
| `origin.entryRef` | `number` | - | [packages/core/src/l0/spi/knowledge.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L78) |
| `origin.kind` | `"kb-proposal"` | - | [packages/core/src/l0/spi/knowledge.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L78) |
| `origin.runId` | `string` | - | [packages/core/src/l0/spi/knowledge.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L78) |
| <a id="property-polarity"></a> `polarity` | `"strength"` \| `"weakness"` | - | [packages/core/src/l0/spi/knowledge.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L48) |
| <a id="property-statement"></a> `statement` | `string` | <=200 chars; proposal-born claims use a typed template, never a quote from tool output. | [packages/core/src/l0/spi/knowledge.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L50) |
| <a id="property-status"></a> `status` | [`ClaimStatus`](/api/@rulvar/core/type-aliases/ClaimStatus.md) | - | [packages/core/src/l0/spi/knowledge.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L53) |
| <a id="property-subject"></a> `subject` | \{ `effort?`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md); `model`: `` `${string}:${string}` ``; \} | effort is part of identity, as in the canonical modelSpec. | [packages/core/src/l0/spi/knowledge.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L46) |
| `subject.effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | - | [packages/core/src/l0/spi/knowledge.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L46) |
| `subject.model` | `` `${string}:${string}` `` | - | [packages/core/src/l0/spi/knowledge.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L46) |
| <a id="property-supersedes"></a> `supersedes?` | `string` | Append-only: an edit is a new claim plus supersede. | [packages/core/src/l0/spi/knowledge.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L80) |
| <a id="property-taskclass"></a> `taskClass` | [`TaskClass`](/api/@rulvar/core/type-aliases/TaskClass.md) | - | [packages/core/src/l0/spi/knowledge.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L47) |
