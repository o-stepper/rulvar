[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentProfileTemplateOptions

# Interface: AgentProfileTemplateOptions

Defined in: [packages/core/src/engine/profile-templates.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L75)

Options shared by the implementation and review templates.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description?` | `string` | Advertised profile description; the template provides a default. | [packages/core/src/engine/profile-templates.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L77) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | Per-key overrides over the template's limits. | [packages/core/src/engine/profile-templates.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L79) |
| <a id="property-tools"></a> `tools?` | [`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;[] | The task tools; the stock report_progress tool is always prepended. | [packages/core/src/engine/profile-templates.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L81) |
