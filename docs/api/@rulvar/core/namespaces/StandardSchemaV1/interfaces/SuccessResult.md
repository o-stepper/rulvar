[**rulvar API reference**](../../../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / [StandardSchemaV1](/api/@rulvar/core/namespaces/StandardSchemaV1/index.md) / SuccessResult

# Interface: SuccessResult\&lt;Output\&gt;

Defined in: [packages/core/src/vendor/standard-schema.d.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L58)

The result interface if validation succeeds.

## Type Parameters

| Type Parameter |
| ------ |
| `Output` |

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-issues"></a> `issues?` | `readonly` | `undefined` | A falsy value for `issues` indicates success. | [packages/core/src/vendor/standard-schema.d.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L62) |
| <a id="property-value"></a> `value` | `readonly` | `Output` | The typed output value. | [packages/core/src/vendor/standard-schema.d.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L60) |
