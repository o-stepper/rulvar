[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / EnginePlanOp

# Type Alias: EnginePlanOp

```ts
type EnginePlanOp = 
  | {
  cause: "child-result" | "no-progress" | "park-landed" | "cancel-landed";
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

Defined in: [packages/plan/src/plan-entries.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L177)

The closed EnginePlanOp set.

## Union Members

### Type Literal

```ts
{
  cause: "child-result" | "no-progress" | "park-landed" | "cancel-landed";
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
| `cause` | `"child-result"` \| `"no-progress"` \| `"park-landed"` \| `"cancel-landed"` | - | [packages/plan/src/plan-entries.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L183) |
| `causeRef` | [`EntryRef`](/api/@rulvar/rulvar/type-aliases/EntryRef.md) | - | [packages/plan/src/plan-entries.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L184) |
| `checkpointRef?` | [`EntryRef`](/api/@rulvar/rulvar/type-aliases/EntryRef.md) | The retained checkpoint anchor recorded at park landing (M7-T08). | [packages/plan/src/plan-entries.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L186) |
| `from` | [`PlanNodeStatus`](/api/@rulvar/plan/type-aliases/PlanNodeStatus.md) | - | [packages/plan/src/plan-entries.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L181) |
| `kind` | `"set_node_status"` | - | [packages/plan/src/plan-entries.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L179) |
| `nodeId` | [`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md) | - | [packages/plan/src/plan-entries.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L180) |
| `to` | [`PlanNodeStatus`](/api/@rulvar/plan/type-aliases/PlanNodeStatus.md) | - | [packages/plan/src/plan-entries.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L182) |

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
