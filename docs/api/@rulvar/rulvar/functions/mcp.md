[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / mcp

# Function: mcp()

```ts
function mcp(cfg): ToolSource;
```

Defined in: `packages/core/dist/index.d.ts`

Imports MCP tools as a ToolSource. The client connects lazily on the
first tools() call; tools/list is fetched with cursor pagination until
exhaustion and cached per session; a listChanged notification
invalidates the cache, affecting subsequently spawned agents only (a
spawn's toolset snapshot is immutable by construction).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `cfg` | [`McpConfig`](/api/@rulvar/rulvar/interfaces/McpConfig.md) |

## Returns

[`ToolSource`](/api/@rulvar/rulvar/interfaces/ToolSource.md)
