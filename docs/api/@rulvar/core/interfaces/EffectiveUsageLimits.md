[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectiveUsageLimits

# Interface: EffectiveUsageLimits

Defined in: [packages/core/src/runtime/usage-limits.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L188)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-checkpointeverytoolcalls"></a> `checkpointEveryToolCalls?` | `number` | RV408 mid-batch checkpoint cadence; absent = per-turn only. | [packages/core/src/runtime/usage-limits.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L203) |
| <a id="property-finalizationreserve"></a> `finalizationReserve?` | \{ `maxOutputTokens?`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L204) |
| `finalizationReserve.maxOutputTokens?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L204) |
| <a id="property-finalizationwindow"></a> `finalizationWindow?` | \{ `allow?`: `string`[]; `reserveCalls`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L213) |
| `finalizationWindow.allow?` | `string`[] | - | [packages/core/src/runtime/usage-limits.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L215) |
| `finalizationWindow.reserveCalls` | `number` | - | [packages/core/src/runtime/usage-limits.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L214) |
| <a id="property-maxcallspertool"></a> `maxCallsPerTool?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:200](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L200) |
| <a id="property-maxnonewevidencecalls"></a> `maxNoNewEvidenceCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L199) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L191) |
| <a id="property-maxrepeatedtoolsignature"></a> `maxRepeatedToolSignature?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L198) |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L190) |
| <a id="property-maxturns"></a> `maxTurns` | `number` | - | [packages/core/src/runtime/usage-limits.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L189) |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | Default DEFAULT_NO_PROGRESS_TURNS. | [packages/core/src/runtime/usage-limits.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L195) |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs` | `number` | - | [packages/core/src/runtime/usage-limits.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L193) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L192) |
| <a id="property-toolbudgetextension"></a> `toolBudgetExtension?` | \{ `coverEvidenceDeficit?`: `boolean`; `increment`: `number`; `maxExtensions`: `number`; `minHeadroomUsd?`: `number`; `requireNewEvidence?`: `boolean`; \} | - | [packages/core/src/runtime/usage-limits.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L205) |
| `toolBudgetExtension.coverEvidenceDeficit?` | `boolean` | RV809: grant at the boundary when remaining calls cannot cover the evidence deficit. | [packages/core/src/runtime/usage-limits.ts:211](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L211) |
| `toolBudgetExtension.increment` | `number` | - | [packages/core/src/runtime/usage-limits.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L206) |
| `toolBudgetExtension.maxExtensions` | `number` | - | [packages/core/src/runtime/usage-limits.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L207) |
| `toolBudgetExtension.minHeadroomUsd?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L208) |
| `toolBudgetExtension.requireNewEvidence?` | `boolean` | - | [packages/core/src/runtime/usage-limits.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L209) |
| <a id="property-toolbudgetnotices"></a> `toolBudgetNotices?` | `boolean` | RV-210 exploration guards; absent = off. | [packages/core/src/runtime/usage-limits.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L197) |
| <a id="property-toolunits"></a> `toolUnits?` | \{ `costs?`: `Record`\&lt;`string`, `number`\&gt;; `max`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L201) |
| `toolUnits.costs?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L201) |
| `toolUnits.max` | `number` | - | [packages/core/src/runtime/usage-limits.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L201) |
