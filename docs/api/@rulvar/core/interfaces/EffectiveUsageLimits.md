[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectiveUsageLimits

# Interface: EffectiveUsageLimits

Defined in: [packages/core/src/runtime/usage-limits.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L98)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-finalizationreserve"></a> `finalizationReserve?` | \{ `maxOutputTokens?`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L112) |
| `finalizationReserve.maxOutputTokens?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L112) |
| <a id="property-maxcallspertool"></a> `maxCallsPerTool?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L110) |
| <a id="property-maxnonewevidencecalls"></a> `maxNoNewEvidenceCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L109) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L101) |
| <a id="property-maxrepeatedtoolsignature"></a> `maxRepeatedToolSignature?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L108) |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L100) |
| <a id="property-maxturns"></a> `maxTurns` | `number` | - | [packages/core/src/runtime/usage-limits.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L99) |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | Default DEFAULT_NO_PROGRESS_TURNS. | [packages/core/src/runtime/usage-limits.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L105) |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs` | `number` | - | [packages/core/src/runtime/usage-limits.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L103) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L102) |
| <a id="property-toolbudgetnotices"></a> `toolBudgetNotices?` | `boolean` | RV-210 exploration guards; absent = off. | [packages/core/src/runtime/usage-limits.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L107) |
| <a id="property-toolunits"></a> `toolUnits?` | \{ `costs?`: `Record`\&lt;`string`, `number`\&gt;; `max`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L111) |
| `toolUnits.costs?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L111) |
| `toolUnits.max` | `number` | - | [packages/core/src/runtime/usage-limits.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L111) |
