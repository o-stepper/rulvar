[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanOp

# Type Alias: PlanOp

```ts
type PlanOp = 
  | {
  approach?: string;
  deps?: NodeId[];
  fresh?: boolean;
  lineage?: SpawnLineageOpt;
  op: "add_task";
  priority?: number;
  spec: TaskSpec;
}
  | {
  nodeId: NodeId;
  op: "amend_task";
  spec: TaskSpecPatch;
}
  | {
  nodeId: NodeId;
  op: "park_task";
}
  | {
  nodeId: NodeId;
  op: "unpark_task";
}
  | {
  nodeId: NodeId;
  op: "cancel_task";
  reason?: string;
}
  | {
  nodeId: NodeId;
  op: "reprioritize";
  priority: number;
}
  | {
  deps: NodeId[];
  nodeId: NodeId;
  op: "rewire_deps";
}
  | {
  dep: NodeId;
  nodeId: NodeId;
  op: "waive_dep";
};
```

Defined in: [packages/plan/src/plan-entries.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L46)

The orchestrator-facing PlanOp union.

## Union Members

### Type Literal

```ts
{
  approach?: string;
  deps?: NodeId[];
  fresh?: boolean;
  lineage?: SpawnLineageOpt;
  op: "add_task";
  priority?: number;
  spec: TaskSpec;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `approach?` | `string` | - | [packages/plan/src/plan-entries.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L53) |
| `deps?` | [`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md)[] | - | [packages/plan/src/plan-entries.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L50) |
| `fresh?` | `boolean` | Forbids reuse-by-reference for this addition (DEF-5). | [packages/plan/src/plan-entries.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L55) |
| `lineage?` | [`SpawnLineageOpt`](/api/@rulvar/rulvar/interfaces/SpawnLineageOpt.md) | - | [packages/plan/src/plan-entries.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L52) |
| `op` | `"add_task"` | - | [packages/plan/src/plan-entries.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L48) |
| `priority?` | `number` | - | [packages/plan/src/plan-entries.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L51) |
| `spec` | [`TaskSpec`](/api/@rulvar/plan/interfaces/TaskSpec.md) | - | [packages/plan/src/plan-entries.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L49) |

***

### Type Literal

```ts
{
  nodeId: NodeId;
  op: "amend_task";
  spec: TaskSpecPatch;
}
```

***

### Type Literal

```ts
{
  nodeId: NodeId;
  op: "park_task";
}
```

***

### Type Literal

```ts
{
  nodeId: NodeId;
  op: "unpark_task";
}
```

***

### Type Literal

```ts
{
  nodeId: NodeId;
  op: "cancel_task";
  reason?: string;
}
```

***

### Type Literal

```ts
{
  nodeId: NodeId;
  op: "reprioritize";
  priority: number;
}
```

***

### Type Literal

```ts
{
  deps: NodeId[];
  nodeId: NodeId;
  op: "rewire_deps";
}
```

***

### Type Literal

```ts
{
  dep: NodeId;
  nodeId: NodeId;
  op: "waive_dep";
}
```
