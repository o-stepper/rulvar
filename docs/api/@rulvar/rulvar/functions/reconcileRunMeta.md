[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / reconcileRunMeta

# Function: reconcileRunMeta()

```ts
function reconcileRunMeta(
   store, 
   runId, 
opts?): Promise<ReconcileResult>;
```

Defined in: `packages/core/dist/index.d.ts`

Repairs a divergent meta row from the journal: 'meta-behind' and
'stranded' audits rewrite `status` (every other meta field, unknown
fields included, is preserved byte for byte), 'suspect' and
'consistent' audits change nothing. Zero model calls, no workflow
needed; the crash residue between a settle's journal flush and its
meta write repairs without resuming the run at all.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `store` | [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) |
| `runId` | `string` |
| `opts?` | [`ReconcileOptions`](/api/@rulvar/rulvar/interfaces/ReconcileOptions.md) |

## Returns

`Promise`\&lt;[`ReconcileResult`](/api/@rulvar/rulvar/interfaces/ReconcileResult.md)\&gt;
