[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / terminationConfigDrift

# Function: terminationConfigDrift()

```ts
function terminationConfigDrift(frozen, live): {
  field: keyof TerminationLimits;
  frozenValue: Json;
  liveValue: Json;
}[];
```

Defined in: [packages/core/src/journal/termination.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L238)

Config-drift detection at resume: the journaled vector
always wins; every differing field is reported for the
`termination:config-drift` event. Ambient config can never top up a
budget through a restart; the one explicit, journaled door is
ResumeOptions.run (RV2208), which is a decision entry, not a drift.

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
