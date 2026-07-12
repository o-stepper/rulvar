[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runCapFreezeThenFinish

# Function: runCapFreezeThenFinish()

```ts
function runCapFreezeThenFinish(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:659](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L659)

cap-freeze-then-finish (DEF-7): the soft boundary crossed with live
children; the cap decision precedes its effects; admitted nodes run to
completion; the final quiescence wake gets the finish-only toolset;
outcome ok with forcedFinish.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
