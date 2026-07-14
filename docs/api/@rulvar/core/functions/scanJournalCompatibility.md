[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / scanJournalCompatibility

# Function: scanJournalCompatibility()

```ts
function scanJournalCompatibility(
   runId, 
   entries, 
   registry): void;
```

Defined in: [packages/core/src/journal/keyderiver.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/keyderiver.ts#L173)

The one compatibility scan: immediately after load, strictly BEFORE any
live call, any append, and any admission reserve; repeated at lease
acquire in queue mode. Side-effect free.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |
| `registry` | [`DeriverRegistry`](/api/@rulvar/core/type-aliases/DeriverRegistry.md) |

## Returns

`void`
