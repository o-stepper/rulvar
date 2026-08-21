[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / semanticRoundArming

# Function: semanticRoundArming()

```ts
function semanticRoundArming(posture): SemanticRoundArming;
```

Defined in: [packages/core/src/orchestrator/admission.ts:351](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L351)

The ONE arming derivation (RV4304): the acceptance tail's money and
the capacity estimate's wires both read it, the
[dispatchProjectionReserveUsd](/api/@rulvar/core/functions/dispatchProjectionReserveUsd.md) precedent, so the two cannot
disagree about which rounds a declared posture arms. The sixth
comparison run's capacity model priced the round as a constant 2
while the merged round (RV4202) dispatches 3 wires; this function is
where that distinction lives now.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `posture` | [`SemanticRoundPosture`](/api/@rulvar/core/interfaces/SemanticRoundPosture.md) |

## Returns

[`SemanticRoundArming`](/api/@rulvar/core/interfaces/SemanticRoundArming.md)
