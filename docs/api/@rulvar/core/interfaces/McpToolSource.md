[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / McpToolSource

# Interface: McpToolSource

Defined in: [packages/core/src/tools/mcp.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L71)

The ToolSource returned by [mcp](/api/@rulvar/core/functions/mcp.md): the frozen ToolSource seam
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

- [`ToolSource`](/api/@rulvar/core/interfaces/ToolSource.md)

## Properties

| Property | Type | Inherited from | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-id"></a> `id` | `string` | [`ToolSource`](/api/@rulvar/core/interfaces/ToolSource.md).[`id`](/api/@rulvar/core/interfaces/ToolSource.md#property-id) | [packages/core/src/l0/spi/toolsource.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L82) |

## Methods

### close()

```ts
close(): Promise<void>;
```

Defined in: [packages/core/src/tools/mcp.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L72)

#### Returns

`Promise`\&lt;`void`\&gt;

***

### tools()

```ts
tools(session): Promise<ToolDef<SchemaSpec>[]>;
```

Defined in: [packages/core/src/l0/spi/toolsource.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L83)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `session` | [`ToolSourceSession`](/api/@rulvar/core/interfaces/ToolSourceSession.md) |

#### Returns

`Promise`\&lt;[`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;[]\&gt;

#### Inherited from

[`ToolSource`](/api/@rulvar/core/interfaces/ToolSource.md).[`tools`](/api/@rulvar/core/interfaces/ToolSource.md#tools)
