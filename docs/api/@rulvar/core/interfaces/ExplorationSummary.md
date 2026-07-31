[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ExplorationSummary

# Interface: ExplorationSummary

Defined in: [packages/core/src/l0/events.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L120)

The structured exploration summary (RV-210): the engine-side tool
exploration counters for one agent invocation. Attached to the full
AgentResult and to the live `agent:end` event whenever any exploration
guard limit is configured; journaled inside the terminal error payload
(and therefore restored on replay) only when the guard itself ended
the invocation (abortClass 'exploration').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-bytool"></a> `byTool` | `Record`\&lt;`string`, `number`\&gt; | Executions per tool name. | [packages/core/src/l0/events.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L132) |
| <a id="property-deniedrepeats"></a> `deniedRepeats` | `number` | Calls denied by the repeated-signature guard (never dispatched). | [packages/core/src/l0/events.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L130) |
| <a id="property-deniedtoolcap"></a> `deniedToolCap?` | `number` | Calls denied by maxCallsPerTool; present when that limit is configured. | [packages/core/src/l0/events.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L134) |
| <a id="property-distinctsignatures"></a> `distinctSignatures` | `number` | Distinct (tool name, canonical args) signatures executed. | [packages/core/src/l0/events.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L124) |
| <a id="property-duplicateresultcalls"></a> `duplicateResultCalls` | `number` | Successful executions whose result digest was already seen. | [packages/core/src/l0/events.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L128) |
| <a id="property-repeatedcalls"></a> `repeatedCalls` | `number` | Executions of a signature that had already executed before. | [packages/core/src/l0/events.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L126) |
| <a id="property-toolcallsused"></a> `toolCallsUsed` | `number` | Tool executions dispatched by the loop (the loop's own counter). | [packages/core/src/l0/events.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L122) |
| <a id="property-toolunitsused"></a> `toolUnitsUsed?` | `number` | Weighted tool units spent; present when toolUnits is configured. | [packages/core/src/l0/events.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L136) |
