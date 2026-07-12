[**rulvar API reference**](../../../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / [StandardJSONSchemaV1](/api/@rulvar/core/namespaces/StandardJSONSchemaV1/index.md) / Options

# Interface: Options

Defined in: [packages/core/src/vendor/standard-schema.d.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L119)

The options for the input/output methods.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-libraryoptions"></a> `libraryOptions?` | `readonly` | `Record`\&lt;`string`, `unknown`\&gt; | Explicit support for additional vendor-specific parameters, if needed. | [packages/core/src/vendor/standard-schema.d.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L123) |
| <a id="property-target"></a> `target` | `readonly` | [`Target`](/api/@rulvar/core/namespaces/StandardJSONSchemaV1/type-aliases/Target.md) | Specifies the target version of the generated JSON Schema. Support for all versions is on a best-effort basis. If a given version is not supported, the library should throw. | [packages/core/src/vendor/standard-schema.d.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L121) |
