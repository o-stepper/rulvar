[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / MemoryAdmissionOptions

# Interface: MemoryAdmissionOptions

Defined in: [packages/core/src/admission/memory.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L75)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-debtagems"></a> `debtAgeMs?` | `number` | Debt age-out horizon; default the tenant level's window. | [packages/core/src/admission/memory.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L87) |
| <a id="property-leasettlms"></a> `leaseTtlMs` | `number` | - | [packages/core/src/admission/memory.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L83) |
| <a id="property-levels"></a> `levels` | \{ `providerAccount?`: [`AdmissionLevelConfig`](/api/@rulvar/core/interfaces/AdmissionLevelConfig.md); `scope?`: [`AdmissionLevelConfig`](/api/@rulvar/core/interfaces/AdmissionLevelConfig.md); `tenant?`: [`AdmissionLevelConfig`](/api/@rulvar/core/interfaces/AdmissionLevelConfig.md); \} | - | [packages/core/src/admission/memory.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L76) |
| `levels.providerAccount?` | [`AdmissionLevelConfig`](/api/@rulvar/core/interfaces/AdmissionLevelConfig.md) | - | [packages/core/src/admission/memory.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L78) |
| `levels.scope?` | [`AdmissionLevelConfig`](/api/@rulvar/core/interfaces/AdmissionLevelConfig.md) | - | [packages/core/src/admission/memory.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L79) |
| `levels.tenant?` | [`AdmissionLevelConfig`](/api/@rulvar/core/interfaces/AdmissionLevelConfig.md) | - | [packages/core/src/admission/memory.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L77) |
| <a id="property-now"></a> `now` | () => `number` | The injectable clock, REQUIRED: the reference owns no wall clock. | [packages/core/src/admission/memory.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L85) |
| <a id="property-state"></a> `state?` | [`AdmissionState`](/api/@rulvar/core/interfaces/AdmissionState.md) | Hydrate from a persisted document (the durable wrappers). | [packages/core/src/admission/memory.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L89) |
| <a id="property-weights"></a> `weights?` | `Record`\&lt;`string`, `number`\&gt; | Fairness weights by resolved tenant; default 1. | [packages/core/src/admission/memory.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L82) |
