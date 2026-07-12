[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PermissionHook

# Type Alias: PermissionHook

```ts
type PermissionHook = (toolName, input, ctx) => 
  | HookVerdict
| Promise<HookVerdict>;
```

Defined in: [packages/core/src/runtime/permission-chain.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L20)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `toolName` | `string` |
| `input` | `unknown` |
| `ctx` | [`ToolContext`](/api/@rulvar/core/interfaces/ToolContext.md) |

## Returns

  \| [`HookVerdict`](/api/@rulvar/core/type-aliases/HookVerdict.md)
  \| `Promise`\&lt;[`HookVerdict`](/api/@rulvar/core/type-aliases/HookVerdict.md)\&gt;
