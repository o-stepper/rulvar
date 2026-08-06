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
  admittedChildren: number;
  code: "roster_floor";
  floor: number;
  liveExposureUsd: number;
  perSeatProjectionUsd: number;
  remainderUsd: number;
  seatsRemaining: number;
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
  admittedChildren: number;
  code: "roster_floor";
  floor: number;
  liveExposureUsd: number;
  perSeatProjectionUsd: number;
  remainderUsd: number;
  seatsRemaining: number;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `admittedChildren` | `number` | - | `packages/core/dist/index.d.ts` |
| `code` | `"roster_floor"` | The sequential roster feasibility refusal (RV2005): under a declared acceptance.minSpawnedChildren, the whole remaining roster (priced at this seat's own projection) plus the live in-flight exposure does not fit the parent remainder, so the FIRST infeasible seat refuses before any child is paid. The batchGate symmetry (RV1908) on the seat-by-seat path the parity rerun's model actually took, where three seats were paid in full under a floor of four the money could never reach. | `packages/core/dist/index.d.ts` |
| `floor` | `number` | - | `packages/core/dist/index.d.ts` |
| `liveExposureUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `perSeatProjectionUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `remainderUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `seatsRemaining` | `number` | - | `packages/core/dist/index.d.ts` |

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
