[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / reduceAuditTrail

# Function: reduceAuditTrail()

```ts
function reduceAuditTrail(entries): AuditRecord[];
```

Defined in: `packages/core/dist/index.d.ts`

Folds a loaded journal into the audit trail, in seq order. Pass the
FULL entry list (`Engine.stores.journal.load(runId)` or
`exportRun(runId).entries`); filtering is the reducer's job.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

## Returns

[`AuditRecord`](/api/@rulvar/rulvar/interfaces/AuditRecord.md)[]
