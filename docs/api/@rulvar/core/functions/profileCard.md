[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / profileCard

# Function: profileCard()

```ts
function profileCard(profiles, toolsets?): string;
```

Defined in: [packages/core/src/model/profile-card.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/profile-card.ts#L38)

Renders the registry into the shared agent vocabulary card. Sorted,
deterministic, byte-stable; an empty registry renders explicitly so
the planner never guesses at unregistered agentTypes. When the engine
registers toolsets, their names render as a closing line (v1.17.0
review P1-3): those are the ONLY values valid as string entries of a
tools option, so the planner never invents a registry name.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `profiles` | \| `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/core/interfaces/AgentProfile.md)\&gt; \| `undefined` |
| `toolsets?` | `Record`\&lt;`string`, [`ToolsOption`](/api/@rulvar/core/type-aliases/ToolsOption.md)\&gt; |

## Returns

`string`
