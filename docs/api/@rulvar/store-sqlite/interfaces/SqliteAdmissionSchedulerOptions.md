[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / SqliteAdmissionSchedulerOptions

# Interface: SqliteAdmissionSchedulerOptions

Defined in: [packages/store-sqlite/src/admission.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L31)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-config"></a> `config` | `Omit`\&lt;[`MemoryAdmissionOptions`](/api/@rulvar/rulvar/interfaces/MemoryAdmissionOptions.md), `"state"` \| `"now"`\&gt; | The admission configuration (levels, weights, lease ttl). | [packages/store-sqlite/src/admission.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L35) |
| <a id="property-now"></a> `now?` | () => `number` | Injectable clock for tests; default the wall clock. | [packages/store-sqlite/src/admission.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L39) |
| <a id="property-path"></a> `path` | `string` | Database file path; ':memory:' is single-process only. | [packages/store-sqlite/src/admission.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L33) |
| <a id="property-schedulerid"></a> `schedulerId?` | `string` | Several schedulers may share one file under distinct ids. | [packages/store-sqlite/src/admission.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L37) |
