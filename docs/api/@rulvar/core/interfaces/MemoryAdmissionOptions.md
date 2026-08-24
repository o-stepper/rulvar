[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / MemoryAdmissionOptions

# Interface: MemoryAdmissionOptions

Defined in: [packages/core/src/admission/memory.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L61)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-debtagems"></a> `debtAgeMs?` | `number` | Debt age-out horizon; default the tenant level's window. | [packages/core/src/admission/memory.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L73) |
| <a id="property-leasettlms"></a> `leaseTtlMs` | `number` | - | [packages/core/src/admission/memory.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L69) |
| <a id="property-levels"></a> `levels` | \{ `providerAccount?`: [`AdmissionLevelConfig`](/api/@rulvar/core/interfaces/AdmissionLevelConfig.md); `scope?`: [`AdmissionLevelConfig`](/api/@rulvar/core/interfaces/AdmissionLevelConfig.md); `tenant?`: [`AdmissionLevelConfig`](/api/@rulvar/core/interfaces/AdmissionLevelConfig.md); \} | - | [packages/core/src/admission/memory.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L62) |
| `levels.providerAccount?` | [`AdmissionLevelConfig`](/api/@rulvar/core/interfaces/AdmissionLevelConfig.md) | - | [packages/core/src/admission/memory.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L64) |
| `levels.scope?` | [`AdmissionLevelConfig`](/api/@rulvar/core/interfaces/AdmissionLevelConfig.md) | - | [packages/core/src/admission/memory.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L65) |
| `levels.tenant?` | [`AdmissionLevelConfig`](/api/@rulvar/core/interfaces/AdmissionLevelConfig.md) | - | [packages/core/src/admission/memory.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L63) |
| <a id="property-now"></a> `now` | () => `number` | The injectable clock, REQUIRED: the reference owns no wall clock. | [packages/core/src/admission/memory.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L71) |
| <a id="property-weights"></a> `weights?` | `Record`\&lt;`string`, `number`\&gt; | Fairness weights by resolved tenant; default 1. | [packages/core/src/admission/memory.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L68) |
