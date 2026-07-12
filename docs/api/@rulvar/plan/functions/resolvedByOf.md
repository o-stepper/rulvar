[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / resolvedByOf

# Function: resolvedByOf()

```ts
function resolvedByOf(by): "default" | "class" | "live";
```

Defined in: [packages/plan/src/escalation.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L68)

Maps a resolution `by` value onto the decision's resolvedBy field.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `by` | `string` |

## Returns

`"default"` \| `"class"` \| `"live"`
