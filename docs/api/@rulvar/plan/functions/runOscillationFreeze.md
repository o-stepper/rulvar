[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runOscillationFreeze

# Function: runOscillationFreeze()

```ts
function runOscillationFreeze(options?): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:371](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L371)

oscillation-freeze: the coarse-signature oscillation detector freezes
further re-adds under hysteresis (distinct from the
per-key osc_guard reject).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`PlanRunnerOptions`](/api/@rulvar/plan/interfaces/PlanRunnerOptions.md) |

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
