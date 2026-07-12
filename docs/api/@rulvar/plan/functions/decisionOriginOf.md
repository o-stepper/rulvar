[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / decisionOriginOf

# Function: decisionOriginOf()

```ts
function decisionOriginOf(resolvedBy): "escalation-default" | "escalation-class" | "escalation-live";
```

Defined in: [packages/plan/src/escalation.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L79)

The plan.decision origin of one resolvedBy value.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `resolvedBy` | `"default"` \| `"class"` \| `"live"` \| `"revision-transform"` |

## Returns

`"escalation-default"` \| `"escalation-class"` \| `"escalation-live"`
