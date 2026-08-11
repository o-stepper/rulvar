[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolCalibrationRow

# Interface: ToolCalibrationRow

Defined in: `packages/core/dist/index.d.ts`

One dispatch carrying BOTH sides of the calibration pair (RV3003).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | The profile the dispatch ran under, when the terminal recorded it. | `packages/core/dist/index.d.ts` |
| <a id="property-callsperentry"></a> `callsPerEntry?` | `number` | `toolCallsUsed / recordedEntries`; absent when recordedEntries is 0. | `packages/core/dist/index.d.ts` |
| <a id="property-handle"></a> `handle` | `number` | The dispatch seq (the terminal's `ref`): the child's handle. | `packages/core/dist/index.d.ts` |
| <a id="property-minentries"></a> `minEntries` | `number` | The declared floor the verdict was judged against. | `packages/core/dist/index.d.ts` |
| <a id="property-recordedentries"></a> `recordedEntries` | `number` | Successful `record_evidence` executions the RV806 verdict counted. | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope` | `string` | The scope the dispatch journaled under. | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status` | `string` | The journaled terminal status. | `packages/core/dist/index.d.ts` |
| <a id="property-toolcallsused"></a> `toolCallsUsed` | `number` | Executed tool calls the RV3002 terminal subset journaled. | `packages/core/dist/index.d.ts` |
