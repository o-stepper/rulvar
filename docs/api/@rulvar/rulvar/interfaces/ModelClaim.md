[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ModelClaim

# Interface: ModelClaim

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-author"></a> `author` | \{ `id`: `string`; `kind`: `"human"` \| `"eval-pipeline"`; \} | - | `packages/core/dist/index.d.ts` |
| `author.id` | `string` | - | `packages/core/dist/index.d.ts` |
| `author.kind` | `"human"` \| `"eval-pipeline"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-class"></a> `class` | [`ClaimClass`](/api/@rulvar/rulvar/type-aliases/ClaimClass.md) | eval-measured is committable only through the eval-committer identity (M11). | `packages/core/dist/index.d.ts` |
| <a id="property-confidence"></a> `confidence` | `"low"` \| `"medium"` \| `"high"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-evidence"></a> `evidence` | [`EvidenceRef`](/api/@rulvar/rulvar/type-aliases/EvidenceRef.md)[] | Mandatory, >=1. | `packages/core/dist/index.d.ts` |
| <a id="property-expiresat"></a> `expiresAt` | `string` | TTL by class and polarity (the grounding and decay rules). | `packages/core/dist/index.d.ts` |
| <a id="property-id"></a> `id` | `string` | ULID. | `packages/core/dist/index.d.ts` |
| <a id="property-metrics"></a> `metrics?` | \{ `baseline?`: \{ `model`: `` `${string}:${string}` ``; `passRate`: `number`; \}; `cost?`: `number`; `graderId`: `string`; `n`: `number`; `passRate`: `number`; \} | Writable ONLY by the eval-committer identity (schema-enforced from M11). | `packages/core/dist/index.d.ts` |
| `metrics.baseline?` | \{ `model`: `` `${string}:${string}` ``; `passRate`: `number`; \} | - | `packages/core/dist/index.d.ts` |
| `metrics.baseline.model` | `` `${string}:${string}` `` | - | `packages/core/dist/index.d.ts` |
| `metrics.baseline.passRate` | `number` | - | `packages/core/dist/index.d.ts` |
| `metrics.cost?` | `number` | - | `packages/core/dist/index.d.ts` |
| `metrics.graderId` | `string` | - | `packages/core/dist/index.d.ts` |
| `metrics.n` | `number` | - | `packages/core/dist/index.d.ts` |
| `metrics.passRate` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-modelepoch"></a> `modelEpoch?` | \{ `canaryFingerprint?`: `string`; `capsHash?`: `string`; `pricingVersion?`: `string`; `registryVersion?`: `string`; \} | Honestly best-effort drift signal. | `packages/core/dist/index.d.ts` |
| `modelEpoch.canaryFingerprint?` | `string` | - | `packages/core/dist/index.d.ts` |
| `modelEpoch.capsHash?` | `string` | - | `packages/core/dist/index.d.ts` |
| `modelEpoch.pricingVersion?` | `string` | - | `packages/core/dist/index.d.ts` |
| `modelEpoch.registryVersion?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-observedat"></a> `observedAt` | `string` | ISO date. | `packages/core/dist/index.d.ts` |
| <a id="property-origin"></a> `origin?` | \{ `entryRef`: `number`; `kind`: `"kb-proposal"`; `runId`: `string`; \} | Orchestrator proposal provenance (phase 3). | `packages/core/dist/index.d.ts` |
| `origin.entryRef` | `number` | - | `packages/core/dist/index.d.ts` |
| `origin.kind` | `"kb-proposal"` | - | `packages/core/dist/index.d.ts` |
| `origin.runId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-polarity"></a> `polarity` | `"strength"` \| `"weakness"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-statement"></a> `statement` | `string` | <=200 chars; proposal-born claims use a typed template, never a quote from tool output. | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status` | [`ClaimStatus`](/api/@rulvar/rulvar/type-aliases/ClaimStatus.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-subject"></a> `subject` | \{ `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `model`: `` `${string}:${string}` ``; \} | effort is part of identity, as in the canonical modelSpec. | `packages/core/dist/index.d.ts` |
| `subject.effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | `packages/core/dist/index.d.ts` |
| `subject.model` | `` `${string}:${string}` `` | - | `packages/core/dist/index.d.ts` |
| <a id="property-supersedes"></a> `supersedes?` | `string` | Append-only: an edit is a new claim plus supersede. | `packages/core/dist/index.d.ts` |
| <a id="property-taskclass"></a> `taskClass` | [`TaskClass`](/api/@rulvar/rulvar/type-aliases/TaskClass.md) | - | `packages/core/dist/index.d.ts` |
