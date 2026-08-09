[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ExplorationSummary

# Interface: ExplorationSummary

Defined in: [packages/core/src/l0/events.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L205)

The structured exploration summary (RV-210): the engine-side tool
exploration counters for one agent invocation. Attached to the full
AgentResult and to the live `agent:end` event whenever any exploration
guard limit is configured; journaled inside the terminal error payload
(and therefore restored on replay) only when the guard itself ended
the invocation (abortClass 'exploration').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-bytool"></a> `byTool` | `Record`\&lt;`string`, `number`\&gt; | Executions per tool name. | [packages/core/src/l0/events.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L217) |
| <a id="property-deniedrepeats"></a> `deniedRepeats` | `number` | Calls denied by the repeated-signature guard (never dispatched). | [packages/core/src/l0/events.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L215) |
| <a id="property-deniedtoolcap"></a> `deniedToolCap?` | `number` | Calls denied by maxCallsPerTool; present when that limit is configured. | [packages/core/src/l0/events.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L219) |
| <a id="property-distinctsignatures"></a> `distinctSignatures` | `number` | Distinct (tool name, canonical args) signatures executed. | [packages/core/src/l0/events.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L209) |
| <a id="property-duplicateresultcalls"></a> `duplicateResultCalls` | `number` | Successful executions whose result digest was already seen. | [packages/core/src/l0/events.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L213) |
| <a id="property-repeatedcalls"></a> `repeatedCalls` | `number` | Executions of a signature that had already executed before. | [packages/core/src/l0/events.ts:211](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L211) |
| <a id="property-toolcallsused"></a> `toolCallsUsed` | `number` | Tool executions dispatched by the loop (the loop's own counter). | [packages/core/src/l0/events.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L207) |
| <a id="property-toolunitsused"></a> `toolUnitsUsed?` | `number` | Weighted tool units spent; present when toolUnits is configured. | [packages/core/src/l0/events.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L221) |
