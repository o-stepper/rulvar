[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / resolveToolset

# Function: resolveToolset()

```ts
function resolveToolset(
   specs, 
   session, 
   toolsets?, 
executors?): Promise<ResolvedToolset>;
```

Defined in: `packages/core/dist/index.d.ts`

Expands registered names and sources, validates every tool name and
duplicate names across the whole toolset (ConfigError at spawn time),
and computes the toolsetHash over contracts sorted by name. The
`toolsets` registry is the engine's `defaults.toolsets` snapshot;
without one, string entries fail with the same unknown-name error as
a miss, so nothing outside the declared registry is ever reachable.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `specs` | \| [`ToolsOption`](/api/@rulvar/rulvar/type-aliases/ToolsOption.md) \| `undefined` |
| `session` | [`ToolSourceSession`](/api/@rulvar/rulvar/interfaces/ToolSourceSession.md) |
| `toolsets?` | `Record`\&lt;`string`, [`ToolsOption`](/api/@rulvar/rulvar/type-aliases/ToolsOption.md)\&gt; |
| `executors?` | `ReadonlySet`\&lt;`string`\&gt; |

## Returns

`Promise`\&lt;[`ResolvedToolset`](/api/@rulvar/rulvar/interfaces/ResolvedToolset.md)\&gt;
