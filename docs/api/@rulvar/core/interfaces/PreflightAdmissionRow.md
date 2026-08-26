[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:503](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L503)

One wave entry of the admission projection.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | - | [packages/core/src/engine/preflight.ts:506](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L506) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | - | [packages/core/src/engine/preflight.ts:507](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L507) |
| <a id="property-heldatevaluationusd"></a> `heldAtEvaluationUsd?` | `number` | The run-root money already held when this row was evaluated: committed reserves of the earlier rows plus the finalization and synthesis carve-outs (RV1901). The row admits iff held + reserveUsd fits the ceiling (children strictly below it at exact fill), so a denied row's arithmetic is auditable term by term. Present only under a USD ceiling. | [packages/core/src/engine/preflight.ts:516](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L516) |
| <a id="property-label"></a> `label` | `string` | - | [packages/core/src/engine/preflight.ts:504](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L504) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | - | [packages/core/src/engine/preflight.ts:505](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L505) |
