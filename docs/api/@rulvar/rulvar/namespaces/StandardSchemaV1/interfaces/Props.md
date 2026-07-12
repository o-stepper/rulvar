[**rulvar API reference**](../../../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / [StandardSchemaV1](/api/@rulvar/rulvar/namespaces/StandardSchemaV1/index.md) / Props

# Interface: Props\&lt;Input, Output\&gt;

Defined in: `packages/core/dist/index.d.ts`

The Standard Schema properties interface.

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
| <a id="property-types"></a> `types?` | `readonly` | `Types`\&lt;`Input`, `Output`\&gt; | Inferred types associated with the schema. | `StandardTypedV1.Props.types` | `packages/core/dist/index.d.ts` |
| <a id="property-validate"></a> `validate` | `readonly` | (`value`, `options?`) => \| [`Result`](/api/@rulvar/rulvar/namespaces/StandardSchemaV1/type-aliases/Result.md)\&lt;`Output`\&gt; \| `Promise`\&lt;[`Result`](/api/@rulvar/rulvar/namespaces/StandardSchemaV1/type-aliases/Result.md)\&lt;`Output`\&gt;\&gt; | Validates unknown input values. | - | `packages/core/dist/index.d.ts` |
| <a id="property-vendor"></a> `vendor` | `readonly` | `string` | The vendor name of the schema library. | `StandardTypedV1.Props.vendor` | `packages/core/dist/index.d.ts` |
| <a id="property-version"></a> `version` | `readonly` | `1` | The version number of the standard. | `StandardTypedV1.Props.version` | `packages/core/dist/index.d.ts` |
