[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / collectDeclaredLadders

# Function: collectDeclaredLadders()

```ts
function collectDeclaredLadders(profiles): DeclaredLadder[];
```

Defined in: [packages/core/src/knowledge/card.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/card.ts#L34)

The ladders a run declares: every advertised profile whose model
spec is a ladder. The card is tier-relative to
exactly these.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `profiles` | \| `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/core/interfaces/AgentProfile.md)\&gt; \| `undefined` |

## Returns

[`DeclaredLadder`](/api/@rulvar/core/interfaces/DeclaredLadder.md)[]
