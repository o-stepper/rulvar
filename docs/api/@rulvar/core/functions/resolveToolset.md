[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / resolveToolset

# Function: resolveToolset()

```ts
function resolveToolset(specs, session): Promise<ResolvedToolset>;
```

Defined in: [packages/core/src/tools/toolset-hash.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L42)

Expands sources, validates every tool name and duplicate names across
the whole toolset (ConfigError at spawn time; docs/08 sections 1.1 and
6.4), and computes the toolsetHash over contracts sorted by name.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `specs` | \| [`ToolsOption`](/api/@rulvar/core/type-aliases/ToolsOption.md) \| `undefined` |
| `session` | [`ToolSourceSession`](/api/@rulvar/core/interfaces/ToolSourceSession.md) |

## Returns

`Promise`\&lt;[`ResolvedToolset`](/api/@rulvar/core/interfaces/ResolvedToolset.md)\&gt;
