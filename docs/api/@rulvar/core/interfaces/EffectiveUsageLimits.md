[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectiveUsageLimits

# Interface: EffectiveUsageLimits

Defined in: [packages/core/src/runtime/usage-limits.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L148)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-finalizationreserve"></a> `finalizationReserve?` | \{ `maxOutputTokens?`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L162) |
| `finalizationReserve.maxOutputTokens?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L162) |
| <a id="property-finalizationwindow"></a> `finalizationWindow?` | \{ `allow?`: `string`[]; `reserveCalls`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L169) |
| `finalizationWindow.allow?` | `string`[] | - | [packages/core/src/runtime/usage-limits.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L171) |
| `finalizationWindow.reserveCalls` | `number` | - | [packages/core/src/runtime/usage-limits.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L170) |
| <a id="property-maxcallspertool"></a> `maxCallsPerTool?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L160) |
| <a id="property-maxnonewevidencecalls"></a> `maxNoNewEvidenceCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L159) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L151) |
| <a id="property-maxrepeatedtoolsignature"></a> `maxRepeatedToolSignature?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L158) |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L150) |
| <a id="property-maxturns"></a> `maxTurns` | `number` | - | [packages/core/src/runtime/usage-limits.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L149) |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | Default DEFAULT_NO_PROGRESS_TURNS. | [packages/core/src/runtime/usage-limits.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L155) |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs` | `number` | - | [packages/core/src/runtime/usage-limits.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L153) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L152) |
| <a id="property-toolbudgetextension"></a> `toolBudgetExtension?` | \{ `increment`: `number`; `maxExtensions`: `number`; `minHeadroomUsd?`: `number`; `requireNewEvidence?`: `boolean`; \} | - | [packages/core/src/runtime/usage-limits.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L163) |
| `toolBudgetExtension.increment` | `number` | - | [packages/core/src/runtime/usage-limits.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L164) |
| `toolBudgetExtension.maxExtensions` | `number` | - | [packages/core/src/runtime/usage-limits.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L165) |
| `toolBudgetExtension.minHeadroomUsd?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L166) |
| `toolBudgetExtension.requireNewEvidence?` | `boolean` | - | [packages/core/src/runtime/usage-limits.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L167) |
| <a id="property-toolbudgetnotices"></a> `toolBudgetNotices?` | `boolean` | RV-210 exploration guards; absent = off. | [packages/core/src/runtime/usage-limits.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L157) |
| <a id="property-toolunits"></a> `toolUnits?` | \{ `costs?`: `Record`\&lt;`string`, `number`\&gt;; `max`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L161) |
| `toolUnits.costs?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L161) |
| `toolUnits.max` | `number` | - | [packages/core/src/runtime/usage-limits.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L161) |
