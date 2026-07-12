[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CanUseTool

# Type Alias: CanUseTool

```ts
type CanUseTool = (toolName, input, ctx) => 
  | "allow"
  | "deny"
  | {
  modifiedInput: unknown;
}
  | Promise<
  | "allow"
  | "deny"
  | {
  modifiedInput: unknown;
}>;
```

Defined in: [packages/core/src/runtime/permission-chain.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L44)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `toolName` | `string` |
| `input` | `unknown` |
| `ctx` | [`ToolContext`](/api/@rulvar/core/interfaces/ToolContext.md) |

## Returns

  \| `"allow"`
  \| `"deny"`
  \| \{
  `modifiedInput`: `unknown`;
\}
  \| `Promise`\<
  \| `"allow"`
  \| `"deny"`
  \| \{
  `modifiedInput`: `unknown`;
\}\>
