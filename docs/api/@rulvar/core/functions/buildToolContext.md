[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / buildToolContext

# Function: buildToolContext()

```ts
function buildToolContext(seed): ToolContext;
```

Defined in: [packages/core/src/tools/context.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/context.ts#L33)

Builds the per-call ToolContext; one fresh span per tool call.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `seed` | [`ToolContextSeed`](/api/@rulvar/core/interfaces/ToolContextSeed.md) |

## Returns

[`ToolContext`](/api/@rulvar/core/interfaces/ToolContext.md)
