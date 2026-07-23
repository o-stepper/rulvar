[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / UsageLimits

# Interface: UsageLimits

Defined in: [packages/core/src/runtime/usage-limits.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L16)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-maxcallspertool"></a> `maxCallsPerTool?` | `Record`\&lt;`string`, `number`\&gt; | Per-tool execution caps by tool NAME (RV-210 close-out): the call that would exceed its tool's cap is denied with a typed error tool result instead of dispatched (visible to the model, never terminal), and the denial does not consume maxToolCalls or tool units. A cap of 0 bans the tool for the invocation; names absent from the record are unlimited. Per layer the whole record replaces (no per-key merge), like every other UsageLimits field. | [packages/core/src/runtime/usage-limits.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L66) |
| <a id="property-maxnonewevidencecalls"></a> `maxNoNewEvidenceCalls?` | `number` | How many consecutive successful tool executions may return only already-seen result digests before the engine aborts the invocation as status 'limit' with abortClass 'exploration' (RV-210). The executed work is kept and the terminal memoizes. Unlimited by default. | [packages/core/src/runtime/usage-limits.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L56) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | Unlimited by default (model caps still apply). | [packages/core/src/runtime/usage-limits.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L22) |
| <a id="property-maxrepeatedtoolsignature"></a> `maxRepeatedToolSignature?` | `number` | How many times the SAME tool signature (name + canonical JCS args) may execute per invocation (RV-210). The call that would exceed it is denied with a typed error tool result instead of dispatched; the denial is visible to the model and does not consume maxToolCalls. Unlimited by default. | [packages/core/src/runtime/usage-limits.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L48) |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | Unlimited by default. | [packages/core/src/runtime/usage-limits.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L20) |
| <a id="property-maxturns"></a> `maxTurns?` | `number` | Default 32. | [packages/core/src/runtime/usage-limits.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L18) |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | The no-progress detector N (committed at 3): consecutive turns without tool calls or artifact deltas before the engine aborts with the dedicated class (M3-T08). | [packages/core/src/runtime/usage-limits.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L32) |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs?` | `number` | Gap between stream events; default 120000. | [packages/core/src/runtime/usage-limits.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L26) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | Per-agent wall clock; unlimited by default. | [packages/core/src/runtime/usage-limits.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L24) |
| <a id="property-toolbudgetnotices"></a> `toolBudgetNotices?` | `boolean` | Soft 50%/80% thresholds over maxToolCalls (RV-210), surfaced to the model as a plain user message carrying the exact remaining count. Inert (with a loud log warning) when maxToolCalls is not set. Off by default: the notice enters the conversation, so enabling it changes recorded model requests. | [packages/core/src/runtime/usage-limits.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L40) |
| <a id="property-toolunits"></a> `toolUnits?` | \{ `costs?`: `Record`\&lt;`string`, `number`\&gt;; `max`: `number`; \} | The weighted tool budget (RV-210 close-out): every EXECUTED call of tool T costs `costs[T] ?? 1` units (a cost of 0 makes bookkeeping tools free), and once the spent units reach `max` the invocation terminates as status 'limit' exactly like maxToolCalls (paid partial work; executed results stand). Denied calls cost nothing. On resume the spent units rebuild from the restored transcript's successful executions, the same conservative window the exploration guards use. | [packages/core/src/runtime/usage-limits.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L76) |
| `toolUnits.costs?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L76) |
| `toolUnits.max` | `number` | - | [packages/core/src/runtime/usage-limits.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L76) |
