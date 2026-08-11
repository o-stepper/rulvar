[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolCalibrationRow

# Interface: ToolCalibrationRow

Defined in: [packages/core/src/stores/tool-calibration.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L28)

One dispatch carrying BOTH sides of the calibration pair (RV3003).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | The profile the dispatch ran under, when the terminal recorded it. | [packages/core/src/stores/tool-calibration.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L34) |
| <a id="property-callsperentry"></a> `callsPerEntry?` | `number` | `toolCallsUsed / recordedEntries`; absent when recordedEntries is 0. | [packages/core/src/stores/tool-calibration.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L44) |
| <a id="property-handle"></a> `handle` | `number` | The dispatch seq (the terminal's `ref`): the child's handle. | [packages/core/src/stores/tool-calibration.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L32) |
| <a id="property-minentries"></a> `minEntries` | `number` | The declared floor the verdict was judged against. | [packages/core/src/stores/tool-calibration.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L40) |
| <a id="property-recordedentries"></a> `recordedEntries` | `number` | Successful `record_evidence` executions the RV806 verdict counted. | [packages/core/src/stores/tool-calibration.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L38) |
| <a id="property-scope"></a> `scope` | `string` | The scope the dispatch journaled under. | [packages/core/src/stores/tool-calibration.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L30) |
| <a id="property-status"></a> `status` | `string` | The journaled terminal status. | [packages/core/src/stores/tool-calibration.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L36) |
| <a id="property-toolcallsused"></a> `toolCallsUsed` | `number` | Executed tool calls the RV3002 terminal subset journaled. | [packages/core/src/stores/tool-calibration.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/tool-calibration.ts#L42) |
