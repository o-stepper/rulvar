[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanReviseResult

# Interface: PlanReviseResult

Defined in: [packages/plan/src/plan-entries.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L130)

The canonical result form (XF-11): DEF-8 shape plus the DEF-2 balance.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-assignednodeids"></a> `assignedNodeIds` | `Record`\&lt;`number`, [`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md)\&gt; | - | [packages/plan/src/plan-entries.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L139) |
| <a id="property-droppedall"></a> `droppedAll` | `boolean` | - | [packages/plan/src/plan-entries.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L141) |
| <a id="property-outcomes"></a> `outcomes` | [`RebaseOutcome`](/api/@rulvar/plan/type-aliases/RebaseOutcome.md) & \{ `verdictReason?`: AdmitRejectReason \| undefined; \}[] | Journaled outcomes, enriched IN THE RESULT ONLY: a dropped admission_denied op carries its typed reject reason (account, reserves, minimum correction) so the model can act on it without digging into the journal. The plan.revision entry stays byte-stable; the full verdicts live in its `admissions`. | [packages/plan/src/plan-entries.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L138) |
| <a id="property-planhashafter"></a> `planHashAfter` | `string` | - | [packages/plan/src/plan-entries.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L140) |
| <a id="property-revisionunitsremaining"></a> `revisionUnitsRemaining` | `number` | - | [packages/plan/src/plan-entries.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L142) |
