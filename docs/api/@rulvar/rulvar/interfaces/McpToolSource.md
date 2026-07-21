[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / McpToolSource

# Interface: McpToolSource

Defined in: `packages/core/dist/index.d.ts`

The ToolSource returned by [mcp](/api/@rulvar/rulvar/functions/mcp.md): the frozen ToolSource seam
plus the lifecycle the seam deliberately leaves to the host.
`close()` releases everything the source created on first use: the
SDK client, its transport, and, for stdio, the spawned child
process, without which a one shot host process cannot exit
naturally after a run, because the child and its pipes keep the
event loop alive (v1.33.0 review P2). It is idempotent, resolves
even when the connection never succeeded, and resets the source, so
a later `tools()` call connects afresh. The engine never closes a
source, because one source may serve many runs: the host owns the
lifecycle and should close once its runs have settled (closing
while a run is in flight fails that run's MCP tool calls).

## Extends

- [`ToolSource`](/api/@rulvar/rulvar/interfaces/ToolSource.md)

## Properties

| Property | Type | Inherited from | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-id"></a> `id` | `string` | [`ToolSource`](/api/@rulvar/rulvar/interfaces/ToolSource.md).[`id`](/api/@rulvar/rulvar/interfaces/ToolSource.md#property-id) | `packages/core/dist/index.d.ts` |

## Methods

### close()

```ts
close(): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

`Promise`\&lt;`void`\&gt;

***

### tools()

```ts
tools(session): Promise<ToolDef<SchemaSpec<unknown>>[]>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `session` | [`ToolSourceSession`](/api/@rulvar/rulvar/interfaces/ToolSourceSession.md) |

#### Returns

`Promise`\&lt;[`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;[]\&gt;

#### Inherited from

[`ToolSource`](/api/@rulvar/rulvar/interfaces/ToolSource.md).[`tools`](/api/@rulvar/rulvar/interfaces/ToolSource.md#tools)
