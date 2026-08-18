[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:468](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L468)

One wave entry of the admission projection.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | - | [packages/core/src/engine/preflight.ts:471](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L471) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | - | [packages/core/src/engine/preflight.ts:472](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L472) |
| <a id="property-heldatevaluationusd"></a> `heldAtEvaluationUsd?` | `number` | The run-root money already held when this row was evaluated: committed reserves of the earlier rows plus the finalization and synthesis carve-outs (RV1901). The row admits iff held + reserveUsd fits the ceiling (children strictly below it at exact fill), so a denied row's arithmetic is auditable term by term. Present only under a USD ceiling. | [packages/core/src/engine/preflight.ts:481](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L481) |
| <a id="property-label"></a> `label` | `string` | - | [packages/core/src/engine/preflight.ts:469](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L469) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | - | [packages/core/src/engine/preflight.ts:470](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L470) |
