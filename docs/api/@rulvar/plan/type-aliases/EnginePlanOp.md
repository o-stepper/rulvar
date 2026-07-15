[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / EnginePlanOp

# Type Alias: EnginePlanOp

```ts
type EnginePlanOp = 
  | {
  cause:   | "child-result"
     | "no-progress"
     | "park-landed"
     | "cancel-landed"
     | "dispatch-rejected";
  causeRef: EntryRef;
  checkpointRef?: EntryRef;
  from: PlanNodeStatus;
  kind: "set_node_status";
  nodeId: NodeId;
  to: PlanNodeStatus;
}
  | {
  decision: EscalationDecision;
  escalationRef: EntryRef;
  kind: "resolve_escalation";
  nodeId: NodeId;
  resolvedBy: "default" | "class" | "live" | "revision-transform";
}
  | {
  admission: AdmissionDecision;
  kind: "spawn_admitted";
  nodes: {
     logicalTaskId: LogicalTaskId;
     nodeId: NodeId;
     spec: TaskSpec;
  }[];
};
```

Defined in: [packages/plan/src/plan-entries.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L186)

The closed EnginePlanOp set.

## Union Members

### Type Literal

```ts
{
  cause:   | "child-result"
     | "no-progress"
     | "park-landed"
     | "cancel-landed"
     | "dispatch-rejected";
  causeRef: EntryRef;
  checkpointRef?: EntryRef;
  from: PlanNodeStatus;
  kind: "set_node_status";
  nodeId: NodeId;
  to: PlanNodeStatus;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `cause` | \| `"child-result"` \| `"no-progress"` \| `"park-landed"` \| `"cancel-landed"` \| `"dispatch-rejected"` | - | [packages/plan/src/plan-entries.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L192) |
| `causeRef` | [`EntryRef`](/api/@rulvar/rulvar/type-aliases/EntryRef.md) | - | [packages/plan/src/plan-entries.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L193) |
| `checkpointRef?` | [`EntryRef`](/api/@rulvar/rulvar/type-aliases/EntryRef.md) | The retained checkpoint anchor recorded at park landing (M7-T08). | [packages/plan/src/plan-entries.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L195) |
| `from` | [`PlanNodeStatus`](/api/@rulvar/plan/type-aliases/PlanNodeStatus.md) | - | [packages/plan/src/plan-entries.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L190) |
| `kind` | `"set_node_status"` | - | [packages/plan/src/plan-entries.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L188) |
| `nodeId` | [`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md) | - | [packages/plan/src/plan-entries.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L189) |
| `to` | [`PlanNodeStatus`](/api/@rulvar/plan/type-aliases/PlanNodeStatus.md) | - | [packages/plan/src/plan-entries.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L191) |

***

### Type Literal

```ts
{
  decision: EscalationDecision;
  escalationRef: EntryRef;
  kind: "resolve_escalation";
  nodeId: NodeId;
  resolvedBy: "default" | "class" | "live" | "revision-transform";
}
```

***

### Type Literal

```ts
{
  admission: AdmissionDecision;
  kind: "spawn_admitted";
  nodes: {
     logicalTaskId: LogicalTaskId;
     nodeId: NodeId;
     spec: TaskSpec;
  }[];
}
```
