[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanViewRender

# Interface: PlanViewRender

Defined in: [packages/plan/src/tools.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L280)

The plan_view render: plan state, lineage, termination, reuse.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandonedspend"></a> `abandonedSpend` | \{ `abandonedUsd`: `number`; `netLostUsd`: `number`; `reclaimedUsd`: `number`; \} | The abandoned-spend ledger (DEF-5); zeros until M7-T07 activates it. | [packages/plan/src/tools.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L287) |
| `abandonedSpend.abandonedUsd` | `number` | - | [packages/plan/src/tools.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L287) |
| `abandonedSpend.netLostUsd` | `number` | - | [packages/plan/src/tools.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L287) |
| `abandonedSpend.reclaimedUsd` | `number` | - | [packages/plan/src/tools.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L287) |
| <a id="property-droppedrevisionstreak"></a> `droppedRevisionStreak` | `number` | - | [packages/plan/src/tools.ts:283](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L283) |
| <a id="property-guards"></a> `guards?` | \{ `engaged?`: `"reject-revision"` \| `"finish-with-partial"` \| `"fail-run"`; `frozenSignatures`: `string`[]; `stallReplansUsed`: `number`; \} | RevisionGuards state (M7-T06). | [packages/plan/src/tools.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L289) |
| `guards.engaged?` | `"reject-revision"` \| `"finish-with-partial"` \| `"fail-run"` | - | [packages/plan/src/tools.ts:290](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L290) |
| `guards.frozenSignatures` | `string`[] | - | [packages/plan/src/tools.ts:291](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L291) |
| `guards.stallReplansUsed` | `number` | - | [packages/plan/src/tools.ts:292](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L292) |
| <a id="property-nodes"></a> `nodes` | [`PlanViewNode`](/api/@rulvar/plan/interfaces/PlanViewNode.md)[] | - | [packages/plan/src/tools.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L284) |
| <a id="property-planhash"></a> `planHash` | `string` | - | [packages/plan/src/tools.ts:281](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L281) |
| <a id="property-revisioncount"></a> `revisionCount` | `number` | - | [packages/plan/src/tools.ts:282](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L282) |
| <a id="property-termination"></a> `termination` | [`TerminationAccountSnapshot`](/api/@rulvar/rulvar/interfaces/TerminationAccountSnapshot.md) | - | [packages/plan/src/tools.ts:285](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L285) |
