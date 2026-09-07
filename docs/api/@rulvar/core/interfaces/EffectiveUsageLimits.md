[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectiveUsageLimits

# Interface: EffectiveUsageLimits

Defined in: [packages/core/src/runtime/usage-limits.ts:259](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L259)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-checkpointeverytoolcalls"></a> `checkpointEveryToolCalls?` | `number` | RV408 mid-batch checkpoint cadence; absent = per-turn only. | [packages/core/src/runtime/usage-limits.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L276) |
| <a id="property-finalizationreserve"></a> `finalizationReserve?` | \{ `maxOutputTokens?`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L277) |
| `finalizationReserve.maxOutputTokens?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L277) |
| <a id="property-finalizationturns"></a> `finalizationTurns?` | \{ `allow?`: `string`[]; `reserveTurns`: `number`; \} | RV1405: the trailing turns of maxTurns reserved for the finalization regime. | [packages/core/src/runtime/usage-limits.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L295) |
| `finalizationTurns.allow?` | `string`[] | - | [packages/core/src/runtime/usage-limits.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L297) |
| `finalizationTurns.reserveTurns` | `number` | - | [packages/core/src/runtime/usage-limits.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L296) |
| <a id="property-finalizationwindow"></a> `finalizationWindow?` | \{ `allow?`: `string`[]; `onSurplus?`: `"limit"` \| `"answer"`; `reserveCalls`: `number`; `reserveForEvidenceDeficit?`: `boolean`; \} | - | [packages/core/src/runtime/usage-limits.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L286) |
| `finalizationWindow.allow?` | `string`[] | - | [packages/core/src/runtime/usage-limits.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L288) |
| `finalizationWindow.onSurplus?` | `"limit"` \| `"answer"` | RV4902: one answer turn after an allowlisted overrun with the floor met. | [packages/core/src/runtime/usage-limits.ts:292](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L292) |
| `finalizationWindow.reserveCalls` | `number` | - | [packages/core/src/runtime/usage-limits.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L287) |
| `finalizationWindow.reserveForEvidenceDeficit?` | `boolean` | RV1208: widen the reserve to the outstanding evidence deficit plus the summary. | [packages/core/src/runtime/usage-limits.ts:290](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L290) |
| <a id="property-maxcallspertool"></a> `maxCallsPerTool?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L273) |
| <a id="property-maxnonewevidencecalls"></a> `maxNoNewEvidenceCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:272](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L272) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L262) |
| <a id="property-maxrepeatedtoolsignature"></a> `maxRepeatedToolSignature?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L271) |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L261) |
| <a id="property-maxturns"></a> `maxTurns` | `number` | - | [packages/core/src/runtime/usage-limits.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L260) |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | Default DEFAULT_NO_PROGRESS_TURNS. | [packages/core/src/runtime/usage-limits.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L268) |
| <a id="property-repairturnmaxoutputtokens"></a> `repairTurnMaxOutputTokens?` | `number` | RV4904: the output allowance of a granted repair turn. | [packages/core/src/runtime/usage-limits.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L264) |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs` | `number` | - | [packages/core/src/runtime/usage-limits.ts:266](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L266) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L265) |
| <a id="property-toolbudgetextension"></a> `toolBudgetExtension?` | \{ `coverEvidenceDeficit?`: `boolean`; `increment`: `number`; `maxExtensions`: `number`; `minHeadroomUsd?`: `number`; `requireNewEvidence?`: `boolean`; \} | - | [packages/core/src/runtime/usage-limits.ts:278](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L278) |
| `toolBudgetExtension.coverEvidenceDeficit?` | `boolean` | RV809: grant at the boundary when remaining calls cannot cover the evidence deficit. | [packages/core/src/runtime/usage-limits.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L284) |
| `toolBudgetExtension.increment` | `number` | - | [packages/core/src/runtime/usage-limits.ts:279](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L279) |
| `toolBudgetExtension.maxExtensions` | `number` | - | [packages/core/src/runtime/usage-limits.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L280) |
| `toolBudgetExtension.minHeadroomUsd?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:281](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L281) |
| `toolBudgetExtension.requireNewEvidence?` | `boolean` | - | [packages/core/src/runtime/usage-limits.ts:282](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L282) |
| <a id="property-toolbudgetnotices"></a> `toolBudgetNotices?` | `boolean` | RV-210 exploration guards; absent = off. | [packages/core/src/runtime/usage-limits.ts:270](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L270) |
| <a id="property-toolunits"></a> `toolUnits?` | \{ `costs?`: `Record`\&lt;`string`, `number`\&gt;; `max`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L274) |
| `toolUnits.costs?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L274) |
| `toolUnits.max` | `number` | - | [packages/core/src/runtime/usage-limits.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L274) |
