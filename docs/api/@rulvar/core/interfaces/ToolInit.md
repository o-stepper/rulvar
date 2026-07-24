[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolInit

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
| <a id="property-execute"></a> `execute` | (`input`, `ctx`) => `Promise`\&lt;`unknown`\&gt; | - | [packages/core/src/tools/tool.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L36) |
| <a id="property-executor"></a> `executor?` | [`ToolExecutor`](/api/@rulvar/core/type-aliases/ToolExecutor.md) | Default 'inprocess'. | [packages/core/src/tools/tool.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L29) |
| <a id="property-executorspec"></a> `executorSpec?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | Opaque data for a non-inprocess executor (RV-216); never identity. | [packages/core/src/tools/tool.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L31) |
| <a id="property-name"></a> `name` | `string` | - | [packages/core/src/tools/tool.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L23) |
| <a id="property-needsapproval"></a> `needsApproval?` | `boolean` | Default false. | [packages/core/src/tools/tool.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L33) |
| <a id="property-parameters"></a> `parameters` | `S` | - | [packages/core/src/tools/tool.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L25) |
| <a id="property-risk"></a> `risk?` | [`ToolRisk`](/api/@rulvar/core/type-aliases/ToolRisk.md) | Policy metadata; never identity. | [packages/core/src/tools/tool.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L35) |
| <a id="property-version"></a> `version?` | `string` | Contract version, part of toolsetHash. | [packages/core/src/tools/tool.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L27) |
