[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectiveUsageLimits

# Interface: EffectiveUsageLimits

Defined in: [packages/core/src/runtime/usage-limits.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L203)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-checkpointeverytoolcalls"></a> `checkpointEveryToolCalls?` | `number` | RV408 mid-batch checkpoint cadence; absent = per-turn only. | [packages/core/src/runtime/usage-limits.ts:218](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L218) |
| <a id="property-finalizationreserve"></a> `finalizationReserve?` | \{ `maxOutputTokens?`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L219) |
| `finalizationReserve.maxOutputTokens?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L219) |
| <a id="property-finalizationwindow"></a> `finalizationWindow?` | \{ `allow?`: `string`[]; `reserveCalls`: `number`; `reserveForEvidenceDeficit?`: `boolean`; \} | - | [packages/core/src/runtime/usage-limits.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L228) |
| `finalizationWindow.allow?` | `string`[] | - | [packages/core/src/runtime/usage-limits.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L230) |
| `finalizationWindow.reserveCalls` | `number` | - | [packages/core/src/runtime/usage-limits.ts:229](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L229) |
| `finalizationWindow.reserveForEvidenceDeficit?` | `boolean` | RV1208: widen the reserve to the outstanding evidence deficit plus the summary. | [packages/core/src/runtime/usage-limits.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L232) |
| <a id="property-maxcallspertool"></a> `maxCallsPerTool?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L215) |
| <a id="property-maxnonewevidencecalls"></a> `maxNoNewEvidenceCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L214) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L206) |
| <a id="property-maxrepeatedtoolsignature"></a> `maxRepeatedToolSignature?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L213) |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L205) |
| <a id="property-maxturns"></a> `maxTurns` | `number` | - | [packages/core/src/runtime/usage-limits.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L204) |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | Default DEFAULT_NO_PROGRESS_TURNS. | [packages/core/src/runtime/usage-limits.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L210) |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs` | `number` | - | [packages/core/src/runtime/usage-limits.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L208) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L207) |
| <a id="property-toolbudgetextension"></a> `toolBudgetExtension?` | \{ `coverEvidenceDeficit?`: `boolean`; `increment`: `number`; `maxExtensions`: `number`; `minHeadroomUsd?`: `number`; `requireNewEvidence?`: `boolean`; \} | - | [packages/core/src/runtime/usage-limits.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L220) |
| `toolBudgetExtension.coverEvidenceDeficit?` | `boolean` | RV809: grant at the boundary when remaining calls cannot cover the evidence deficit. | [packages/core/src/runtime/usage-limits.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L226) |
| `toolBudgetExtension.increment` | `number` | - | [packages/core/src/runtime/usage-limits.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L221) |
| `toolBudgetExtension.maxExtensions` | `number` | - | [packages/core/src/runtime/usage-limits.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L222) |
| `toolBudgetExtension.minHeadroomUsd?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L223) |
| `toolBudgetExtension.requireNewEvidence?` | `boolean` | - | [packages/core/src/runtime/usage-limits.ts:224](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L224) |
| <a id="property-toolbudgetnotices"></a> `toolBudgetNotices?` | `boolean` | RV-210 exploration guards; absent = off. | [packages/core/src/runtime/usage-limits.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L212) |
| <a id="property-toolunits"></a> `toolUnits?` | \{ `costs?`: `Record`\&lt;`string`, `number`\&gt;; `max`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L216) |
| `toolUnits.costs?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L216) |
| `toolUnits.max` | `number` | - | [packages/core/src/runtime/usage-limits.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L216) |
