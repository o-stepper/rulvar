[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournalSerializationHook

# Interface: JournalSerializationHook

Defined in: [packages/core/src/l0/serialization.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L29)

## Methods

### fromStored()

```ts
fromStored(e): JournalEntry;
```

Defined in: [packages/core/src/l0/serialization.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L33)

Applied at load; MUST be symmetric with toStored for replay to hold.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `e` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

#### Returns

[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)

***

### toStored()

```ts
toStored(e): JournalEntry;
```

Defined in: [packages/core/src/l0/serialization.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L31)

Applied at append; kernel ordering/identity fields MUST pass through.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `e` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

#### Returns

[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)
