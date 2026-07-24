[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AuditRecord

# Interface: AuditRecord

Defined in: `packages/core/dist/index.d.ts`

One reviewable authority event, in journal order.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-at"></a> `at` | `string` | The entry's startedAt timestamp. | `packages/core/dist/index.d.ts` |
| <a id="property-by"></a> `by?` | `string` | Who acted: a ResolutionBy for resolutions, 'engine' for decisions. | `packages/core/dist/index.d.ts` |
| <a id="property-category"></a> `category` | [`AuditCategory`](/api/@rulvar/rulvar/type-aliases/AuditCategory.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-seq"></a> `seq` | `number` | The journal seq of the entry behind this record. | `packages/core/dist/index.d.ts` |
| <a id="property-summary"></a> `summary` | `string` | One deterministic reviewable line. | `packages/core/dist/index.d.ts` |
| <a id="property-target"></a> `target?` | `number` | The seq of the entry this record acts on (resolution/abandon target). | `packages/core/dist/index.d.ts` |
| <a id="property-type"></a> `type?` | `string` | The finer type: the suspension kind ('external' | 'approval') for suspensions, the journaled decisionType for decisions. | `packages/core/dist/index.d.ts` |
| <a id="property-value"></a> `value?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | The journaled payload, verbatim (plaintext through Engine.stores). | `packages/core/dist/index.d.ts` |
