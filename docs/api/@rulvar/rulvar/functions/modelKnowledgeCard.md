[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / modelKnowledgeCard

# Function: modelKnowledgeCard()

```ts
function modelKnowledgeCard(
   claims, 
   ladders, 
   options?): string;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The deterministic card render (docs/05, 4.3). Pure: same filtered
claims and ladders give byte-identical text. The render budget is
docs/06 Appendix A (4096 chars); over it, the OLDEST-observed notes
withhold first behind an explicit marker.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md)[] |
| `ladders` | readonly [`DeclaredLadder`](/api/@rulvar/rulvar/interfaces/DeclaredLadder.md)[] |
| `options?` | \{ `budgetChars?`: `number`; `profiles?`: `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md)\&gt;; \} |
| `options.budgetChars?` | `number` |
| `options.profiles?` | `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md)\&gt; |

## Returns

`string`
