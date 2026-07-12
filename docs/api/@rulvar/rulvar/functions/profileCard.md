[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / profileCard

# Function: profileCard()

```ts
function profileCard(profiles): string;
```

Defined in: `packages/core/dist/index.d.ts`

Renders the registry into the shared agent vocabulary card. Sorted,
deterministic, byte-stable; an empty registry renders explicitly so
the planner never guesses at unregistered agentTypes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `profiles` | \| `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md)\&gt; \| `undefined` |

## Returns

`string`
