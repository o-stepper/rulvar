[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / modelKnowledgeCard

# Function: modelKnowledgeCard()

```ts
function modelKnowledgeCard(
   claims, 
   ladders, 
   options?): string;
```

Defined in: [packages/core/src/knowledge/card.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/card.ts#L186)

The deterministic card render. Pure: same filtered
claims and ladders give byte-identical text. The render budget is
4096 chars by default; over it, the OLDEST-observed notes withhold
first behind an explicit marker, and the budget is a HARD upper bound
of the returned string: a card whose mandatory sections alone exceed
it is truncated with the shared marker (v1.35.0 review P2-5: a budget
of 32 used to return the full 136-char header form). budgetChars is a
nonnegative integer, validated as a ConfigError.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md)[] |
| `ladders` | readonly [`DeclaredLadder`](/api/@rulvar/core/interfaces/DeclaredLadder.md)[] |
| `options?` | \{ `budgetChars?`: `number`; `profiles?`: `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/core/interfaces/AgentProfile.md)\&gt;; \} |
| `options.budgetChars?` | `number` |
| `options.profiles?` | `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/core/interfaces/AgentProfile.md)\&gt; |

## Returns

`string`
