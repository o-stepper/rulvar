[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AgentProfile

# Interface: AgentProfile

Defined in: `packages/core/dist/index.d.ts`

The canonical, complete AgentProfile shape; M1 honors description,
model, routing, effort, limits, and estCost. A profile never carries
a prompt or a schema.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-compaction"></a> `compaction?` | \{ `threshold?`: `number`; \} | Per-profile compaction threshold; default 0.8 of the loop model's contextWindow (M4-T03). Compaction is ON by default; history-processor plumbing stays engine-internal. The threshold is a fraction in (0, 1], validated at createEngine. | `packages/core/dist/index.d.ts` |
| `compaction.threshold?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-description"></a> `description?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-escalation"></a> `escalation?` | [`EscalationOptions`](/api/@rulvar/rulvar/interfaces/EscalationOptions.md) | Flavor B opt-in lives here or on the call. | `packages/core/dist/index.d.ts` |
| <a id="property-estcost"></a> `estCost?` | `number` | Admission reserve hint in USD (budget layer 1). | `packages/core/dist/index.d.ts` |
| <a id="property-evidencecontract"></a> `evidenceContract?` | [`EvidenceContract`](/api/@rulvar/rulvar/interfaces/EvidenceContract.md) | The declared evidence contract of the profile's task (RV303, the seventh comparison experiment): how many evidence entries the spawned agent MUST record, and the declared call estimates behind them. Purely declarative, like estCost: the runtime never enforces it; [preflightEstimate](/api/@rulvar/rulvar/functions/preflightEstimate.md) compares the resulting call floor (`minEntries * estCallsPerEntry + overheadCalls`, defaults 3 and 8) against the spawn's effective executed-call ceiling and warns `tool-cap-below-evidence-floor` when the cap cannot fit the contract. The experiment shape: 14 mandatory entries against an 84-call cap that two workers exhausted at 10 recorded entries. | `packages/core/dist/index.d.ts` |
| <a id="property-isolation"></a> `isolation?` | [`IsolationSpec`](/api/@rulvar/rulvar/type-aliases/IsolationSpec.md) | Isolation default; the RESOLVED value enters identity. | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-permissions"></a> `permissions?` | [`AgentProfilePermissions`](/api/@rulvar/rulvar/interfaces/AgentProfilePermissions.md) | Chain layers merged over engine defaults. | `packages/core/dist/index.d.ts` |
| <a id="property-retry"></a> `retry?` | [`RetryPolicy`](/api/@rulvar/rulvar/interfaces/RetryPolicy.md) | Transport RetryPolicy layer: call over profile over engine (M4-T05). | `packages/core/dist/index.d.ts` |
| <a id="property-routing"></a> `routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md)\&gt;\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-taskclass"></a> `taskClass?` | `string` | Declared task class bridging ModelKnowledge; default unclassified (M4-T09). | `packages/core/dist/index.d.ts` |
| <a id="property-tools"></a> `tools?` | [`ToolsOption`](/api/@rulvar/rulvar/type-aliases/ToolsOption.md) | Toolset default; the resolved snapshot enters identity via toolsetHash. | `packages/core/dist/index.d.ts` |
