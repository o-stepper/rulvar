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

Defined in: [packages/core/src/orchestrator/admission.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L98)

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
| `agentType` | `string` | - | [packages/core/src/orchestrator/admission.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L121) |
| `childAccount` | `string` | - | [packages/core/src/orchestrator/admission.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L122) |
| `childCeilingUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L125) |
| `code` | `"reserve_exceeds_budget"` | The declared estimate cannot fit the child's own ceiling: the host said the work costs more than the budget buys, so the op is bounced with the actionable correction BEFORE it changes plan state or consumes a spawn unit (the v1.7.0 follow-up review's P1). Heuristic reserves never produce this code; they clamp to the allowance instead. | [packages/core/src/orchestrator/admission.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L120) |
| `estCostUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L123) |
| `message` | `string` | - | [packages/core/src/orchestrator/admission.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L127) |
| `minimumBudgetUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L126) |
| `resolvedReserveUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L124) |
