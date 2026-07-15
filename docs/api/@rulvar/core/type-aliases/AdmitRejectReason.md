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

Defined in: [packages/core/src/orchestrator/admission.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L93)

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
| `agentType` | `string` | - | [packages/core/src/orchestrator/admission.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L116) |
| `childAccount` | `string` | - | [packages/core/src/orchestrator/admission.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L117) |
| `childCeilingUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L120) |
| `code` | `"reserve_exceeds_budget"` | The declared estimate cannot fit the child's own ceiling: the host said the work costs more than the budget buys, so the op is bounced with the actionable correction BEFORE it changes plan state or consumes a spawn unit (the v1.7.0 follow-up review's P1). Heuristic reserves never produce this code; they clamp to the allowance instead. | [packages/core/src/orchestrator/admission.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L115) |
| `estCostUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L118) |
| `message` | `string` | - | [packages/core/src/orchestrator/admission.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L122) |
| `minimumBudgetUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L121) |
| `resolvedReserveUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L119) |
