[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / resolveCitationAuditPlan

# Function: resolveCitationAuditPlan()

```ts
function resolveCitationAuditPlan(options): {
  maxSampled: number;
  pattern: string;
  samplePerSection: number;
  window: number;
};
```

Defined in: `packages/core/dist/index.d.ts`

Validates the declared plan numbers; returns the resolved bounds.
Garbage throws like every malformed intake.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`CitationAuditPlanOptions`](/api/@rulvar/rulvar/interfaces/CitationAuditPlanOptions.md) |

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
| `maxSampled` | `number` | `packages/core/dist/index.d.ts` |
| `pattern` | `string` | `packages/core/dist/index.d.ts` |
| `samplePerSection` | `number` | `packages/core/dist/index.d.ts` |
| `window` | `number` | `packages/core/dist/index.d.ts` |
