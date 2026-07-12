[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunInternals

# Interface: RunInternals

Defined in: `packages/core/dist/index.d.ts`

Everything one run's ctx needs; created per run by the engine (M1-T11).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-adapters"></a> `adapters` | `ReadonlyMap`\&lt;`string`, [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-admission"></a> `admission?` | [`AdmissionController`](/api/@rulvar/rulvar/classes/AdmissionController.md) | The single admission point for all spawns (M6-T06). | `packages/core/dist/index.d.ts` |
| <a id="property-budget"></a> `budget` | [`RunBudget`](/api/@rulvar/rulvar/classes/RunBudget.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-claimedlineagedecisions"></a> `claimedLineageDecisions?` | `Set`\&lt;`number`\&gt; | Seqs of spawn-admission decisions already paired with a live ctx.agent dispatch this process lifetime, so byte-identical repeats recover THEIR OWN decisions in journal order (DEF-3; M7-T02). | `packages/core/dist/index.d.ts` |
| <a id="property-cost"></a> `cost` | [`CostAttribution`](/api/@rulvar/rulvar/interfaces/CostAttribution.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-defaults"></a> `defaults` | \{ `gates?`: `Record`\&lt;`string`, [`MechanicalGateProfile`](/api/@rulvar/rulvar/type-aliases/MechanicalGateProfile.md)\&gt;; `limits?`: [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md); `permissions?`: [`PermissionConfig`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md); `profiles?`: `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md)\&gt;; `retry?`: [`RetryPolicy`](/api/@rulvar/rulvar/interfaces/RetryPolicy.md); `routing?`: `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md)\&gt;\&gt;; `schemas?`: `Record`\&lt;`string`, [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;; `toolsets?`: `Record`\&lt;`string`, [`ToolsOption`](/api/@rulvar/rulvar/type-aliases/ToolsOption.md)\&gt;; `workflows?`: `Record`\&lt;`string`, `unknown`\&gt;; \} | - | `packages/core/dist/index.d.ts` |
| `defaults.gates?` | `Record`\&lt;`string`, [`MechanicalGateProfile`](/api/@rulvar/rulvar/type-aliases/MechanicalGateProfile.md)\&gt; | - | `packages/core/dist/index.d.ts` |
| `defaults.limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | - | `packages/core/dist/index.d.ts` |
| `defaults.permissions?` | [`PermissionConfig`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md) | - | `packages/core/dist/index.d.ts` |
| `defaults.profiles?` | `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md)\&gt; | - | `packages/core/dist/index.d.ts` |
| `defaults.retry?` | [`RetryPolicy`](/api/@rulvar/rulvar/interfaces/RetryPolicy.md) | - | `packages/core/dist/index.d.ts` |
| `defaults.routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md)\&gt;\&gt; | - | `packages/core/dist/index.d.ts` |
| `defaults.schemas?` | `Record`\&lt;`string`, [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt; | - | `packages/core/dist/index.d.ts` |
| `defaults.toolsets?` | `Record`\&lt;`string`, [`ToolsOption`](/api/@rulvar/rulvar/type-aliases/ToolsOption.md)\&gt; | - | `packages/core/dist/index.d.ts` |
| `defaults.workflows?` | `Record`\&lt;`string`, `unknown`\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-dropped"></a> `dropped` | [`DroppedItem`](/api/@rulvar/rulvar/interfaces/DroppedItem.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-errorpolicy"></a> `errorPolicy` | [`ErrorPolicy`](/api/@rulvar/rulvar/type-aliases/ErrorPolicy.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-events"></a> `events` | [`RunEventSink`](/api/@rulvar/rulvar/interfaces/RunEventSink.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-external"></a> `external?` | [`ExternalRegistry`](/api/@rulvar/rulvar/classes/ExternalRegistry.md) | Open external suspensions plus the quiescence activity counter (M2-T08). | `packages/core/dist/index.d.ts` |
| <a id="property-flatreserveusd"></a> `flatReserveUsd?` | `number` | budgetDefaults.flatReserveUsd; last resort of the reserve formula. | `packages/core/dist/index.d.ts` |
| <a id="property-floors"></a> `floors?` | [`QualityFloors`](/api/@rulvar/rulvar/interfaces/QualityFloors.md) | Hard router constraints from engine config (M4-T09). | `packages/core/dist/index.d.ts` |
| <a id="property-isolation"></a> `isolation?` | [`IsolationProvider`](/api/@rulvar/rulvar/interfaces/IsolationProvider.md) | The worktree lifecycle provider. | `packages/core/dist/index.d.ts` |
| <a id="property-knowledge"></a> `knowledge?` | [`ModelKnowledgeHandle`](/api/@rulvar/rulvar/type-aliases/ModelKnowledgeHandle.md) | The ModelKnowledge runtime handle (M10-T03): current() only, commit physically absent. Present only when the engine was given stores.modelKnowledge; absent means the feature is off and no kb entries are ever written. | `packages/core/dist/index.d.ts` |
| <a id="property-minttranscriptref"></a> `mintTranscriptRef` | () => `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-now"></a> `now` | () => `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-onescalation"></a> `onEscalation?` | (`result`) => \| [`EscalationDecision`](/api/@rulvar/rulvar/type-aliases/EscalationDecision.md) \| `Promise`\&lt;[`EscalationDecision`](/api/@rulvar/rulvar/type-aliases/EscalationDecision.md)\&gt; | The InProcessRunner escalation hook: receives escalated results when the call form cannot carry them; its decision is journaled as the authoritative escalation-decision entry. | `packages/core/dist/index.d.ts` |
| <a id="property-priceusd"></a> `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` | - | `packages/core/dist/index.d.ts` |
| <a id="property-pricingversion"></a> `pricingVersion?` | `string` | The configured price table's version; pinned in decision entries (M4-T06). | `packages/core/dist/index.d.ts` |
| <a id="property-providerlimiter"></a> `providerLimiter?` | [`KeyedLimiter`](/api/@rulvar/rulvar/classes/KeyedLimiter.md) | Engine-scoped per-provider keyed limiter (M4-T07). | `packages/core/dist/index.d.ts` |
| <a id="property-replayer"></a> `replayer` | [`Replayer`](/api/@rulvar/rulvar/classes/Replayer.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-rootspanid"></a> `rootSpanId` | `string` | The run root span; every top-level span parents on it. | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-runsignal"></a> `runSignal?` | `AbortSignal` | - | `packages/core/dist/index.d.ts` |
| <a id="property-semaphore"></a> `semaphore` | [`Semaphore`](/api/@rulvar/rulvar/classes/Semaphore.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-spans"></a> `spans` | [`SpanMinter`](/api/@rulvar/rulvar/interfaces/SpanMinter.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-transcripts"></a> `transcripts` | [`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md) | - | `packages/core/dist/index.d.ts` |
