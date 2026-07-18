[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / resolveToolset

# Function: resolveToolset()

```ts
function resolveToolset(
   specs, 
   session, 
toolsets?): Promise<ResolvedToolset>;
```

Defined in: [packages/core/src/tools/toolset-hash.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L49)

Expands registered names and sources, validates every tool name and
duplicate names across the whole toolset (ConfigError at spawn time),
and computes the toolsetHash over contracts sorted by name. The
`toolsets` registry is the engine's `defaults.toolsets` snapshot;
without one, string entries fail with the same unknown-name error as
a miss, so nothing outside the declared registry is ever reachable.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `specs` | \| [`ToolsOption`](/api/@rulvar/core/type-aliases/ToolsOption.md) \| `undefined` |
| `session` | [`ToolSourceSession`](/api/@rulvar/core/interfaces/ToolSourceSession.md) |
| `toolsets?` | `Record`\&lt;`string`, [`ToolsOption`](/api/@rulvar/core/type-aliases/ToolsOption.md)\&gt; |

## Returns

`Promise`\&lt;[`ResolvedToolset`](/api/@rulvar/core/interfaces/ResolvedToolset.md)\&gt;
