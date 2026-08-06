[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:344](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L344)

One wave entry of the admission projection.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | - | [packages/core/src/engine/preflight.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L347) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | - | [packages/core/src/engine/preflight.ts:348](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L348) |
| <a id="property-heldatevaluationusd"></a> `heldAtEvaluationUsd?` | `number` | The run-root money already held when this row was evaluated: committed reserves of the earlier rows plus the finalization and synthesis carve-outs (RV1901). The row admits iff held + reserveUsd fits the ceiling (children strictly below it at exact fill), so a denied row's arithmetic is auditable term by term. Present only under a USD ceiling. | [packages/core/src/engine/preflight.ts:357](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L357) |
| <a id="property-label"></a> `label` | `string` | - | [packages/core/src/engine/preflight.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L345) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | - | [packages/core/src/engine/preflight.ts:346](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L346) |
