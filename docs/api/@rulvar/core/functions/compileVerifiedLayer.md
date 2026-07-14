[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / compileVerifiedLayer

# Function: compileVerifiedLayer()

```ts
function compileVerifiedLayer(claims, ladders): VerifiedRecommendation[];
```

Defined in: [packages/core/src/knowledge/card.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/card.ts#L126)

The verified-layer compiler (M11-T06): start-tier recommendations
per (ladder, taskClass) compiled EXCLUSIVELY from eval-measured
claims. A strength on a rung below the default votes down (start
cheaper); a weakness on the default rung or below votes up. The net
sign shifts EXACTLY one rung, bounded to the ladder (the clamp: the
price of any false belief is one rung); ties hold the default and
compile nothing. Editorial claims NEVER compile. Floors and
ModelCaps stay hard router constraints; budget is touched only
through the existing admission path. A deterministic pure function:
the M12 consumers read THIS, never the card text.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md)[] |
| `ladders` | readonly [`DeclaredLadder`](/api/@rulvar/core/interfaces/DeclaredLadder.md)[] |

## Returns

[`VerifiedRecommendation`](/api/@rulvar/core/interfaces/VerifiedRecommendation.md)[]
