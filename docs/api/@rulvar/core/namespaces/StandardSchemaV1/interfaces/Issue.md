[**Rulvar API reference**](../../../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / [StandardSchemaV1](/api/@rulvar/core/namespaces/StandardSchemaV1/index.md) / Issue

# Interface: Issue

Defined in: [packages/core/src/vendor/standard-schema.d.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L74)

The issue interface of the failure output.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-message"></a> `message` | `readonly` | `string` | The error message of the issue. | [packages/core/src/vendor/standard-schema.d.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L76) |
| <a id="property-path"></a> `path?` | `readonly` | readonly ( \| `PropertyKey` \| [`PathSegment`](/api/@rulvar/core/namespaces/StandardSchemaV1/interfaces/PathSegment.md))[] | The path of the issue, if any. | [packages/core/src/vendor/standard-schema.d.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L78) |
