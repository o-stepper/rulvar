[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolCalibrationReport

# Interface: ToolCalibrationReport

Defined in: [packages/core/src/stores/tool-calibration.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L55)

The observed calls-per-evidence-entry calibration of one journal (RV3003).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-aggregate"></a> `aggregate?` | \{ `callsPerEntry?`: `number`; `recordedEntries`: `number`; `toolCallsUsed`: `number`; \} | The observed aggregate over `observed` rows: summed executed calls against summed recorded entries, with the rate absent when the entry sum is 0. Absent entirely when no row paired. | [packages/core/src/stores/tool-calibration.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L65) |
| `aggregate.callsPerEntry?` | `number` | - | [packages/core/src/stores/tool-calibration.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L65) |
| `aggregate.recordedEntries` | `number` | - | [packages/core/src/stores/tool-calibration.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L65) |
| `aggregate.toolCallsUsed` | `number` | - | [packages/core/src/stores/tool-calibration.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L65) |
| <a id="property-budgetonly"></a> `budgetOnly` | [`ToolCalibrationExclusion`](/api/@rulvar/core/interfaces/ToolCalibrationExclusion.md)[] | A journaled counter with no declared contract: nothing to divide by. | [packages/core/src/stores/tool-calibration.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L69) |
| <a id="property-coordination"></a> `coordination?` | \{ `dispatches`: `number`; `toolCallsUsed`: `number`; \} | The coordination side's own executed tool calls (RV4010, the fifth comparison experiment): terminal dispatches whose recorded role is 'orchestrate' or 'synthesize' with the RV3002 counter journaled. The experiment's telemetry counted 407 tool starts against 390 worker calls and the 17-call remainder (the coordination loop's spawn/await/finish exchanges and the composition's finish) had no bucket to live in, so the gap had to be explained by hand. Workers' counters plus this bucket now account for the run's executed tool calls; coordination dispatches never carry an evidence contract, so before RV4010 they drowned in `budgetOnly` as if a declared contract had lost its pair. Absent when the journal holds no counted coordination dispatch, so every such report keeps its bytes. | [packages/core/src/stores/tool-calibration.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L87) |
| `coordination.dispatches` | `number` | - | [packages/core/src/stores/tool-calibration.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L87) |
| `coordination.toolCallsUsed` | `number` | - | [packages/core/src/stores/tool-calibration.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L87) |
| <a id="property-dispatches"></a> `dispatches` | `number` | Terminal agent dispatches the journal holds, the partition's whole. | [packages/core/src/stores/tool-calibration.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L57) |
| <a id="property-evidenceonly"></a> `evidenceOnly` | [`ToolCalibrationExclusion`](/api/@rulvar/core/interfaces/ToolCalibrationExclusion.md)[] | A declared contract whose counter was never journaled (pre-RV3002 journals). | [packages/core/src/stores/tool-calibration.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L67) |
| <a id="property-observed"></a> `observed` | [`ToolCalibrationRow`](/api/@rulvar/core/interfaces/ToolCalibrationRow.md)[] | Dispatches carrying both the verdict and the counter, in seq order. | [packages/core/src/stores/tool-calibration.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L59) |
| <a id="property-unobserved"></a> `unobserved` | `number` | Dispatches carrying neither side. | [packages/core/src/stores/tool-calibration.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L71) |
