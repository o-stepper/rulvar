[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectiveUsageLimits

# Interface: EffectiveUsageLimits

Defined in: [packages/core/src/runtime/usage-limits.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L82)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-maxcallspertool"></a> `maxCallsPerTool?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L94) |
| <a id="property-maxnonewevidencecalls"></a> `maxNoNewEvidenceCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L93) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L85) |
| <a id="property-maxrepeatedtoolsignature"></a> `maxRepeatedToolSignature?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L92) |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L84) |
| <a id="property-maxturns"></a> `maxTurns` | `number` | - | [packages/core/src/runtime/usage-limits.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L83) |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | Default DEFAULT_NO_PROGRESS_TURNS. | [packages/core/src/runtime/usage-limits.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L89) |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs` | `number` | - | [packages/core/src/runtime/usage-limits.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L87) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L86) |
| <a id="property-toolbudgetnotices"></a> `toolBudgetNotices?` | `boolean` | RV-210 exploration guards; absent = off. | [packages/core/src/runtime/usage-limits.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L91) |
| <a id="property-toolunits"></a> `toolUnits?` | \{ `costs?`: `Record`\&lt;`string`, `number`\&gt;; `max`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L95) |
| `toolUnits.costs?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L95) |
| `toolUnits.max` | `number` | - | [packages/core/src/runtime/usage-limits.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L95) |
