[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SinglePhaseAppend

# Interface: SinglePhaseAppend

Defined in: `packages/core/dist/index.d.ts`

Fields common to every append through the kernel.

## Extends

- [`BaseAppend`](/api/@rulvar/rulvar/interfaces/BaseAppend.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-key"></a> `key` | `string` | - | [`BaseAppend`](/api/@rulvar/rulvar/interfaces/BaseAppend.md).[`key`](/api/@rulvar/rulvar/interfaces/BaseAppend.md#property-key) | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | [`EntryKind`](/api/@rulvar/rulvar/type-aliases/EntryKind.md) | - | [`BaseAppend`](/api/@rulvar/rulvar/interfaces/BaseAppend.md).[`kind`](/api/@rulvar/rulvar/interfaces/BaseAppend.md#property-kind) | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope` | `string` | - | [`BaseAppend`](/api/@rulvar/rulvar/interfaces/BaseAppend.md).[`scope`](/api/@rulvar/rulvar/interfaces/BaseAppend.md#property-scope) | `packages/core/dist/index.d.ts` |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-site"></a> `site?` | `string` | Call-site label used in NonSerializableValueError messages. | [`BaseAppend`](/api/@rulvar/rulvar/interfaces/BaseAppend.md).[`site`](/api/@rulvar/rulvar/interfaces/BaseAppend.md#property-site) | `packages/core/dist/index.d.ts` |
| <a id="property-spanid"></a> `spanId` | `string` | - | [`BaseAppend`](/api/@rulvar/rulvar/interfaces/BaseAppend.md).[`spanId`](/api/@rulvar/rulvar/interfaces/BaseAppend.md#property-spanid) | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status` | `"ok"` | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-usage"></a> `usage?` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-value"></a> `value?` | `unknown` | - | - | `packages/core/dist/index.d.ts` |
