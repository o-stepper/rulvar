[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / compileVerifiedLayer

# Function: compileVerifiedLayer()

```ts
function compileVerifiedLayer(claims, ladders): VerifiedRecommendation[];
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The verified-layer compiler (M11-T06; docs/05, sections "Read path"
and "Composition with the model layer"): start-tier recommendations
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
| `claims` | readonly [`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md)[] |
| `ladders` | readonly [`DeclaredLadder`](/api/@rulvar/rulvar/interfaces/DeclaredLadder.md)[] |

## Returns

[`VerifiedRecommendation`](/api/@rulvar/rulvar/interfaces/VerifiedRecommendation.md)[]
