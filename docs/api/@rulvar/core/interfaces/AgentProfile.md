[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentProfile

# Interface: AgentProfile

Defined in: [packages/core/src/engine/ctx.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L163)

The canonical, complete AgentProfile shape; M1 honors description,
model, routing, effort, limits, and estCost. A profile never carries
a prompt or a schema.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cache"></a> `cache?` | [`CachePolicy`](/api/@rulvar/core/interfaces/CachePolicy.md) | The prompt-cache policy layer (RV2006): call opts over this profile over the engine default; absent everywhere means 'auto' (hints on explicit-caching adapters, nothing anywhere else). | [packages/core/src/engine/ctx.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L192) |
| <a id="property-compaction"></a> `compaction?` | \{ `threshold?`: `number`; \} | Per-profile compaction threshold; default 0.8 of the loop model's contextWindow (M4-T03). Compaction is ON by default; history-processor plumbing stays engine-internal. The threshold is a fraction in (0, 1], validated at createEngine. | [packages/core/src/engine/ctx.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L203) |
| `compaction.threshold?` | `number` | - | [packages/core/src/engine/ctx.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L203) |
| <a id="property-counttokens"></a> `countTokens?` | `"allow"` \| `"deny"` | The admission countTokens policy for this profile (RV1804): the pre-admission count probe is full-prompt provider egress billed to no invoice row. 'deny' forbids it for spawns of this profile (the flat reserve admits instead); wins over the engine-wide `defaults.countTokens`. Default: the engine default, else 'allow'. | [packages/core/src/engine/ctx.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L213) |
| <a id="property-description"></a> `description?` | `string` | - | [packages/core/src/engine/ctx.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L164) |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | - | [packages/core/src/engine/ctx.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L167) |
| <a id="property-escalation"></a> `escalation?` | [`EscalationOptions`](/api/@rulvar/core/interfaces/EscalationOptions.md) | Flavor B opt-in lives here or on the call. | [packages/core/src/engine/ctx.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L185) |
| <a id="property-estcost"></a> `estCost?` | `number` | Admission reserve hint in USD (budget layer 1). | [packages/core/src/engine/ctx.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L205) |
| <a id="property-evidencecontract"></a> `evidenceContract?` | [`EvidenceContract`](/api/@rulvar/core/interfaces/EvidenceContract.md) | The declared evidence contract of the profile's task (RV303, the seventh comparison experiment; runtime enforcement RV507): how many evidence entries the spawned agent MUST record, and the declared call estimates behind them. Under the default `enforce: 'warn'` it is purely declarative, like estCost: [preflightEstimate](/api/@rulvar/core/functions/preflightEstimate.md) compares the resulting call floor (`minEntries * estCallsPerEntry + overheadCalls`, defaults 3 and 8) against the spawn's effective executed-call ceiling and warns `tool-cap-below-evidence-floor` when the cap cannot fit the contract. Under `enforce: 'refuse'` the floor additionally binds at the terminal: an ok settle with fewer successful `record_evidence` executions than `minEntries` becomes a typed error terminal. The experiment shape: 14 mandatory entries against an 84-call cap that two workers exhausted at 10 recorded entries. | [packages/core/src/engine/ctx.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L230) |
| <a id="property-isolation"></a> `isolation?` | [`IsolationSpec`](/api/@rulvar/core/type-aliases/IsolationSpec.md) | Isolation default; the RESOLVED value enters identity. | [packages/core/src/engine/ctx.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L183) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | - | [packages/core/src/engine/ctx.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L186) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | - | [packages/core/src/engine/ctx.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L165) |
| <a id="property-permissions"></a> `permissions?` | [`AgentProfilePermissions`](/api/@rulvar/core/interfaces/AgentProfilePermissions.md) | Chain layers merged over engine defaults. | [packages/core/src/engine/ctx.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L181) |
| <a id="property-retry"></a> `retry?` | [`RetryPolicy`](/api/@rulvar/core/interfaces/RetryPolicy.md) | Transport RetryPolicy layer: call over profile over engine (M4-T05). | [packages/core/src/engine/ctx.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L194) |
| <a id="property-routing"></a> `routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md)\&gt;\&gt; | - | [packages/core/src/engine/ctx.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L166) |
| <a id="property-taskclass"></a> `taskClass?` | `string` | Declared task class bridging ModelKnowledge; default unclassified (M4-T09). | [packages/core/src/engine/ctx.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L196) |
| <a id="property-tools"></a> `tools?` | [`ToolsOption`](/api/@rulvar/core/type-aliases/ToolsOption.md) | Toolset default; the resolved snapshot enters identity via toolsetHash. | [packages/core/src/engine/ctx.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L169) |
| <a id="property-toolsetattestation"></a> `toolsetAttestation?` | [`ToolsetAttestation`](/api/@rulvar/core/interfaces/ToolsetAttestation.md) | The attested toolset pin (RV1514): when present, every spawn of this profile must resolve its toolset to EXACTLY this hash, or the spawn refuses typed before any provider call. Record the pin with `attestToolset()`; the per-tool hashes it records turn the refusal into a named diff. The pin binds the spawn's RESOLVED toolset, so call-level tool overrides and the opt-in escalate tool drift it by design. | [packages/core/src/engine/ctx.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L179) |
