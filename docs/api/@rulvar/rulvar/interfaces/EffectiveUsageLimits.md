[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectiveUsageLimits

# Interface: EffectiveUsageLimits

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-maxcallspertool"></a> `maxCallsPerTool?` | `Record`\&lt;`string`, `number`\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-maxnonewevidencecalls"></a> `maxNoNewEvidenceCalls?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-maxrepeatedtoolsignature"></a> `maxRepeatedToolSignature?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-maxturns"></a> `maxTurns` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | Default DEFAULT_NO_PROGRESS_TURNS. | `packages/core/dist/index.d.ts` |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-toolbudgetnotices"></a> `toolBudgetNotices?` | `boolean` | RV-210 exploration guards; absent = off. | `packages/core/dist/index.d.ts` |
| <a id="property-toolunits"></a> `toolUnits?` | \{ `costs?`: `Record`\&lt;`string`, `number`\&gt;; `max`: `number`; \} | - | `packages/core/dist/index.d.ts` |
| `toolUnits.costs?` | `Record`\&lt;`string`, `number`\&gt; | - | `packages/core/dist/index.d.ts` |
| `toolUnits.max` | `number` | - | `packages/core/dist/index.d.ts` |
