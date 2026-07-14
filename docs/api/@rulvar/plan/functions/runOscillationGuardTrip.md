[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runOscillationGuardTrip

# Function: runOscillationGuardTrip()

```ts
function runOscillationGuardTrip(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:1700](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L1700)

oscillation-guard-trip (DEF-5): the third re-add of one SpawnKey at
maxOscillationsPerKey 2 rejects osc_guard as a typed plan_revise
error; the run closes through the non-HITL path and the embedded
verdicts replay identically.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
