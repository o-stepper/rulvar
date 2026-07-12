[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / buildAbandonFold

# Function: buildAbandonFold()

```ts
function buildAbandonFold(entries): AbandonFold;
```

Defined in: `packages/core/dist/index.d.ts`

Builds the AbandonFold in ONE pass at load, in append order, pinned for
the entire resume (DEF-1 ordering rule 4). Coverage is the target seq
itself plus, transitively, every entry under the target's child
scope-prefix. Repeated abandons over an
already-covered target fold to noop.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

## Returns

[`AbandonFold`](/api/@rulvar/rulvar/interfaces/AbandonFold.md)
