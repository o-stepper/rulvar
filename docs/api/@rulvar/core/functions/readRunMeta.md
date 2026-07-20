[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / readRunMeta

# Function: readRunMeta()

```ts
function readRunMeta(store, runId): Promise<RunMeta | undefined>;
```

Defined in: [packages/core/src/stores/meta-lookup.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/meta-lookup.ts#L18)

One run's meta: `getMeta` when the store has the capability, else the
full `listRuns` scan. `undefined` means the run is not in the store.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `store` | [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md) |
| `runId` | `string` |

## Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) \| `undefined`\&gt;
