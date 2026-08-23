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

Defined in: [packages/core/src/orchestrator/citation-audit.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L166)

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
| `maxSampled` | `number` | [packages/core/src/orchestrator/citation-audit.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L169) |
| `pattern` | `string` | [packages/core/src/orchestrator/citation-audit.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L167) |
| `resolver` | `1` \| `2` | [packages/core/src/orchestrator/citation-audit.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L171) |
| `samplePerSection` | `number` | [packages/core/src/orchestrator/citation-audit.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L168) |
| `window` | `number` | [packages/core/src/orchestrator/citation-audit.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L170) |
