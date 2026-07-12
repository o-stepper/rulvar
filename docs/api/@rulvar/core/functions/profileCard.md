[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / profileCard

# Function: profileCard()

```ts
function profileCard(profiles): string;
```

Defined in: [packages/core/src/model/profile-card.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/profile-card.ts#L35)

Renders the registry into the shared agent vocabulary card. Sorted,
deterministic, byte-stable; an empty registry renders explicitly so
the planner never guesses at unregistered agentTypes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `profiles` | \| `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/core/interfaces/AgentProfile.md)\&gt; \| `undefined` |

## Returns

`string`
