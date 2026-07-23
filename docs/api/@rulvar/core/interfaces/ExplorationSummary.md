[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ExplorationSummary

# Interface: ExplorationSummary

Defined in: [packages/core/src/l0/events.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L80)

The structured exploration summary (RV-210): the engine-side tool
exploration counters for one agent invocation. Attached to the full
AgentResult and to the live `agent:end` event whenever any exploration
guard limit is configured; journaled inside the terminal error payload
(and therefore restored on replay) only when the guard itself ended
the invocation (abortClass 'exploration').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-bytool"></a> `byTool` | `Record`\&lt;`string`, `number`\&gt; | Executions per tool name. | [packages/core/src/l0/events.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L92) |
| <a id="property-deniedrepeats"></a> `deniedRepeats` | `number` | Calls denied by the repeated-signature guard (never dispatched). | [packages/core/src/l0/events.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L90) |
| <a id="property-distinctsignatures"></a> `distinctSignatures` | `number` | Distinct (tool name, canonical args) signatures executed. | [packages/core/src/l0/events.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L84) |
| <a id="property-duplicateresultcalls"></a> `duplicateResultCalls` | `number` | Successful executions whose result digest was already seen. | [packages/core/src/l0/events.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L88) |
| <a id="property-repeatedcalls"></a> `repeatedCalls` | `number` | Executions of a signature that had already executed before. | [packages/core/src/l0/events.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L86) |
| <a id="property-toolcallsused"></a> `toolCallsUsed` | `number` | Tool executions dispatched by the loop (the loop's own counter). | [packages/core/src/l0/events.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L82) |
