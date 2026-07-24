[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournalSerializationHook

# Interface: JournalSerializationHook

Defined in: [packages/core/src/l0/serialization.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L41)

## Methods

### fromStored()

```ts
fromStored(e, ctx?): JournalEntry;
```

Defined in: [packages/core/src/l0/serialization.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L45)

Applied at load; MUST be symmetric with toStored for replay to hold.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `e` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |
| `ctx?` | [`JournalSerializationContext`](/api/@rulvar/core/interfaces/JournalSerializationContext.md) |

#### Returns

[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)

***

### toStored()

```ts
toStored(e, ctx?): JournalEntry;
```

Defined in: [packages/core/src/l0/serialization.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L43)

Applied at append; kernel ordering/identity fields MUST pass through.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `e` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |
| `ctx?` | [`JournalSerializationContext`](/api/@rulvar/core/interfaces/JournalSerializationContext.md) |

#### Returns

[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)
