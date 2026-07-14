[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanViewRender

# Interface: PlanViewRender

Defined in: [packages/plan/src/tools.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L321)

The plan_view render: plan state, lineage, termination, reuse.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandonedspend"></a> `abandonedSpend` | \{ `abandonedUsd`: `number`; `netLostUsd`: `number`; `reclaimedUsd`: `number`; \} | The abandoned-spend ledger (DEF-5); zeros until M7-T07 activates it. | [packages/plan/src/tools.ts:328](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L328) |
| `abandonedSpend.abandonedUsd` | `number` | - | [packages/plan/src/tools.ts:328](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L328) |
| `abandonedSpend.netLostUsd` | `number` | - | [packages/plan/src/tools.ts:328](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L328) |
| `abandonedSpend.reclaimedUsd` | `number` | - | [packages/plan/src/tools.ts:328](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L328) |
| <a id="property-droppedrevisionstreak"></a> `droppedRevisionStreak` | `number` | - | [packages/plan/src/tools.ts:324](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L324) |
| <a id="property-guards"></a> `guards?` | \{ `engaged?`: `"reject-revision"` \| `"finish-with-partial"` \| `"fail-run"`; `frozenSignatures`: `string`[]; `stallReplansUsed`: `number`; \} | RevisionGuards state (M7-T06). | [packages/plan/src/tools.ts:330](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L330) |
| `guards.engaged?` | `"reject-revision"` \| `"finish-with-partial"` \| `"fail-run"` | - | [packages/plan/src/tools.ts:331](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L331) |
| `guards.frozenSignatures` | `string`[] | - | [packages/plan/src/tools.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L332) |
| `guards.stallReplansUsed` | `number` | - | [packages/plan/src/tools.ts:333](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L333) |
| <a id="property-nodes"></a> `nodes` | [`PlanViewNode`](/api/@rulvar/plan/interfaces/PlanViewNode.md)[] | - | [packages/plan/src/tools.ts:325](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L325) |
| <a id="property-planhash"></a> `planHash` | `string` | - | [packages/plan/src/tools.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L322) |
| <a id="property-revisioncount"></a> `revisionCount` | `number` | - | [packages/plan/src/tools.ts:323](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L323) |
| <a id="property-termination"></a> `termination` | [`TerminationAccountSnapshot`](/api/@rulvar/rulvar/interfaces/TerminationAccountSnapshot.md) | - | [packages/plan/src/tools.ts:326](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L326) |
