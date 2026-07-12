[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / scanJournalCompatibility

# Function: scanJournalCompatibility()

```ts
function scanJournalCompatibility(
   runId, 
   entries, 
   registry): void;
```

Defined in: `packages/core/dist/index.d.ts`

The one compatibility scan: immediately after load, strictly BEFORE any
live call, any append, and any admission reserve; repeated at lease
acquire in queue mode. Side-effect free.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `registry` | [`DeriverRegistry`](/api/@rulvar/rulvar/type-aliases/DeriverRegistry.md) |

## Returns

`void`
