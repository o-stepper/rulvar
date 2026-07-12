[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PermissionHook

# Type Alias: PermissionHook

```ts
type PermissionHook = (toolName, input, ctx) => 
  | HookVerdict
| Promise<HookVerdict>;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `toolName` | `string` |
| `input` | `unknown` |
| `ctx` | [`ToolContext`](/api/@rulvar/rulvar/interfaces/ToolContext.md) |

## Returns

  \| [`HookVerdict`](/api/@rulvar/rulvar/type-aliases/HookVerdict.md)
  \| `Promise`\&lt;[`HookVerdict`](/api/@rulvar/rulvar/type-aliases/HookVerdict.md)\&gt;
