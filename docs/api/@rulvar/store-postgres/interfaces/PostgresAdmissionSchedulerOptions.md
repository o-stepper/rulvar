[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / PostgresAdmissionSchedulerOptions

# Interface: PostgresAdmissionSchedulerOptions

Defined in: [packages/store-postgres/src/admission.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L28)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-config"></a> `config` | `Omit`\&lt;[`MemoryAdmissionOptions`](/api/@rulvar/rulvar/interfaces/MemoryAdmissionOptions.md), `"state"` \| `"now"`\&gt; | [packages/store-postgres/src/admission.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L32) |
| <a id="property-max"></a> `max?` | `number` | [packages/store-postgres/src/admission.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L35) |
| <a id="property-now"></a> `now?` | () => `number` | [packages/store-postgres/src/admission.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L34) |
| <a id="property-pool"></a> `pool?` | `Pool` | [packages/store-postgres/src/admission.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L30) |
| <a id="property-schedulerid"></a> `schedulerId?` | `string` | [packages/store-postgres/src/admission.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L33) |
| <a id="property-schema"></a> `schema?` | `string` | [packages/store-postgres/src/admission.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L31) |
| <a id="property-url"></a> `url?` | `string` | [packages/store-postgres/src/admission.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L29) |
