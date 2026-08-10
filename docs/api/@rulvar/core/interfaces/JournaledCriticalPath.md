[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournaledCriticalPath

# Interface: JournaledCriticalPath

Defined in: [packages/core/src/stores/critical-path.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L40)

The critical path of a logical run, folded from its journal (RV2803).

The live reading is [reduceCriticalPath](/api/@rulvar/core/functions/reduceCriticalPath.md); this is the same
question asked of what survived the process. Fields are absent where
the journal cannot answer, never zero.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-finalcompositionms"></a> `finalCompositionMs?` | `number` | Synthesis that is NOT the claim judge (RV1604). Present only when EVERY synthesize span in the journal carried a label: one unlabelled span would make the split a guess, and the split exists because a guess here read a 54 second judge as a second final composition. | [packages/core/src/stores/critical-path.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L72) |
| <a id="property-postfaninms"></a> `postFanInMs?` | `number` | Last worker settle to the end of the run; same condition. | [packages/core/src/stores/critical-path.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L60) |
| <a id="property-postfaninshare"></a> `postFanInShare?` | `number` | `postFanInMs / runWallMs`, the RV2210 target's own quantity. | [packages/core/src/stores/critical-path.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L62) |
| <a id="property-runwallms"></a> `runWallMs?` | `number` | First stamp to last, absent unless the journal holds ONE segment. | [packages/core/src/stores/critical-path.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L58) |
| <a id="property-segments"></a> `segments` | `number` | How many segments the journal holds; the wall figures need one. | [packages/core/src/stores/critical-path.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L56) |
| <a id="property-semanticjudgems"></a> `semanticJudgeMs?` | `number` | Synthesis that IS the claim judge; same all-or-nothing condition. | [packages/core/src/stores/critical-path.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L74) |
| <a id="property-synthesisms"></a> `synthesisMs` | `number` | Summed wall of settled `'synthesize'` spans. | [packages/core/src/stores/critical-path.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L47) |
| <a id="property-synthesisshare"></a> `synthesisShare?` | `number` | `synthesisMs / runWallMs`, under the same conditions. | [packages/core/src/stores/critical-path.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L64) |
| <a id="property-unclassifiedspans"></a> `unclassifiedSpans` | `number` | Settled agent spans whose entry records no role, so this fold could not classify them (a journal older than the attribution facts). Nonzero means the counts above are a floor, and saying so is the whole point of the field. | [packages/core/src/stores/critical-path.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L54) |
| <a id="property-workerspans"></a> `workerSpans` | `number` | Settled agent spans that were neither coordination nor synthesis: the fan-out this run actually paid for. | [packages/core/src/stores/critical-path.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L45) |
