[**rulvar API reference**](../../../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / [StandardJSONSchemaV1](/api/@rulvar/rulvar/namespaces/StandardJSONSchemaV1/index.md) / Converter

# Interface: Converter

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The Standard JSON Schema converter interface.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-input"></a> `input` | `readonly` | (`options`) => `Record`\&lt;`string`, `unknown`\&gt; | Converts the input type to JSON Schema. May throw if conversion is not supported. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-output"></a> `output` | `readonly` | (`options`) => `Record`\&lt;`string`, `unknown`\&gt; | Converts the output type to JSON Schema. May throw if conversion is not supported. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
