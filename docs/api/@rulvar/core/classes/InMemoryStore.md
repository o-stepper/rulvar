[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InMemoryStore

# Class: InMemoryStore

Defined in: [packages/core/src/stores/inmemory.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L16)

## Implements

- [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md)

## Constructors

### Constructor

```ts
new InMemoryStore(): InMemoryStore;
```

#### Returns

`InMemoryStore`

## Methods

### append()

```ts
append(runId, e): Promise<void>;
```

Defined in: [packages/core/src/stores/inmemory.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L21)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `e` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`append`](/api/@rulvar/core/interfaces/JournalStore.md#append)

***

### delete()

```ts
delete(runId): Promise<void>;
```

Defined in: [packages/core/src/stores/inmemory.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L56)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`delete`](/api/@rulvar/core/interfaces/JournalStore.md#delete)

***

### listRuns()

```ts
listRuns(f?): Promise<RunMeta[]>;
```

Defined in: [packages/core/src/stores/inmemory.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L39)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `f?` | [`RunFilter`](/api/@rulvar/core/type-aliases/RunFilter.md) |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md)[]\&gt;

#### Implementation of

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`listRuns`](/api/@rulvar/core/interfaces/JournalStore.md#listruns)

***

### load()

```ts
load(runId): Promise<JournalEntry[]>;
```

Defined in: [packages/core/src/stores/inmemory.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L30)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]\&gt;

#### Implementation of

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`load`](/api/@rulvar/core/interfaces/JournalStore.md#load)

***

### putMeta()

```ts
putMeta(m): Promise<void>;
```

Defined in: [packages/core/src/stores/inmemory.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L34)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`putMeta`](/api/@rulvar/core/interfaces/JournalStore.md#putmeta)
