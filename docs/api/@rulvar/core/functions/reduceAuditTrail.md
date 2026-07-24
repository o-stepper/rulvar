[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / reduceAuditTrail

# Function: reduceAuditTrail()

```ts
function reduceAuditTrail(entries): AuditRecord[];
```

Defined in: [packages/core/src/engine/audit.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/audit.ts#L65)

Folds a loaded journal into the audit trail, in seq order. Pass the
FULL entry list (`Engine.stores.journal.load(runId)` or
`exportRun(runId).entries`); filtering is the reducer's job.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |

## Returns

[`AuditRecord`](/api/@rulvar/core/interfaces/AuditRecord.md)[]
