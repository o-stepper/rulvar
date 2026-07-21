[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / mcp

# Function: mcp()

```ts
function mcp(cfg): McpToolSource;
```

Defined in: [packages/core/src/tools/mcp.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L158)

Imports MCP tools as a [McpToolSource](/api/@rulvar/core/interfaces/McpToolSource.md). The client connects
lazily on the first tools() call; tools/list is fetched with cursor
pagination until exhaustion and cached per session; a listChanged
notification invalidates the cache, affecting subsequently spawned
agents only (a spawn's toolset snapshot is immutable by
construction). The host owns the source's lifecycle: `close()`
releases the client, the transport, and the stdio child once the
runs using the source have settled; a one shot host should close in
a finally block, or its process never exits naturally (v1.33.0
review P2).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `cfg` | [`McpConfig`](/api/@rulvar/core/interfaces/McpConfig.md) |

## Returns

[`McpToolSource`](/api/@rulvar/core/interfaces/McpToolSource.md)
