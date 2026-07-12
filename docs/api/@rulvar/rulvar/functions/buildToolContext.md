[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / buildToolContext

# Function: buildToolContext()

```ts
function buildToolContext(seed): ToolContext;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Builds the per-call ToolContext; one fresh span per tool call.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `seed` | [`ToolContextSeed`](/api/@rulvar/rulvar/interfaces/ToolContextSeed.md) |

## Returns

[`ToolContext`](/api/@rulvar/rulvar/interfaces/ToolContext.md)
