[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentProfile

# Interface: AgentProfile

Defined in: [packages/core/src/engine/ctx.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L117)

The canonical, complete AgentProfile shape; M1 honors description,
model, routing, effort, limits, and estCost. A profile never carries
a prompt or a schema.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-compaction"></a> `compaction?` | \{ `threshold?`: `number`; \} | Per-profile compaction threshold; default 0.8 of the loop model's contextWindow (M4-T03). Compaction is ON by default; history-processor plumbing stays engine-internal. | [packages/core/src/engine/ctx.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L140) |
| `compaction.threshold?` | `number` | - | [packages/core/src/engine/ctx.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L140) |
| <a id="property-description"></a> `description?` | `string` | - | [packages/core/src/engine/ctx.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L118) |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | - | [packages/core/src/engine/ctx.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L121) |
| <a id="property-escalation"></a> `escalation?` | [`EscalationOptions`](/api/@rulvar/core/interfaces/EscalationOptions.md) | Flavor B opt-in lives here or on the call. | [packages/core/src/engine/ctx.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L129) |
| <a id="property-estcost"></a> `estCost?` | `number` | Admission reserve hint in USD (budget layer 1). | [packages/core/src/engine/ctx.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L142) |
| <a id="property-isolation"></a> `isolation?` | [`IsolationSpec`](/api/@rulvar/core/type-aliases/IsolationSpec.md) | Isolation default; the RESOLVED value enters identity. | [packages/core/src/engine/ctx.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L127) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | - | [packages/core/src/engine/ctx.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L130) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | - | [packages/core/src/engine/ctx.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L119) |
| <a id="property-permissions"></a> `permissions?` | [`AgentProfilePermissions`](/api/@rulvar/core/interfaces/AgentProfilePermissions.md) | Chain layers merged over engine defaults. | [packages/core/src/engine/ctx.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L125) |
| <a id="property-retry"></a> `retry?` | [`RetryPolicy`](/api/@rulvar/core/interfaces/RetryPolicy.md) | Transport RetryPolicy layer: call over profile over engine (M4-T05). | [packages/core/src/engine/ctx.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L132) |
| <a id="property-routing"></a> `routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md)\&gt;\&gt; | - | [packages/core/src/engine/ctx.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L120) |
| <a id="property-taskclass"></a> `taskClass?` | `string` | Declared task class bridging ModelKnowledge; default unclassified (M4-T09). | [packages/core/src/engine/ctx.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L134) |
| <a id="property-tools"></a> `tools?` | [`ToolsOption`](/api/@rulvar/core/type-aliases/ToolsOption.md) | Toolset default; the resolved snapshot enters identity via toolsetHash. | [packages/core/src/engine/ctx.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L123) |
