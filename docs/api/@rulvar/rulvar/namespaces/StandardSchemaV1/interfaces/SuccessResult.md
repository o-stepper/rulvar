[**Rulvar API reference**](../../../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / [StandardSchemaV1](/api/@rulvar/rulvar/namespaces/StandardSchemaV1/index.md) / SuccessResult

# Interface: SuccessResult\&lt;Output\&gt;

Defined in: `packages/core/dist/index.d.ts`

The result interface if validation succeeds.

## Type Parameters

| Type Parameter |
| ------ |
| `Output` |

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-issues"></a> `issues?` | `readonly` | `undefined` | A falsy value for `issues` indicates success. | `packages/core/dist/index.d.ts` |
| <a id="property-value"></a> `value` | `readonly` | `Output` | The typed output value. | `packages/core/dist/index.d.ts` |
