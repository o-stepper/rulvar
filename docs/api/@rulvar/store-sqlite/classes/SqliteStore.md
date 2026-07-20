[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / SqliteStore

# Class: SqliteStore

Defined in: [packages/store-sqlite/src/store.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L59)

@rulvar/store-sqlite: SqliteStore implementing JournalStore and
LeasableStore with fencing epochs over the builtin node:sqlite driver;
the reference implementation for community stores (M5-T02).
Requires a Node.js with node:sqlite available
(unflagged in the 22.13+/23.4+ lines).

## Implements

- [`MetaLookupStore`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md)
- [`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md)

## Constructors

### Constructor

```ts
new SqliteStore(options): SqliteStore;
```

Defined in: [packages/store-sqlite/src/store.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L64)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`SqliteStoreOptions`](/api/@rulvar/store-sqlite/interfaces/SqliteStoreOptions.md) |

#### Returns

`SqliteStore`

## Methods

### acquire()

```ts
acquire(runId, owner): Promise<Lease>;
```

Defined in: [packages/store-sqlite/src/store.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L232)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `owner` | `string` |

#### Returns

`Promise`\&lt;[`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md)\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`acquire`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#acquire)

***

### append()

```ts
append(
   runId, 
   e, 
lease?): Promise<void>;
```

Defined in: [packages/store-sqlite/src/store.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L124)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `e` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`append`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#append)

***

### close()

```ts
close(): void;
```

Defined in: [packages/store-sqlite/src/store.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L97)

#### Returns

`void`

***

### delete()

```ts
delete(runId): Promise<void>;
```

Defined in: [packages/store-sqlite/src/store.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L217)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`delete`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#delete)

***

### getMeta()

```ts
getMeta(runId): Promise<RunMeta | undefined>;
```

Defined in: [packages/store-sqlite/src/store.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L175)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) \| `undefined`\&gt;

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md).[`getMeta`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md#getmeta)

***

### listRuns()

```ts
listRuns(f?): Promise<RunMeta[]>;
```

Defined in: [packages/store-sqlite/src/store.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L184)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `f?` | [`RunFilter`](/api/@rulvar/rulvar/type-aliases/RunFilter.md) |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md)[]\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`listRuns`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#listruns)

***

### load()

```ts
load(runId): Promise<JournalEntry[]>;
```

Defined in: [packages/store-sqlite/src/store.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L157)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`load`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#load)

***

### putMeta()

```ts
putMeta(m): Promise<void>;
```

Defined in: [packages/store-sqlite/src/store.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L165)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`putMeta`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#putmeta)

***

### release()

```ts
release(l): Promise<void>;
```

Defined in: [packages/store-sqlite/src/store.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L277)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`release`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#release)

***

### renew()

```ts
renew(l): Promise<void>;
```

Defined in: [packages/store-sqlite/src/store.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L269)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`renew`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#renew)
