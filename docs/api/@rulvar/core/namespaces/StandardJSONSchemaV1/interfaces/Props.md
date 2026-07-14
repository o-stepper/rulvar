[**Rulvar API reference**](../../../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / [StandardJSONSchemaV1](/api/@rulvar/core/namespaces/StandardJSONSchemaV1/index.md) / Props

# Interface: Props\&lt;Input, Output\&gt;

Defined in: [packages/core/src/vendor/standard-schema.d.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L99)

The Standard JSON Schema properties interface.

## Extends

- `Props`\&lt;`Input`, `Output`\&gt;

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `Input` | `unknown` |
| `Output` | `Input` |

## Properties

| Property | Modifier | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-jsonschema"></a> `jsonSchema` | `readonly` | [`Converter`](/api/@rulvar/core/namespaces/StandardJSONSchemaV1/interfaces/Converter.md) | Methods for generating the input/output JSON Schema. | - | [packages/core/src/vendor/standard-schema.d.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L101) |
| <a id="property-types"></a> `types?` | `readonly` | `Types`\&lt;`Input`, `Output`\&gt; | Inferred types associated with the schema. | `StandardTypedV1.Props.types` | [packages/core/src/vendor/standard-schema.d.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L23) |
| <a id="property-vendor"></a> `vendor` | `readonly` | `string` | The vendor name of the schema library. | [`Props`](/api/@rulvar/core/namespaces/StandardSchemaV1/interfaces/Props.md).[`vendor`](/api/@rulvar/core/namespaces/StandardSchemaV1/interfaces/Props.md#property-vendor) | [packages/core/src/vendor/standard-schema.d.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L21) |
| <a id="property-version"></a> `version` | `readonly` | `1` | The version number of the standard. | [`Props`](/api/@rulvar/core/namespaces/StandardSchemaV1/interfaces/Props.md).[`version`](/api/@rulvar/core/namespaces/StandardSchemaV1/interfaces/Props.md#property-version) | [packages/core/src/vendor/standard-schema.d.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L19) |
