[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / terminationConfigDrift

# Function: terminationConfigDrift()

```ts
function terminationConfigDrift(frozen, live): {
  field: keyof TerminationLimits;
  frozenValue: Json;
  liveValue: Json;
}[];
```

Defined in: `packages/core/dist/index.d.ts`

Config-drift detection at resume: the journaled vector
always wins; every differing field is reported for the
`termination:config-drift` event. Ambient config can never top up a
budget through a restart; the one explicit, journaled door is
ResumeOptions.run (RV2208), which is a decision entry, not a drift.

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
