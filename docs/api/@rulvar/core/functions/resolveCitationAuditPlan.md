[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / resolveCitationAuditPlan

# Function: resolveCitationAuditPlan()

```ts
function resolveCitationAuditPlan(options): {
  maxSampled: number;
  pattern: string;
  samplePerSection: number;
  window: number;
};
```

Defined in: [packages/core/src/orchestrator/citation-audit.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L102)

Validates the declared plan numbers; returns the resolved bounds.
Garbage throws like every malformed intake.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`CitationAuditPlanOptions`](/api/@rulvar/core/interfaces/CitationAuditPlanOptions.md) |

## Returns

```ts
{
  maxSampled: number;
  pattern: string;
  samplePerSection: number;
  window: number;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `maxSampled` | `number` | [packages/core/src/orchestrator/citation-audit.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L105) |
| `pattern` | `string` | [packages/core/src/orchestrator/citation-audit.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L103) |
| `samplePerSection` | `number` | [packages/core/src/orchestrator/citation-audit.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L104) |
| `window` | `number` | [packages/core/src/orchestrator/citation-audit.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L106) |
