[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / profileCard

# Function: profileCard()

```ts
function profileCard(profiles, toolsets?): string;
```

Defined in: `packages/core/dist/index.d.ts`

Renders the registry into the shared agent vocabulary card. Sorted,
deterministic, byte-stable; an empty registry renders explicitly so
the planner never guesses at unregistered agentTypes. When the engine
registers toolsets, their names render as a closing line (v1.17.0
review P1-3): those are the ONLY values valid as string entries of a
tools option, so the planner never invents a registry name.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `profiles` | \| `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md)\&gt; \| `undefined` |
| `toolsets?` | `Record`\&lt;`string`, [`ToolsOption`](/api/@rulvar/rulvar/type-aliases/ToolsOption.md)\&gt; |

## Returns

`string`
