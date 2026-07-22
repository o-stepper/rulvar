[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runEscalationStormFrozen

# Function: runEscalationStormFrozen()

```ts
function runEscalationStormFrozen(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:752](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L752)

escalation-storm-frozen (DEF-7 set): three Flavor B escalations while
the plan is frozen at the cap; each resolves through its journaled
defaultDecision and the lineage counters hold. The branches CHAIN via
dependencies so exactly one deadline timer is live at a time: the
journal byte order stays deterministic (DEF-4 already guarantees the
fold; the cassette asserts bytes).

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
