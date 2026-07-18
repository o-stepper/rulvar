[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / auditV1190CacheJournal

# Function: auditV1190CacheJournal()

```ts
function auditV1190CacheJournal(entries, priceUsd): V1190CacheAudit;
```

Defined in: [packages/openai/src/audit.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/audit.ts#L72)

Folds a journal twice with the SAME price function: once as recorded
and once with every affected OpenAI usage passed through
`undoV1190CacheDoubleCount`, returning both totals and the affected
entry count. An entry (or per-model slice) counts as affected when it
was served by the `openai` adapter, carries cache writes, and has no
`usageSemantics` stamp; stamped entries are already correct and fold
identically in both totals. The journal itself is never touched.
`recordedUsd - correctedUsd` is the exact overcharge IF the journal
was recorded by v1.19.0; for a v1.20.0 journal the same shape folds
to a smaller `correctedUsd` that does NOT correspond to any real
charge, so version provenance stays the caller's responsibility.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` |

## Returns

[`V1190CacheAudit`](/api/@rulvar/openai/interfaces/V1190CacheAudit.md)
