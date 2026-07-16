[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / extractScript

# Function: extractScript()

```ts
function extractScript(reply): string;
```

Defined in: [packages/planner/src/plan.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L90)

The model may fence the script; the extractor takes the first fenced
block when one exists, else the whole reply, and is deterministic.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `reply` | `string` |

## Returns

`string`
