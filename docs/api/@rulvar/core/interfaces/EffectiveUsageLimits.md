[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectiveUsageLimits

# Interface: EffectiveUsageLimits

Defined in: [packages/core/src/runtime/usage-limits.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L172)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-checkpointeverytoolcalls"></a> `checkpointEveryToolCalls?` | `number` | RV408 mid-batch checkpoint cadence; absent = per-turn only. | [packages/core/src/runtime/usage-limits.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L187) |
| <a id="property-finalizationreserve"></a> `finalizationReserve?` | \{ `maxOutputTokens?`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L188) |
| `finalizationReserve.maxOutputTokens?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L188) |
| <a id="property-finalizationwindow"></a> `finalizationWindow?` | \{ `allow?`: `string`[]; `reserveCalls`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L195) |
| `finalizationWindow.allow?` | `string`[] | - | [packages/core/src/runtime/usage-limits.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L197) |
| `finalizationWindow.reserveCalls` | `number` | - | [packages/core/src/runtime/usage-limits.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L196) |
| <a id="property-maxcallspertool"></a> `maxCallsPerTool?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L184) |
| <a id="property-maxnonewevidencecalls"></a> `maxNoNewEvidenceCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L183) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L175) |
| <a id="property-maxrepeatedtoolsignature"></a> `maxRepeatedToolSignature?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L182) |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L174) |
| <a id="property-maxturns"></a> `maxTurns` | `number` | - | [packages/core/src/runtime/usage-limits.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L173) |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | Default DEFAULT_NO_PROGRESS_TURNS. | [packages/core/src/runtime/usage-limits.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L179) |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs` | `number` | - | [packages/core/src/runtime/usage-limits.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L177) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L176) |
| <a id="property-toolbudgetextension"></a> `toolBudgetExtension?` | \{ `increment`: `number`; `maxExtensions`: `number`; `minHeadroomUsd?`: `number`; `requireNewEvidence?`: `boolean`; \} | - | [packages/core/src/runtime/usage-limits.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L189) |
| `toolBudgetExtension.increment` | `number` | - | [packages/core/src/runtime/usage-limits.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L190) |
| `toolBudgetExtension.maxExtensions` | `number` | - | [packages/core/src/runtime/usage-limits.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L191) |
| `toolBudgetExtension.minHeadroomUsd?` | `number` | - | [packages/core/src/runtime/usage-limits.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L192) |
| `toolBudgetExtension.requireNewEvidence?` | `boolean` | - | [packages/core/src/runtime/usage-limits.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L193) |
| <a id="property-toolbudgetnotices"></a> `toolBudgetNotices?` | `boolean` | RV-210 exploration guards; absent = off. | [packages/core/src/runtime/usage-limits.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L181) |
| <a id="property-toolunits"></a> `toolUnits?` | \{ `costs?`: `Record`\&lt;`string`, `number`\&gt;; `max`: `number`; \} | - | [packages/core/src/runtime/usage-limits.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L185) |
| `toolUnits.costs?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/runtime/usage-limits.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L185) |
| `toolUnits.max` | `number` | - | [packages/core/src/runtime/usage-limits.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L185) |
