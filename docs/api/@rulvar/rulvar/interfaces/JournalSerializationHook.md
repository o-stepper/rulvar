[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournalSerializationHook

# Interface: JournalSerializationHook

Defined in: `packages/core/dist/index.d.ts`

## Methods

### fromStored()

```ts
fromStored(e): JournalEntry;
```

Defined in: `packages/core/dist/index.d.ts`

Applied at load; MUST be symmetric with toStored for replay to hold.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `e` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |

#### Returns

[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)

***

### toStored()

```ts
toStored(e): JournalEntry;
```

Defined in: `packages/core/dist/index.d.ts`

Applied at append; kernel ordering/identity fields MUST pass through.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `e` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |

#### Returns

[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)
