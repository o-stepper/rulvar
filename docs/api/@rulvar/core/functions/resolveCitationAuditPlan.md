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

Defined in: [packages/core/src/orchestrator/citation-audit.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L179)

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
| `auditScope` | `"sample"` \| `"all"` | [packages/core/src/orchestrator/citation-audit.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L185) |
| `maxSampled` | `number` | [packages/core/src/orchestrator/citation-audit.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L182) |
| `pattern` | `string` | [packages/core/src/orchestrator/citation-audit.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L180) |
| `resolver` | `1` \| `2` | [packages/core/src/orchestrator/citation-audit.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L184) |
| `samplePerSection` | `number` | [packages/core/src/orchestrator/citation-audit.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L181) |
| `window` | `number` | [packages/core/src/orchestrator/citation-audit.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L183) |
