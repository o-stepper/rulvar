[**rulvar API reference**](../../../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / [StandardJSONSchemaV1](/api/@rulvar/rulvar/namespaces/StandardJSONSchemaV1/index.md) / Options

# Interface: Options

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The options for the input/output methods.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-libraryoptions"></a> `libraryOptions?` | `readonly` | `Record`\&lt;`string`, `unknown`\&gt; | Explicit support for additional vendor-specific parameters, if needed. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-target"></a> `target` | `readonly` | [`Target`](/api/@rulvar/rulvar/namespaces/StandardJSONSchemaV1/type-aliases/Target.md) | Specifies the target version of the generated JSON Schema. Support for all versions is on a best-effort basis. If a given version is not supported, the library should throw. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
