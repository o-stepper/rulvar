[**rulvar API reference**](../../../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / [StandardJSONSchemaV1](/api/@rulvar/core/namespaces/StandardJSONSchemaV1/index.md) / Converter

# Interface: Converter

Defined in: [packages/core/src/vendor/standard-schema.d.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L104)

The Standard JSON Schema converter interface.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-input"></a> `input` | `readonly` | (`options`) => `Record`\&lt;`string`, `unknown`\&gt; | Converts the input type to JSON Schema. May throw if conversion is not supported. | [packages/core/src/vendor/standard-schema.d.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L106) |
| <a id="property-output"></a> `output` | `readonly` | (`options`) => `Record`\&lt;`string`, `unknown`\&gt; | Converts the output type to JSON Schema. May throw if conversion is not supported. | [packages/core/src/vendor/standard-schema.d.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L108) |
