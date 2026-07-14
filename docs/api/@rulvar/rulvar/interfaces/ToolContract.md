[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolContract

# Interface: ToolContract

Defined in: `packages/core/dist/index.d.ts`

The identity-bearing tool contract: exactly what the model sees and
exactly what toolsetHash hashes. Never contains execute or any closure.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-parameters"></a> `parameters` | [`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md) | Canonical JSON Schema projection of the tool's SchemaSpec. | `packages/core/dist/index.d.ts` |
| <a id="property-version"></a> `version?` | `string` | Opaque semantic-change signal; participates as absent when absent. | `packages/core/dist/index.d.ts` |
