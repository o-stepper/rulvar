[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmitRejectReason

# Type Alias: AdmitRejectReason

```ts
type AdmitRejectReason = 
  | {
  code:   | "depth"
     | "quota"
     | "budget"
     | "lifetime"
     | "termination_exhausted"
     | "ladder_exceeds_frozen"
     | "lineage_exhausted"
     | "lineage_busy";
}
  | {
  code: "osc_guard";
  oscillationCount: number;
  spawnKey: SpawnKey;
}
  | {
  agentType: string;
  childAccount: string;
  childCeilingUsd: number;
  code: "reserve_exceeds_budget";
  estCostUsd: number;
  message: string;
  minimumBudgetUsd: number;
  resolvedReserveUsd: number;
};
```

Defined in: `packages/core/dist/index.d.ts`

The merged reject-code set.

## Union Members

### Type Literal

```ts
{
  code:   | "depth"
     | "quota"
     | "budget"
     | "lifetime"
     | "termination_exhausted"
     | "ladder_exceeds_frozen"
     | "lineage_exhausted"
     | "lineage_busy";
}
```

***

### Type Literal

```ts
{
  code: "osc_guard";
  oscillationCount: number;
  spawnKey: SpawnKey;
}
```

***

### Type Literal

```ts
{
  agentType: string;
  childAccount: string;
  childCeilingUsd: number;
  code: "reserve_exceeds_budget";
  estCostUsd: number;
  message: string;
  minimumBudgetUsd: number;
  resolvedReserveUsd: number;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `agentType` | `string` | - | `packages/core/dist/index.d.ts` |
| `childAccount` | `string` | - | `packages/core/dist/index.d.ts` |
| `childCeilingUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `code` | `"reserve_exceeds_budget"` | The declared estimate cannot fit the child's own ceiling: the host said the work costs more than the budget buys, so the op is bounced with the actionable correction BEFORE it changes plan state or consumes a spawn unit (the v1.7.0 follow-up review's P1). Heuristic reserves never produce this code; they clamp to the allowance instead. | `packages/core/dist/index.d.ts` |
| `estCostUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `message` | `string` | - | `packages/core/dist/index.d.ts` |
| `minimumBudgetUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `resolvedReserveUsd` | `number` | - | `packages/core/dist/index.d.ts` |
