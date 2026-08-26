[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmitRejectReason

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

Defined in: [packages/core/src/orchestrator/admission.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L116)

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
| `admittedChildren` | `number` | - | [packages/core/src/orchestrator/admission.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L143) |
| `code` | `"roster_floor"` | The sequential roster feasibility refusal (RV2005): under a declared acceptance.minSpawnedChildren, the whole remaining roster (priced at this seat's own projection) plus the live in-flight exposure does not fit the parent remainder, so the FIRST infeasible seat refuses before any child is paid. The batchGate symmetry (RV1908) on the seat-by-seat path the parity rerun's model actually took, where three seats were paid in full under a floor of four the money could never reach. | [packages/core/src/orchestrator/admission.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L141) |
| `floor` | `number` | - | [packages/core/src/orchestrator/admission.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L142) |
| `liveExposureUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L146) |
| `perSeatProjectionUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L145) |
| `remainderUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L147) |
| `seatsRemaining` | `number` | - | [packages/core/src/orchestrator/admission.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L144) |

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
| `agentType` | `string` | - | [packages/core/src/orchestrator/admission.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L159) |
| `childAccount` | `string` | - | [packages/core/src/orchestrator/admission.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L160) |
| `childCeilingUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L163) |
| `code` | `"reserve_exceeds_budget"` | The declared estimate cannot fit the child's own ceiling: the host said the work costs more than the budget buys, so the op is bounced with the actionable correction BEFORE it changes plan state or consumes a spawn unit (the v1.7.0 follow-up review's P1). Heuristic reserves never produce this code; they clamp to the allowance instead. | [packages/core/src/orchestrator/admission.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L158) |
| `estCostUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L161) |
| `message` | `string` | - | [packages/core/src/orchestrator/admission.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L165) |
| `minimumBudgetUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L164) |
| `resolvedReserveUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L162) |
