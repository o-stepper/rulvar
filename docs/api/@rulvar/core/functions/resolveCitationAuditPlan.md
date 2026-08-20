[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / resolveCitationAuditPlan

# Function: resolveCitationAuditPlan()

```ts
function resolveCitationAuditPlan(options): {
  maxSampled: number;
  pattern: string;
  resolver: 1 | 2;
  samplePerSection: number;
  window: number;
};
```

Defined in: [packages/core/src/orchestrator/citation-audit.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L154)

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
  resolver: 1 | 2;
  samplePerSection: number;
  window: number;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `maxSampled` | `number` | [packages/core/src/orchestrator/citation-audit.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L157) |
| `pattern` | `string` | [packages/core/src/orchestrator/citation-audit.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L155) |
| `resolver` | `1` \| `2` | [packages/core/src/orchestrator/citation-audit.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L159) |
| `samplePerSection` | `number` | [packages/core/src/orchestrator/citation-audit.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L156) |
| `window` | `number` | [packages/core/src/orchestrator/citation-audit.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L158) |
