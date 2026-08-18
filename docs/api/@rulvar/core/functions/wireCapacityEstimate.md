[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / wireCapacityEstimate

# Function: wireCapacityEstimate()

```ts
function wireCapacityEstimate(spec): WireCapacityEstimate;
```

Defined in: [packages/core/src/orchestrator/admission.ts:501](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L501)

The wire capacity of a declared orchestration plan (RV4005, the
fifth comparison experiment): base wires by declaration, the armed
repair round's delta, and the round's overhead share, from ONE
exported function so an answer about the runtime's own economics
has a source instead of an improvisation. The experiment's terminal
answer wrote "34 wires without repair, 35 with" and multiplied
retry share as `1 + r`: the round is TWO wires (its composition
plus the rejudge, `orchestrate.ts`'s own doctrine), so 34 becomes
36 at 5.88 percent overhead, and r retries over a base of B
multiply wires by `1 + r/B` ([retryWireMultiplier](/api/@rulvar/core/functions/retryWireMultiplier.md)), not by
`1 + r`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`WireCapacitySpec`](/api/@rulvar/core/interfaces/WireCapacitySpec.md) |

## Returns

[`WireCapacityEstimate`](/api/@rulvar/core/interfaces/WireCapacityEstimate.md)
