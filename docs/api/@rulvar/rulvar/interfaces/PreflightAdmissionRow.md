[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: `packages/core/dist/index.d.ts`

One wave entry of the admission projection.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-heldatevaluationusd"></a> `heldAtEvaluationUsd?` | `number` | The run-root money already held when this row was evaluated: committed reserves of the earlier rows plus the finalization and synthesis carve-outs (RV1901). The row admits iff held + reserveUsd fits the ceiling (children strictly below it at exact fill), so a denied row's arithmetic is auditable term by term. Present only under a USD ceiling. | `packages/core/dist/index.d.ts` |
| <a id="property-label"></a> `label` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | - | `packages/core/dist/index.d.ts` |
