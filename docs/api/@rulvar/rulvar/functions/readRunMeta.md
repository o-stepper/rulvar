[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / readRunMeta

# Function: readRunMeta()

```ts
function readRunMeta(store, runId): Promise<RunMeta | undefined>;
```

Defined in: `packages/core/dist/index.d.ts`

One run's meta: `getMeta` when the store has the capability, else the
full `listRuns` scan. `undefined` means the run is not in the store.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `store` | [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) |
| `runId` | `string` |

## Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) \| `undefined`\&gt;
