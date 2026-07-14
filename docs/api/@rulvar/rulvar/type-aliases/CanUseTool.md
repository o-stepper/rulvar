[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CanUseTool

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

Defined in: `packages/core/dist/index.d.ts`

## Parameters

| Parameter | Type |
| ------ | ------ |
| `toolName` | `string` |
| `input` | `unknown` |
| `ctx` | [`ToolContext`](/api/@rulvar/rulvar/interfaces/ToolContext.md) |

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
