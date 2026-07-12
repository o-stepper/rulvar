[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / modelKnowledgeCard

# Function: modelKnowledgeCard()

```ts
function modelKnowledgeCard(
   claims, 
   ladders, 
   options?): string;
```

Defined in: [packages/core/src/knowledge/card.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/card.ts#L181)

The deterministic card render (docs/05, 4.3). Pure: same filtered
claims and ladders give byte-identical text. The render budget is
docs/06 Appendix A (4096 chars); over it, the OLDEST-observed notes
withhold first behind an explicit marker.

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
