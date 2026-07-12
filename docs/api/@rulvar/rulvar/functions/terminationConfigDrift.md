[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / terminationConfigDrift

# Function: terminationConfigDrift()

```ts
function terminationConfigDrift(frozen, live): {
  field: keyof TerminationLimits;
  frozenValue: Json;
  liveValue: Json;
}[];
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Config-drift detection at resume (docs/07, 11.2): the journaled vector
always wins; every differing field is reported for the
`termination:config-drift` event. Dynamic budget top-up via restart is
excluded by construction.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `frozen` | [`TerminationLimits`](/api/@rulvar/rulvar/interfaces/TerminationLimits.md) |
| `live` | `Partial`\&lt;[`TerminationLimits`](/api/@rulvar/rulvar/interfaces/TerminationLimits.md)\&gt; |

## Returns

\{
  `field`: keyof [`TerminationLimits`](/api/@rulvar/rulvar/interfaces/TerminationLimits.md);
  `frozenValue`: [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md);
  `liveValue`: [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md);
\}[]
