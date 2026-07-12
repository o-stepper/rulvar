[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EngineDefaults

# Interface: EngineDefaults

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-gates"></a> `gates?` | `Record`\&lt;`string`, [`MechanicalGateProfile`](/api/@rulvar/rulvar/type-aliases/MechanicalGateProfile.md)\&gt; | Registered mechanical gate profiles: named pure functions over AgentResult.artifacts for ladder acceptance gates (docs/02, section "Registries"; docs/07, section 10; M7-T10). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-isolation"></a> `isolation?` | [`IsolationProvider`](/api/@rulvar/rulvar/interfaces/IsolationProvider.md) | The worktree lifecycle provider (docs/08, section 8). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-permissions"></a> `permissions?` | [`PermissionConfig`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md) | Engine-wide permission chain layers (docs/08, section 3). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-profiles"></a> `profiles?` | `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md)\&gt; | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-retry"></a> `retry?` | [`RetryPolicy`](/api/@rulvar/rulvar/interfaces/RetryPolicy.md) | Engine-wide transport RetryPolicy (docs/04, 11.1; M4-T05). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-rolefloors"></a> `roleFloors?` | [`QualityFloors`](/api/@rulvar/rulvar/interfaces/QualityFloors.md) | Hard per-role model constraints (docs/04, section 9; M4-T09). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-routing"></a> `routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md)\&gt;\&gt; | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-schemas"></a> `schemas?` | `Record`\&lt;`string`, [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt; | Registered SchemaSpec names for outputSchemaRef (docs/08; M7-T05). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-toolsets"></a> `toolsets?` | `Record`\&lt;`string`, [`ToolsOption`](/api/@rulvar/rulvar/type-aliases/ToolsOption.md)\&gt; | Registered tool profile names for toolsetRef (docs/08; M7-T05). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-workflows"></a> `workflows?` | [`WorkflowRegistry`](/api/@rulvar/rulvar/type-aliases/WorkflowRegistry.md) | The workflow registry for shells and by-name resolution (10.4). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
