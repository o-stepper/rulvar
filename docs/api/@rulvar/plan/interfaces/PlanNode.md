[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanNode

# Interface: PlanNode

Defined in: [packages/plan/src/plan-state.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L45)

Canonical per-node fields entering planHash, exactly this
record. `deps` are sorted in the hash (not necessarily in state);
`checkpointRef`/`escalationRef` participate as absent when absent.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cancelrequested"></a> `cancelRequested` | `boolean` | Set by cancel_task on a running node; the cancel lands via plan.decision. | [packages/plan/src/plan-state.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L56) |
| <a id="property-checkpointref"></a> `checkpointRef?` | `number` | - | [packages/plan/src/plan-state.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L59) |
| <a id="property-deps"></a> `deps` | `string`[] | - | [packages/plan/src/plan-state.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L51) |
| <a id="property-escalationref"></a> `escalationRef?` | `number` | - | [packages/plan/src/plan-state.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L60) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | Lineage identity across rebirths (section 8, DEF-3). | [packages/plan/src/plan-state.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L49) |
| <a id="property-nodeid"></a> `nodeId` | `string` | ULID minted inside plan.revision. | [packages/plan/src/plan-state.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L47) |
| <a id="property-parkrequested"></a> `parkRequested` | `boolean` | Set by park_task on a running node; the park lands at the turn boundary. | [packages/plan/src/plan-state.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L54) |
| <a id="property-priority"></a> `priority` | `number` | - | [packages/plan/src/plan-state.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L57) |
| <a id="property-promptspechash"></a> `promptSpecHash` | `string` | - | [packages/plan/src/plan-state.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L58) |
| <a id="property-status"></a> `status` | [`PlanNodeStatus`](/api/@rulvar/plan/type-aliases/PlanNodeStatus.md) | - | [packages/plan/src/plan-state.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L50) |
| <a id="property-waiveddeps"></a> `waivedDeps` | `string`[] | - | [packages/plan/src/plan-state.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L52) |
