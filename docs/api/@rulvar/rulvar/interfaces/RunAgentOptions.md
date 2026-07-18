[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunAgentOptions

# Interface: RunAgentOptions\&lt;S\&gt;

Defined in: `packages/core/dist/index.d.ts`

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md) | [`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md) |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-adapter"></a> `adapter` | [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-agenttype"></a> `agentType?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-budget"></a> `budget?` | [`BudgetHooks`](/api/@rulvar/rulvar/interfaces/BudgetHooks.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-canonicalschema"></a> `canonicalSchema?` | [`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md) | Canonicalized JSON Schema projection of `schema` (precomputed for identity). | `packages/core/dist/index.d.ts` |
| <a id="property-checkpoint"></a> `checkpoint?` | \{ `load`: `Promise`\&lt; \| [`CheckpointState`](/api/@rulvar/rulvar/interfaces/CheckpointState.md) \| `undefined`\&gt;; `save`: `Promise`\&lt;`void`\&gt;; \} | Turn-boundary checkpointing (M3-T02). load() restores the last boundary on a dangling-dispatch resume; save() persists each boundary where the loop continues. The separate extract invocation is not checkpointed in v1: an extract-phase crash re-pays from the last loop boundary. | `packages/core/dist/index.d.ts` |
| `checkpoint.load` | `Promise`\&lt; \| [`CheckpointState`](/api/@rulvar/rulvar/interfaces/CheckpointState.md) \| `undefined`\&gt; | - | `packages/core/dist/index.d.ts` |
| `checkpoint.save` | `Promise`\&lt;`void`\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-compaction"></a> `compaction?` | \{ `threshold?`: `number`; \} | Per-profile compaction config; threshold default 0.8 (Appendix A). | `packages/core/dist/index.d.ts` |
| `compaction.threshold?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-escalation"></a> `escalation?` | \{ `minSpendUsd`: `number`; \} | Escalation opt-in (M3-T07): the loop intercepts accepted calls to the escalate tool and terminates with status 'escalated'; the in-run minSpend gate rejects early scope_bigger escalations with a "keep working" error tool result (M3-T09). | `packages/core/dist/index.d.ts` |
| `escalation.minSpendUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-events"></a> `events?` | [`RuntimeEventSink`](/api/@rulvar/rulvar/interfaces/RuntimeEventSink.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-extract"></a> `extract?` | [`PhaseTarget`](/api/@rulvar/rulvar/interfaces/PhaseTarget.md) & \{ `fallbacks?`: [`PhaseTarget`](/api/@rulvar/rulvar/interfaces/PhaseTarget.md)[]; \} | Separate final extract invocation, present only when the role trigger protocol demands one: schema set AND (routing directs extract to a different model OR the loop model's caps cannot serve the required tier OR finalize is routed). Otherwise the schema rides the last loop turn (the necessity rule is decided by the ctx layer via model/roles.ts). | `packages/core/dist/index.d.ts` |
| <a id="property-fallbacks"></a> `fallbacks?` | [`PhaseTarget`](/api/@rulvar/rulvar/interfaces/PhaseTarget.md)[] | Transport failover chain for the loop phase (M4-T04): resolved fallback targets tried in order on transport or rate-limit failures after retries exhaust. Failover is sticky and changes only servedBy, never the content key. | `packages/core/dist/index.d.ts` |
| <a id="property-finalize"></a> `finalize?` | [`PhaseTarget`](/api/@rulvar/rulvar/interfaces/PhaseTarget.md) & \{ `fallbacks?`: [`PhaseTarget`](/api/@rulvar/rulvar/interfaces/PhaseTarget.md)[]; \} | Finalize synthesis invocation (M4-T01), present only when the role trigger protocol fires it: configured in routing AND the toolset is non-empty. Runs after tools stop with toolChoice 'none' over the full transcript plus a deterministic synthesis instruction appended to the REQUEST only (the durable transcript keeps the raw history); its text becomes the output for schema-less calls, a non-truncated empty synthesis falls back to the loop turn's text, and a schema-bearing call always pairs it with a separate extract (the ctx layer guarantees `extract` is present in that case). Like extract, the finalize invocation is not checkpointed in v1. | `packages/core/dist/index.d.ts` |
| <a id="property-label"></a> `label?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits` | [`EffectiveUsageLimits`](/api/@rulvar/rulvar/interfaces/EffectiveUsageLimits.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-modelretryattempts"></a> `modelRetryAttempts?` | `number` | Bounded ModelRetry conversions per tool call chain; default 2 (Appendix A). | `packages/core/dist/index.d.ts` |
| <a id="property-now"></a> `now?` | () => `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-priceusd"></a> `priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` | - | `packages/core/dist/index.d.ts` |
| <a id="property-prompt"></a> `prompt` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-providerslot"></a> `providerSlot?` | \&lt;`T`\&gt;(`key`, `fn`) => `Promise`\&lt;`T`\&gt; | Per-provider keyed limiter hook (M4-T07): wraps every wire dispatch under the serving adapter's key; absent = unlimited (Appendix A). | `packages/core/dist/index.d.ts` |
| <a id="property-resolved"></a> `resolved` | [`ResolvedInvocation`](/api/@rulvar/rulvar/interfaces/ResolvedInvocation.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-retry"></a> `retry?` | \{ `policy?`: [`RetryPolicy`](/api/@rulvar/rulvar/interfaces/RetryPolicy.md); `random?`: () => `number`; `sleep?`: (`ms`) => `Promise`\&lt;`void`\&gt;; \} | Transport RetryPolicy (M4-T05): lives UNDER the journal, wired around every adapter.stream dispatch. sleep and random are injectable for tests; the core owns wall-clock. | `packages/core/dist/index.d.ts` |
| `retry.policy?` | [`RetryPolicy`](/api/@rulvar/rulvar/interfaces/RetryPolicy.md) | - | `packages/core/dist/index.d.ts` |
| `retry.random?` | () => `number` | - | `packages/core/dist/index.d.ts` |
| `retry.sleep?` | (`ms`) => `Promise`\&lt;`void`\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-role"></a> `role?` | `"orchestrate"` \| `"plan"` \| `"loop"` | The primary invocation role of the tool loop; default 'loop' (M6-T05). | `packages/core/dist/index.d.ts` |
| <a id="property-schema"></a> `schema?` | `S` | - | `packages/core/dist/index.d.ts` |
| <a id="property-schemaretryattempts"></a> `schemaRetryAttempts?` | `number` | Bounded schema re-prompt attempts; default 2 (Appendix A). | `packages/core/dist/index.d.ts` |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Host or sibling cancellation. | `packages/core/dist/index.d.ts` |
| <a id="property-stream"></a> `stream?` | `boolean` | Emits agent:stream deltas when true (telemetry only). | `packages/core/dist/index.d.ts` |
| <a id="property-summarize"></a> `summarize?` | [`PhaseTarget`](/api/@rulvar/rulvar/interfaces/PhaseTarget.md) & \{ `fallbacks?`: [`PhaseTarget`](/api/@rulvar/rulvar/interfaces/PhaseTarget.md)[]; \} | Summarize invocation target for compaction (M4-T03): resolved through the chain with role 'summarize', falling back to the loop model when routing resolves nothing. Compaction is ON by default; absence of this option disables it (direct runAgent callers). | `packages/core/dist/index.d.ts` |
| <a id="property-terminaltool"></a> `terminalTool?` | \{ `name`: `string`; \} | Terminal-tool interception (M6-T07): an accepted call to the named tool ends the loop with status ok; the call's validated `result` argument becomes the agent output (the orchestrator finish tool). The tool's execute never runs, mirroring escalate. | `packages/core/dist/index.d.ts` |
| `terminalTool.name` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-tools"></a> `tools?` | [`ToolRuntime`](/api/@rulvar/rulvar/interfaces/ToolRuntime.md) | The resolved toolset; absent = no tools declared. | `packages/core/dist/index.d.ts` |
| <a id="property-transcript"></a> `transcript?` | \{ `mintRef`: `string`; `put`: `Promise`\&lt;`void`\&gt;; \} | - | `packages/core/dist/index.d.ts` |
| `transcript.mintRef` | `string` | - | `packages/core/dist/index.d.ts` |
| `transcript.put` | `Promise`\&lt;`void`\&gt; | - | `packages/core/dist/index.d.ts` |
