[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolInit

# Interface: ToolInit\&lt;S\&gt;

Defined in: [packages/core/src/tools/tool.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L22)

## Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md) |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description` | `string` | - | [packages/core/src/tools/tool.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L24) |
| <a id="property-execute"></a> `execute` | (`input`, `ctx`) => `Promise`\&lt;`unknown`\&gt; | - | [packages/core/src/tools/tool.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L34) |
| <a id="property-executor"></a> `executor?` | [`ToolExecutor`](/api/@rulvar/core/type-aliases/ToolExecutor.md) | Default 'inprocess' (docs/08, section "Executors"). | [packages/core/src/tools/tool.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L29) |
| <a id="property-name"></a> `name` | `string` | - | [packages/core/src/tools/tool.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L23) |
| <a id="property-needsapproval"></a> `needsApproval?` | `boolean` | Default false (docs/08, section "Terminal default"). | [packages/core/src/tools/tool.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L31) |
| <a id="property-parameters"></a> `parameters` | `S` | - | [packages/core/src/tools/tool.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L25) |
| <a id="property-risk"></a> `risk?` | [`ToolRisk`](/api/@rulvar/core/type-aliases/ToolRisk.md) | Policy metadata; never identity (docs/08, section "ToolRisk"). | [packages/core/src/tools/tool.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L33) |
| <a id="property-version"></a> `version?` | `string` | Contract version, part of toolsetHash (docs/08, section 1.2). | [packages/core/src/tools/tool.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L27) |
