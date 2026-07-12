[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanNode

# Interface: PlanNode

Defined in: [packages/plan/src/plan-state.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L42)

Canonical per-node fields entering planHash, exactly the docs/07 3.1
record. `deps` are sorted in the hash (not necessarily in state);
`checkpointRef`/`escalationRef` participate as absent when absent.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cancelrequested"></a> `cancelRequested` | `boolean` | Set by cancel_task on a running node; the cancel lands via plan.decision. | [packages/plan/src/plan-state.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L53) |
| <a id="property-checkpointref"></a> `checkpointRef?` | `number` | - | [packages/plan/src/plan-state.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L56) |
| <a id="property-deps"></a> `deps` | `string`[] | - | [packages/plan/src/plan-state.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L48) |
| <a id="property-escalationref"></a> `escalationRef?` | `number` | - | [packages/plan/src/plan-state.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L57) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | Lineage identity across rebirths (section 8, DEF-3). | [packages/plan/src/plan-state.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L46) |
| <a id="property-nodeid"></a> `nodeId` | `string` | ULID minted inside plan.revision. | [packages/plan/src/plan-state.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L44) |
| <a id="property-parkrequested"></a> `parkRequested` | `boolean` | Set by park_task on a running node; the park lands at the turn boundary. | [packages/plan/src/plan-state.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L51) |
| <a id="property-priority"></a> `priority` | `number` | - | [packages/plan/src/plan-state.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L54) |
| <a id="property-promptspechash"></a> `promptSpecHash` | `string` | - | [packages/plan/src/plan-state.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L55) |
| <a id="property-status"></a> `status` | [`PlanNodeStatus`](/api/@rulvar/plan/type-aliases/PlanNodeStatus.md) | - | [packages/plan/src/plan-state.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L47) |
| <a id="property-waiveddeps"></a> `waivedDeps` | `string`[] | - | [packages/plan/src/plan-state.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L49) |
