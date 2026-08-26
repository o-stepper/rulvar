[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / resolveCitationAuditPlan

# Function: resolveCitationAuditPlan()

```ts
function resolveCitationAuditPlan(options): {
  auditScope: "sample" | "all";
  maxSampled: number;
  pattern: string;
  resolver: 1 | 2;
  samplePerSection: number;
  window: number;
};
```

Defined in: [packages/core/src/orchestrator/citation-audit.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L199)

Validates the declared plan numbers; returns the resolved bounds.
Garbage throws like every malformed intake.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`CitationAuditPlanOptions`](/api/@rulvar/core/interfaces/CitationAuditPlanOptions.md) |

## Returns

```ts
{
  auditScope: "sample" | "all";
  maxSampled: number;
  pattern: string;
  resolver: 1 | 2;
  samplePerSection: number;
  window: number;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `auditScope` | `"sample"` \| `"all"` | [packages/core/src/orchestrator/citation-audit.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L205) |
| `maxSampled` | `number` | [packages/core/src/orchestrator/citation-audit.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L202) |
| `pattern` | `string` | [packages/core/src/orchestrator/citation-audit.ts:200](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L200) |
| `resolver` | `1` \| `2` | [packages/core/src/orchestrator/citation-audit.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L204) |
| `samplePerSection` | `number` | [packages/core/src/orchestrator/citation-audit.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L201) |
| `window` | `number` | [packages/core/src/orchestrator/citation-audit.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L203) |
