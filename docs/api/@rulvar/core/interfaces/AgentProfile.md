[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentProfile

# Interface: AgentProfile

Defined in: [packages/core/src/engine/ctx.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L148)

The canonical, complete AgentProfile shape; M1 honors description,
model, routing, effort, limits, and estCost. A profile never carries
a prompt or a schema.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-compaction"></a> `compaction?` | \{ `threshold?`: `number`; \} | Per-profile compaction threshold; default 0.8 of the loop model's contextWindow (M4-T03). Compaction is ON by default; history-processor plumbing stays engine-internal. The threshold is a fraction in (0, 1], validated at createEngine. | [packages/core/src/engine/ctx.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L172) |
| `compaction.threshold?` | `number` | - | [packages/core/src/engine/ctx.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L172) |
| <a id="property-description"></a> `description?` | `string` | - | [packages/core/src/engine/ctx.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L149) |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | - | [packages/core/src/engine/ctx.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L152) |
| <a id="property-escalation"></a> `escalation?` | [`EscalationOptions`](/api/@rulvar/core/interfaces/EscalationOptions.md) | Flavor B opt-in lives here or on the call. | [packages/core/src/engine/ctx.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L160) |
| <a id="property-estcost"></a> `estCost?` | `number` | Admission reserve hint in USD (budget layer 1). | [packages/core/src/engine/ctx.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L174) |
| <a id="property-evidencecontract"></a> `evidenceContract?` | [`EvidenceContract`](/api/@rulvar/core/interfaces/EvidenceContract.md) | The declared evidence contract of the profile's task (RV303, the seventh comparison experiment; runtime enforcement RV507): how many evidence entries the spawned agent MUST record, and the declared call estimates behind them. Under the default `enforce: 'warn'` it is purely declarative, like estCost: [preflightEstimate](/api/@rulvar/core/functions/preflightEstimate.md) compares the resulting call floor (`minEntries * estCallsPerEntry + overheadCalls`, defaults 3 and 8) against the spawn's effective executed-call ceiling and warns `tool-cap-below-evidence-floor` when the cap cannot fit the contract. Under `enforce: 'refuse'` the floor additionally binds at the terminal: an ok settle with fewer successful `record_evidence` executions than `minEntries` becomes a typed error terminal. The experiment shape: 14 mandatory entries against an 84-call cap that two workers exhausted at 10 recorded entries. | [packages/core/src/engine/ctx.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L191) |
| <a id="property-isolation"></a> `isolation?` | [`IsolationSpec`](/api/@rulvar/core/type-aliases/IsolationSpec.md) | Isolation default; the RESOLVED value enters identity. | [packages/core/src/engine/ctx.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L158) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | - | [packages/core/src/engine/ctx.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L161) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | - | [packages/core/src/engine/ctx.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L150) |
| <a id="property-permissions"></a> `permissions?` | [`AgentProfilePermissions`](/api/@rulvar/core/interfaces/AgentProfilePermissions.md) | Chain layers merged over engine defaults. | [packages/core/src/engine/ctx.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L156) |
| <a id="property-retry"></a> `retry?` | [`RetryPolicy`](/api/@rulvar/core/interfaces/RetryPolicy.md) | Transport RetryPolicy layer: call over profile over engine (M4-T05). | [packages/core/src/engine/ctx.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L163) |
| <a id="property-routing"></a> `routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md)\&gt;\&gt; | - | [packages/core/src/engine/ctx.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L151) |
| <a id="property-taskclass"></a> `taskClass?` | `string` | Declared task class bridging ModelKnowledge; default unclassified (M4-T09). | [packages/core/src/engine/ctx.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L165) |
| <a id="property-tools"></a> `tools?` | [`ToolsOption`](/api/@rulvar/core/type-aliases/ToolsOption.md) | Toolset default; the resolved snapshot enters identity via toolsetHash. | [packages/core/src/engine/ctx.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L154) |
