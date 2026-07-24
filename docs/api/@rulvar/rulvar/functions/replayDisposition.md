[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / replayDisposition

# Function: replayDisposition()

```ts
function replayDisposition(
   entry, 
   fold, 
   options?): OperationDisposition;
```

Defined in: `packages/core/dist/index.d.ts`

The single canonical predicate, dispatched on the entry's own
hashVersion (compatibility lemma: on the v1 domain the tables
coincide). Suspended entries are outside the table (the DEF-4 fold
consumes them); the alias column (DEF-5) activates with node.link
producers in M7: a skipped entry WITHOUT an incoming alias is always
skipped.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) | - |
| `fold` | [`AbandonFold`](/api/@rulvar/rulvar/interfaces/AbandonFold.md) | - |
| `options?` | \{ `invalidated?`: `ReadonlySet`\&lt;`number`\&gt;; `registry?`: [`DeriverRegistry`](/api/@rulvar/rulvar/type-aliases/DeriverRegistry.md); `runSettledOk?`: `boolean`; `terminal?`: [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md); \} | - |
| `options.invalidated?` | `ReadonlySet`\&lt;`number`\&gt; | - |
| `options.registry?` | [`DeriverRegistry`](/api/@rulvar/rulvar/type-aliases/DeriverRegistry.md) | - |
| `options.runSettledOk?` | `boolean` | True when the loaded journal carries a run settle with runStatus 'ok' (the resume is a pure replay of a finished run): unstamped limit entries then replay instead of re-running live. Terminal settles other than ok keep the retry semantics. |
| `options.terminal?` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) | - |

## Returns

[`OperationDisposition`](/api/@rulvar/rulvar/type-aliases/OperationDisposition.md)
