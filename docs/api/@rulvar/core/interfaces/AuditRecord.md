[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AuditRecord

# Interface: AuditRecord

Defined in: [packages/core/src/engine/audit.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/audit.ts#L26)

One reviewable authority event, in journal order.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-at"></a> `at` | `string` | The entry's startedAt timestamp. | [packages/core/src/engine/audit.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/audit.ts#L30) |
| <a id="property-by"></a> `by?` | `string` | Who acted: a ResolutionBy for resolutions, 'engine' for decisions. | [packages/core/src/engine/audit.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/audit.ts#L39) |
| <a id="property-category"></a> `category` | [`AuditCategory`](/api/@rulvar/core/type-aliases/AuditCategory.md) | - | [packages/core/src/engine/audit.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/audit.ts#L32) |
| <a id="property-scope"></a> `scope` | `string` | - | [packages/core/src/engine/audit.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/audit.ts#L31) |
| <a id="property-seq"></a> `seq` | `number` | The journal seq of the entry behind this record. | [packages/core/src/engine/audit.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/audit.ts#L28) |
| <a id="property-summary"></a> `summary` | `string` | One deterministic reviewable line. | [packages/core/src/engine/audit.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/audit.ts#L43) |
| <a id="property-target"></a> `target?` | `number` | The seq of the entry this record acts on (resolution/abandon target). | [packages/core/src/engine/audit.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/audit.ts#L41) |
| <a id="property-type"></a> `type?` | `string` | The finer type: the suspension kind ('external' | 'approval') for suspensions, the journaled decisionType for decisions. | [packages/core/src/engine/audit.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/audit.ts#L37) |
| <a id="property-value"></a> `value?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | The journaled payload, verbatim (plaintext through Engine.stores). | [packages/core/src/engine/audit.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/audit.ts#L45) |
