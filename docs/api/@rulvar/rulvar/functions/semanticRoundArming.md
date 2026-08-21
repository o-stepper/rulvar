[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / semanticRoundArming

# Function: semanticRoundArming()

```ts
function semanticRoundArming(posture): SemanticRoundArming;
```

Defined in: `packages/core/dist/index.d.ts`

The ONE arming derivation (RV4304): the acceptance tail's money and
the capacity estimate's wires both read it, the
[dispatchProjectionReserveUsd](/api/@rulvar/rulvar/functions/dispatchProjectionReserveUsd.md) precedent, so the two cannot
disagree about which rounds a declared posture arms. The sixth
comparison run's capacity model priced the round as a constant 2
while the merged round (RV4202) dispatches 3 wires; this function is
where that distinction lives now.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `posture` | [`SemanticRoundPosture`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md) |

## Returns

[`SemanticRoundArming`](/api/@rulvar/rulvar/interfaces/SemanticRoundArming.md)
