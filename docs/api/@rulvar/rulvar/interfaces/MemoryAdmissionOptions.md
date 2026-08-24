[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / MemoryAdmissionOptions

# Interface: MemoryAdmissionOptions

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-debtagems"></a> `debtAgeMs?` | `number` | Debt age-out horizon; default the tenant level's window. | `packages/core/dist/index.d.ts` |
| <a id="property-leasettlms"></a> `leaseTtlMs` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-levels"></a> `levels` | \{ `providerAccount?`: [`AdmissionLevelConfig`](/api/@rulvar/rulvar/interfaces/AdmissionLevelConfig.md); `scope?`: [`AdmissionLevelConfig`](/api/@rulvar/rulvar/interfaces/AdmissionLevelConfig.md); `tenant?`: [`AdmissionLevelConfig`](/api/@rulvar/rulvar/interfaces/AdmissionLevelConfig.md); \} | - | `packages/core/dist/index.d.ts` |
| `levels.providerAccount?` | [`AdmissionLevelConfig`](/api/@rulvar/rulvar/interfaces/AdmissionLevelConfig.md) | - | `packages/core/dist/index.d.ts` |
| `levels.scope?` | [`AdmissionLevelConfig`](/api/@rulvar/rulvar/interfaces/AdmissionLevelConfig.md) | - | `packages/core/dist/index.d.ts` |
| `levels.tenant?` | [`AdmissionLevelConfig`](/api/@rulvar/rulvar/interfaces/AdmissionLevelConfig.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-now"></a> `now` | () => `number` | The injectable clock, REQUIRED: the reference owns no wall clock. | `packages/core/dist/index.d.ts` |
| <a id="property-weights"></a> `weights?` | `Record`\&lt;`string`, `number`\&gt; | Fairness weights by resolved tenant; default 1. | `packages/core/dist/index.d.ts` |
