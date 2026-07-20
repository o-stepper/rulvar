[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / MetaLookupStore

# Interface: MetaLookupStore

Defined in: [packages/core/src/l0/spi/store.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L132)

Exact lookup capability: fetch one run's meta without materializing
the whole catalog (the v1.25.0 scale review: `resume`, HTTP status,
and CLI point lookups were O(all runs) through `listRuns`). Optional
exactly like the lease capability: engines and shells detect it with
`hasMetaLookup` and fall back to `listRuns` + find, so a conformant
store written before this capability keeps working unoptimized. A
missing run resolves `undefined`, never a rejection.

## Extends

- [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md)

## Methods

### append()

```ts
append(
   runId, 
   e, 
lease?): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L116)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `e` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |
| `lease?` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`append`](/api/@rulvar/core/interfaces/JournalStore.md#append)

***

### delete()

```ts
delete(runId): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L120)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`delete`](/api/@rulvar/core/interfaces/JournalStore.md#delete)

***

### getMeta()

```ts
getMeta(runId): Promise<RunMeta | undefined>;
```

Defined in: [packages/core/src/l0/spi/store.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L133)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) \| `undefined`\&gt;

***

### listRuns()

```ts
listRuns(f?): Promise<RunMeta[]>;
```

Defined in: [packages/core/src/l0/spi/store.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L119)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `f?` | [`RunFilter`](/api/@rulvar/core/type-aliases/RunFilter.md) |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md)[]\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`listRuns`](/api/@rulvar/core/interfaces/JournalStore.md#listruns)

***

### load()

```ts
load(runId): Promise<JournalEntry[]>;
```

Defined in: [packages/core/src/l0/spi/store.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L117)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`load`](/api/@rulvar/core/interfaces/JournalStore.md#load)

***

### putMeta()

```ts
putMeta(m): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L118)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`putMeta`](/api/@rulvar/core/interfaces/JournalStore.md#putmeta)
