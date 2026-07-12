[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runFinalizeFallbackSynthesized

# Function: runFinalizeFallbackSynthesized()

```ts
function runFinalizeFallbackSynthesized(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:724](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L724)

finalize-fallback-synthesized (DEF-7): the final finish fails inside
its turn limit; the engine journals orchestrator_finalize_fallback and
synthesizes the deterministic partial by pure fold; outcome exhausted
with the non-null value.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
