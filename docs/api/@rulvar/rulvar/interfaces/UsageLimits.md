[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / UsageLimits

# Interface: UsageLimits

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-maxnonewevidencecalls"></a> `maxNoNewEvidenceCalls?` | `number` | How many consecutive successful tool executions may return only already-seen result digests before the engine aborts the invocation as status 'limit' with abortClass 'exploration' (RV-210). The executed work is kept and the terminal memoizes. Unlimited by default. | `packages/core/dist/index.d.ts` |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | Unlimited by default (model caps still apply). | `packages/core/dist/index.d.ts` |
| <a id="property-maxrepeatedtoolsignature"></a> `maxRepeatedToolSignature?` | `number` | How many times the SAME tool signature (name + canonical JCS args) may execute per invocation (RV-210). The call that would exceed it is denied with a typed error tool result instead of dispatched; the denial is visible to the model and does not consume maxToolCalls. Unlimited by default. | `packages/core/dist/index.d.ts` |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | Unlimited by default. | `packages/core/dist/index.d.ts` |
| <a id="property-maxturns"></a> `maxTurns?` | `number` | Default 32. | `packages/core/dist/index.d.ts` |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | The no-progress detector N (committed at 3): consecutive turns without tool calls or artifact deltas before the engine aborts with the dedicated class (M3-T08). | `packages/core/dist/index.d.ts` |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs?` | `number` | Gap between stream events; default 120000. | `packages/core/dist/index.d.ts` |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | Per-agent wall clock; unlimited by default. | `packages/core/dist/index.d.ts` |
| <a id="property-toolbudgetnotices"></a> `toolBudgetNotices?` | `boolean` | Soft 50%/80% thresholds over maxToolCalls (RV-210), surfaced to the model as a plain user message carrying the exact remaining count. Inert (with a loud log warning) when maxToolCalls is not set. Off by default: the notice enters the conversation, so enabling it changes recorded model requests. | `packages/core/dist/index.d.ts` |
