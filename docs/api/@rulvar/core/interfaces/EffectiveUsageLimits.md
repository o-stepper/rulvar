[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectiveUsageLimits

# Interface: EffectiveUsageLimits

Defined in: [packages/core/src/runtime/usage-limits.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L228)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-checkpointeverytoolcalls"></a> `checkpointEveryToolCalls?` | `number` | RV408 mid-batch checkpoint cadence; absent = per-turn only. | [packages/core/src/runtime/usage-limits.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L243) |
| <a id="property-finalizationreserve"></a> `finalizationReserve?` | \{ `maxOutputTokens?`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L244) |
| `finalizationReserve.maxOutputTokens?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L244) |
| <a id="property-finalizationturns"></a> `finalizationTurns?` | \{ `allow?`: `string`[]; `reserveTurns`: `number`; \} | RV1405: the trailing turns of maxTurns reserved for the finalization regime. | [packages/core/src/runtime/usage-limits.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L260) |
| `finalizationTurns.allow?` | `string`[] | - | [packages/core/src/runtime/usage-limits.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L262) |
| `finalizationTurns.reserveTurns` | `number` | - | [packages/core/src/runtime/usage-limits.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L261) |
| <a id="property-finalizationwindow"></a> `finalizationWindow?` | \{ `allow?`: `string`[]; `reserveCalls`: `number`; `reserveForEvidenceDeficit?`: `boolean`; \} | - | [packages/core/src/runtime/usage-limits.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L253) |
| `finalizationWindow.allow?` | `string`[] | - | [packages/core/src/runtime/usage-limits.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L255) |
| `finalizationWindow.reserveCalls` | `number` | - | [packages/core/src/runtime/usage-limits.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L254) |
| `finalizationWindow.reserveForEvidenceDeficit?` | `boolean` | RV1208: widen the reserve to the outstanding evidence deficit plus the summary. | [packages/core/src/runtime/usage-limits.ts:257](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L257) |
| <a id="property-maxcallspertool"></a> `maxCallsPerTool?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L240) |
| <a id="property-maxnonewevidencecalls"></a> `maxNoNewEvidenceCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L239) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:231](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L231) |
| <a id="property-maxrepeatedtoolsignature"></a> `maxRepeatedToolSignature?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L238) |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L230) |
| <a id="property-maxturns"></a> `maxTurns` | `number` | - | [packages/core/src/runtime/usage-limits.ts:229](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L229) |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | Default DEFAULT_NO_PROGRESS_TURNS. | [packages/core/src/runtime/usage-limits.ts:235](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L235) |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs` | `number` | - | [packages/core/src/runtime/usage-limits.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L233) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L232) |
| <a id="property-toolbudgetextension"></a> `toolBudgetExtension?` | \{ `coverEvidenceDeficit?`: `boolean`; `increment`: `number`; `maxExtensions`: `number`; `minHeadroomUsd?`: `number`; `requireNewEvidence?`: `boolean`; \} | - | [packages/core/src/runtime/usage-limits.ts:245](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L245) |
| `toolBudgetExtension.coverEvidenceDeficit?` | `boolean` | RV809: grant at the boundary when remaining calls cannot cover the evidence deficit. | [packages/core/src/runtime/usage-limits.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L251) |
| `toolBudgetExtension.increment` | `number` | - | [packages/core/src/runtime/usage-limits.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L246) |
| `toolBudgetExtension.maxExtensions` | `number` | - | [packages/core/src/runtime/usage-limits.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L247) |
| `toolBudgetExtension.minHeadroomUsd?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L248) |
| `toolBudgetExtension.requireNewEvidence?` | `boolean` | - | [packages/core/src/runtime/usage-limits.ts:249](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L249) |
| <a id="property-toolbudgetnotices"></a> `toolBudgetNotices?` | `boolean` | RV-210 exploration guards; absent = off. | [packages/core/src/runtime/usage-limits.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L237) |
| <a id="property-toolunits"></a> `toolUnits?` | \{ `costs?`: `Record`\&lt;`string`, `number`\&gt;; `max`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L241) |
| `toolUnits.costs?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L241) |
| `toolUnits.max` | `number` | - | [packages/core/src/runtime/usage-limits.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L241) |
