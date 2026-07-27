[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectiveUsageLimits

# Interface: EffectiveUsageLimits

Defined in: [packages/core/src/runtime/usage-limits.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L125)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-finalizationreserve"></a> `finalizationReserve?` | \{ `maxOutputTokens?`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L139) |
| `finalizationReserve.maxOutputTokens?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L139) |
| <a id="property-maxcallspertool"></a> `maxCallsPerTool?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L137) |
| <a id="property-maxnonewevidencecalls"></a> `maxNoNewEvidenceCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L136) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L128) |
| <a id="property-maxrepeatedtoolsignature"></a> `maxRepeatedToolSignature?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L135) |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L127) |
| <a id="property-maxturns"></a> `maxTurns` | `number` | - | [packages/core/src/runtime/usage-limits.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L126) |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | Default DEFAULT_NO_PROGRESS_TURNS. | [packages/core/src/runtime/usage-limits.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L132) |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs` | `number` | - | [packages/core/src/runtime/usage-limits.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L130) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L129) |
| <a id="property-toolbudgetextension"></a> `toolBudgetExtension?` | \{ `increment`: `number`; `maxExtensions`: `number`; `minHeadroomUsd?`: `number`; `requireNewEvidence?`: `boolean`; \} | - | [packages/core/src/runtime/usage-limits.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L140) |
| `toolBudgetExtension.increment` | `number` | - | [packages/core/src/runtime/usage-limits.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L141) |
| `toolBudgetExtension.maxExtensions` | `number` | - | [packages/core/src/runtime/usage-limits.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L142) |
| `toolBudgetExtension.minHeadroomUsd?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L143) |
| `toolBudgetExtension.requireNewEvidence?` | `boolean` | - | [packages/core/src/runtime/usage-limits.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L144) |
| <a id="property-toolbudgetnotices"></a> `toolBudgetNotices?` | `boolean` | RV-210 exploration guards; absent = off. | [packages/core/src/runtime/usage-limits.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L134) |
| <a id="property-toolunits"></a> `toolUnits?` | \{ `costs?`: `Record`\&lt;`string`, `number`\&gt;; `max`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L138) |
| `toolUnits.costs?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L138) |
| `toolUnits.max` | `number` | - | [packages/core/src/runtime/usage-limits.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L138) |
