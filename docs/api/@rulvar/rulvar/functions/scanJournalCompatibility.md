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

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The one compatibility scan: immediately after load, strictly BEFORE any
live call, any append, and any admission reserve; repeated at lease
acquire in queue mode (docs/03, section 4.5). Side-effect free.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `registry` | [`DeriverRegistry`](/api/@rulvar/rulvar/type-aliases/DeriverRegistry.md) |

## Returns

`void`
