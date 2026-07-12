[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolContract

# Interface: ToolContract

Defined in: [packages/core/src/l0/messages.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L61)

The identity-bearing tool contract: exactly what the model sees and
exactly what toolsetHash hashes. Never contains execute or any closure.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description` | `string` | - | [packages/core/src/l0/messages.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L63) |
| <a id="property-name"></a> `name` | `string` | - | [packages/core/src/l0/messages.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L62) |
| <a id="property-parameters"></a> `parameters` | [`JsonSchema`](/api/@rulvar/core/type-aliases/JsonSchema.md) | Canonical JSON Schema projection of the tool's SchemaSpec. | [packages/core/src/l0/messages.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L65) |
| <a id="property-version"></a> `version?` | `string` | Opaque semantic-change signal; participates as absent when absent. | [packages/core/src/l0/messages.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L67) |
