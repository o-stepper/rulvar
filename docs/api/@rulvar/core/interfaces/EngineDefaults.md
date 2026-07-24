[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EngineDefaults

# Interface: EngineDefaults

Defined in: [packages/core/src/engine/engine.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L105)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-gates"></a> `gates?` | `Record`\&lt;`string`, [`MechanicalGateProfile`](/api/@rulvar/core/type-aliases/MechanicalGateProfile.md)\&gt; | Registered mechanical gate profiles: named pure functions over AgentResult.artifacts for ladder acceptance gates (M7-T10). | [packages/core/src/engine/engine.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L118) |
| <a id="property-isolation"></a> `isolation?` | [`IsolationProvider`](/api/@rulvar/core/interfaces/IsolationProvider.md) | The worktree lifecycle provider. | [packages/core/src/engine/engine.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L123) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | - | [packages/core/src/engine/engine.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L119) |
| <a id="property-permissions"></a> `permissions?` | [`PermissionConfig`](/api/@rulvar/core/interfaces/PermissionConfig.md) | Engine-wide permission chain layers. | [packages/core/src/engine/engine.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L121) |
| <a id="property-profiles"></a> `profiles?` | `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/core/interfaces/AgentProfile.md)\&gt; | - | [packages/core/src/engine/engine.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L107) |
| <a id="property-retry"></a> `retry?` | [`RetryPolicy`](/api/@rulvar/core/interfaces/RetryPolicy.md) | Engine-wide transport RetryPolicy (M4-T05). | [packages/core/src/engine/engine.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L125) |
| <a id="property-rolefloors"></a> `roleFloors?` | [`QualityFloors`](/api/@rulvar/core/interfaces/QualityFloors.md) | Hard per-role model constraints (M4-T09). | [packages/core/src/engine/engine.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L127) |
| <a id="property-routing"></a> `routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md)\&gt;\&gt; | - | [packages/core/src/engine/engine.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L106) |
| <a id="property-schemas"></a> `schemas?` | `Record`\&lt;`string`, [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt; | Registered SchemaSpec names for outputSchemaRef (M7-T05). | [packages/core/src/engine/engine.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L111) |
| <a id="property-toolsets"></a> `toolsets?` | `Record`\&lt;`string`, [`ToolsOption`](/api/@rulvar/core/type-aliases/ToolsOption.md)\&gt; | Registered tool profile names for toolsetRef (M7-T05). | [packages/core/src/engine/engine.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L113) |
| <a id="property-workflows"></a> `workflows?` | [`WorkflowRegistry`](/api/@rulvar/core/type-aliases/WorkflowRegistry.md) | The workflow registry for shells and by-name resolution (10.4). | [packages/core/src/engine/engine.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L109) |
