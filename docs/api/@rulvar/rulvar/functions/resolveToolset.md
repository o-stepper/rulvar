[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / resolveToolset

# Function: resolveToolset()

```ts
function resolveToolset(specs, session): Promise<ResolvedToolset>;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Expands sources, validates every tool name and duplicate names across
the whole toolset (ConfigError at spawn time; docs/08 sections 1.1 and
6.4), and computes the toolsetHash over contracts sorted by name.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `specs` | \| [`ToolsOption`](/api/@rulvar/rulvar/type-aliases/ToolsOption.md) \| `undefined` |
| `session` | [`ToolSourceSession`](/api/@rulvar/rulvar/interfaces/ToolSourceSession.md) |

## Returns

`Promise`\&lt;[`ResolvedToolset`](/api/@rulvar/rulvar/interfaces/ResolvedToolset.md)\&gt;
