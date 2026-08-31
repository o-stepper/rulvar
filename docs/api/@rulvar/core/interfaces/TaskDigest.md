[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TaskDigest

# Interface: TaskDigest

Defined in: [packages/core/src/orchestrator/handles.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L22)

The per-child digest handed to the orchestrator.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifactsindex"></a> `artifactsIndex` | `string`[] | - | [packages/core/src/orchestrator/handles.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L28) |
| <a id="property-costusd"></a> `costUsd` | `number` | - | [packages/core/src/orchestrator/handles.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L27) |
| <a id="property-facts"></a> `facts?` | [`ChildExecutionFacts`](/api/@rulvar/core/interfaces/ChildExecutionFacts.md) | The child's replay-stable execution facts (RV1503), present only under the `executionFacts` opt-in: what the run itself observed, so the composing root can grade `live-observed` honestly instead of erasing its own run. See [executionFactsOf](/api/@rulvar/core/functions/executionFactsOf.md). | [packages/core/src/orchestrator/handles.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L55) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/core/src/orchestrator/handles.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L24) |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | [packages/core/src/orchestrator/handles.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L23) |
| <a id="property-outputsummary"></a> `outputSummary` | `string` | - | [packages/core/src/orchestrator/handles.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L26) |
| <a id="property-settledhandles"></a> `settledHandles?` | `number`[] | On `await_any` digests (RV1807): the settled subset of the WAITED handle set at return time, the race winner included. The nineteenth benchmark's root probed handles with speculative `get_child_result` calls and collected eight not-settled errors; this list is the exact consume set, so probing is never needed. | [packages/core/src/orchestrator/handles.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L63) |
| <a id="property-status"></a> `status` | `string` | - | [packages/core/src/orchestrator/handles.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L25) |
| <a id="property-toolbudget"></a> `toolBudget?` | \{ `cap?`: `number`; `capHit?`: `boolean`; `extensionsGranted?`: `number`; `finalizationWindowEntered?`: `boolean`; `used`: `number`; \} | The child's tool budget pressure, the replay-stable subset only (RV4807, the ninth experiment: a specialist starved at 30 of 30 tool calls and the coordinator could not see it at await, so nothing respawned or accepted the degradation knowingly). Present exactly when the child ran under a tool budget: `used` and `cap` are the durable pair the terminal journals (RV3002), `extensionsGranted` and `finalizationWindowEntered` ride their decision entries, and `capHit` is derived from the durable pair (true when the executed-call cap was reached). The live-only fidelity fields (units, notices, limiter) stay out: a digest must fold byte-identically live and resumed. | [packages/core/src/orchestrator/handles.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L42) |
| `toolBudget.cap?` | `number` | - | [packages/core/src/orchestrator/handles.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L44) |
| `toolBudget.capHit?` | `boolean` | - | [packages/core/src/orchestrator/handles.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L45) |
| `toolBudget.extensionsGranted?` | `number` | - | [packages/core/src/orchestrator/handles.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L46) |
| `toolBudget.finalizationWindowEntered?` | `boolean` | - | [packages/core/src/orchestrator/handles.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L47) |
| `toolBudget.used` | `number` | - | [packages/core/src/orchestrator/handles.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L43) |
