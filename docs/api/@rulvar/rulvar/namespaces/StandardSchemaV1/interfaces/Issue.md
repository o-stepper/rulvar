[**rulvar API reference**](../../../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / [StandardSchemaV1](/api/@rulvar/rulvar/namespaces/StandardSchemaV1/index.md) / Issue

# Interface: Issue

Defined in: `packages/core/dist/index.d.ts`

The issue interface of the failure output.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-message"></a> `message` | `readonly` | `string` | The error message of the issue. | `packages/core/dist/index.d.ts` |
| <a id="property-path"></a> `path?` | `readonly` | readonly ( \| `PropertyKey` \| [`PathSegment`](/api/@rulvar/rulvar/namespaces/StandardSchemaV1/interfaces/PathSegment.md))[] | The path of the issue, if any. | `packages/core/dist/index.d.ts` |
