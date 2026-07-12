[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / terminationConfigDrift

# Function: terminationConfigDrift()

```ts
function terminationConfigDrift(frozen, live): {
  field: keyof TerminationLimits;
  frozenValue: Json;
  liveValue: Json;
}[];
```

Defined in: [packages/core/src/journal/termination.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L222)

Config-drift detection at resume: the journaled vector
always wins; every differing field is reported for the
`termination:config-drift` event. Dynamic budget top-up via restart is
excluded by construction.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `frozen` | [`TerminationLimits`](/api/@rulvar/core/interfaces/TerminationLimits.md) |
| `live` | `Partial`\&lt;[`TerminationLimits`](/api/@rulvar/core/interfaces/TerminationLimits.md)\&gt; |

## Returns

\{
  `field`: keyof [`TerminationLimits`](/api/@rulvar/core/interfaces/TerminationLimits.md);
  `frozenValue`: [`Json`](/api/@rulvar/core/type-aliases/Json.md);
  `liveValue`: [`Json`](/api/@rulvar/core/type-aliases/Json.md);
\}[]
