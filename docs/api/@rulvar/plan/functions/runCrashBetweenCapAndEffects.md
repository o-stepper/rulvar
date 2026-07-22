[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runCrashBetweenCapAndEffects

# Function: runCrashBetweenCapAndEffects()

```ts
function runCrashBetweenCapAndEffects(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:681](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L681)

crash-between-cap-and-effects (DEF-7): process death right after the
cap decision entry, before any of its effects; resume re-derives the
frozen state from the entry and rolls the forced finish forward.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
