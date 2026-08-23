[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / resolveCitationAuditPlan

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
| `auditScope` | `"sample"` \| `"all"` | `packages/core/dist/index.d.ts` |
| `maxSampled` | `number` | `packages/core/dist/index.d.ts` |
| `pattern` | `string` | `packages/core/dist/index.d.ts` |
| `resolver` | `1` \| `2` | `packages/core/dist/index.d.ts` |
| `samplePerSection` | `number` | `packages/core/dist/index.d.ts` |
| `window` | `number` | `packages/core/dist/index.d.ts` |
