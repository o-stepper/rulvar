[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AgentProfileTemplateOptions

# Interface: AgentProfileTemplateOptions

Defined in: `packages/core/dist/index.d.ts`

Options shared by the implementation and review templates.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description?` | `string` | Advertised profile description; the template provides a default. | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | Per-key overrides over the template's limits. | `packages/core/dist/index.d.ts` |
| <a id="property-tools"></a> `tools?` | [`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;[] | The task tools; the stock report_progress tool is always prepended. | `packages/core/dist/index.d.ts` |
