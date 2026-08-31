[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / TaskDigest

# Interface: TaskDigest

Defined in: `packages/core/dist/index.d.ts`

The per-child digest handed to the orchestrator.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifactsindex"></a> `artifactsIndex` | `string`[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-costusd"></a> `costUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-facts"></a> `facts?` | [`ChildExecutionFacts`](/api/@rulvar/rulvar/interfaces/ChildExecutionFacts.md) | The child's replay-stable execution facts (RV1503), present only under the `executionFacts` opt-in: what the run itself observed, so the composing root can grade `live-observed` honestly instead of erasing its own run. See [executionFactsOf](/api/@rulvar/rulvar/functions/executionFactsOf.md). | `packages/core/dist/index.d.ts` |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-outputsummary"></a> `outputSummary` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-settledhandles"></a> `settledHandles?` | `number`[] | On `await_any` digests (RV1807): the settled subset of the WAITED handle set at return time, the race winner included. The nineteenth benchmark's root probed handles with speculative `get_child_result` calls and collected eight not-settled errors; this list is the exact consume set, so probing is never needed. | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-toolbudget"></a> `toolBudget?` | \{ `cap?`: `number`; `capHit?`: `boolean`; `extensionsGranted?`: `number`; `finalizationWindowEntered?`: `boolean`; `used`: `number`; \} | The child's tool budget pressure, the replay-stable subset only (RV4807, the ninth experiment: a specialist starved at 30 of 30 tool calls and the coordinator could not see it at await, so nothing respawned or accepted the degradation knowingly). Present exactly when the child ran under a tool budget: `used` and `cap` are the durable pair the terminal journals (RV3002), `extensionsGranted` and `finalizationWindowEntered` ride their decision entries, and `capHit` is derived from the durable pair (true when the executed-call cap was reached). The live-only fidelity fields (units, notices, limiter) stay out: a digest must fold byte-identically live and resumed. | `packages/core/dist/index.d.ts` |
| `toolBudget.cap?` | `number` | - | `packages/core/dist/index.d.ts` |
| `toolBudget.capHit?` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `toolBudget.extensionsGranted?` | `number` | - | `packages/core/dist/index.d.ts` |
| `toolBudget.finalizationWindowEntered?` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `toolBudget.used` | `number` | - | `packages/core/dist/index.d.ts` |
