[**Rulvar API reference**](../../../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / [StandardJSONSchemaV1](/api/@rulvar/rulvar/namespaces/StandardJSONSchemaV1/index.md) / Props

# Interface: Props\&lt;Input, Output\&gt;

Defined in: `packages/core/dist/index.d.ts`

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
| <a id="property-jsonschema"></a> `jsonSchema` | `readonly` | [`Converter`](/api/@rulvar/rulvar/namespaces/StandardJSONSchemaV1/interfaces/Converter.md) | Methods for generating the input/output JSON Schema. | - | `packages/core/dist/index.d.ts` |
| <a id="property-types"></a> `types?` | `readonly` | `Types`\&lt;`Input`, `Output`\&gt; | Inferred types associated with the schema. | `StandardTypedV1.Props.types` | `packages/core/dist/index.d.ts` |
| <a id="property-vendor"></a> `vendor` | `readonly` | `string` | The vendor name of the schema library. | [`Props`](/api/@rulvar/rulvar/namespaces/StandardSchemaV1/interfaces/Props.md).[`vendor`](/api/@rulvar/rulvar/namespaces/StandardSchemaV1/interfaces/Props.md#property-vendor) | `packages/core/dist/index.d.ts` |
| <a id="property-version"></a> `version` | `readonly` | `1` | The version number of the standard. | [`Props`](/api/@rulvar/rulvar/namespaces/StandardSchemaV1/interfaces/Props.md).[`version`](/api/@rulvar/rulvar/namespaces/StandardSchemaV1/interfaces/Props.md#property-version) | `packages/core/dist/index.d.ts` |
