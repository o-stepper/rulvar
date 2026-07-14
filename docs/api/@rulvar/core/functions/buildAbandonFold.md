[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / buildAbandonFold

# Function: buildAbandonFold()

```ts
function buildAbandonFold(entries): AbandonFold;
```

Defined in: [packages/core/src/journal/disposition.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/disposition.ts#L65)

Builds the AbandonFold in ONE pass at load, in append order, pinned for
the entire resume (DEF-1 ordering rule 4). Coverage is the target seq
itself plus, transitively, every entry under the target's child
scope-prefix. Repeated abandons over an
already-covered target fold to noop.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |

## Returns

[`AbandonFold`](/api/@rulvar/core/interfaces/AbandonFold.md)
