[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / SqliteStore

# Class: SqliteStore

Defined in: [packages/store-sqlite/src/store.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L50)

@rulvar/store-sqlite: SqliteStore implementing JournalStore and
LeasableStore with fencing epochs over the builtin node:sqlite driver;
the reference implementation for community stores (docs/03, section
12.6; M5-T02). Requires a Node.js with node:sqlite available
(unflagged in the 22.13+/23.4+ lines).

## Implements

- [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md)
- [`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md)

## Constructors

### Constructor

```ts
new SqliteStore(options): SqliteStore;
```

Defined in: [packages/store-sqlite/src/store.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L55)

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

Defined in: [packages/store-sqlite/src/store.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L178)

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

Defined in: [packages/store-sqlite/src/store.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L113)

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

Defined in: [packages/store-sqlite/src/store.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L86)

#### Returns

`void`

***

### delete()

```ts
delete(runId): Promise<void>;
```

Defined in: [packages/store-sqlite/src/store.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L163)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`delete`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#delete)

***

### listRuns()

```ts
listRuns(f?): Promise<RunMeta[]>;
```

Defined in: [packages/store-sqlite/src/store.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L143)

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

Defined in: [packages/store-sqlite/src/store.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L125)

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

Defined in: [packages/store-sqlite/src/store.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L133)

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

Defined in: [packages/store-sqlite/src/store.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L223)

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

Defined in: [packages/store-sqlite/src/store.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L215)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`renew`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#renew)
