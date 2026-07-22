[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / SqliteStore

# Class: SqliteStore

Defined in: [packages/store-sqlite/src/store.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L73)

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

Defined in: [packages/store-sqlite/src/store.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L78)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`SqliteStoreOptions`](/api/@rulvar/store-sqlite/interfaces/SqliteStoreOptions.md) |

#### Returns

`SqliteStore`

## Accessors

### leaseTtlMs

#### Get Signature

```ts
get leaseTtlMs(): number;
```

Defined in: [packages/store-sqlite/src/store.ts:292](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L292)

TTL introspection (the LeasableStore optional capability): lets
createWorker verify at construction that its renew cadence matches
this store's expiry instead of trusting two config sources to agree.

##### Returns

`number`

Optional TTL introspection (v1.35.0 review P2-4): the configured
lease ttl in milliseconds. A store exposing it lets createWorker
VERIFY at construction that the worker's renew cadence matches the
store's expiry instead of trusting two config sources to agree;
stores without it are accepted with the worker's own ttl.

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`leaseTtlMs`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#property-leasettlms)

## Methods

### acquire()

```ts
acquire(runId, owner): Promise<Lease>;
```

Defined in: [packages/store-sqlite/src/store.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L297)

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

Defined in: [packages/store-sqlite/src/store.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L201)

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

Defined in: [packages/store-sqlite/src/store.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L124)

#### Returns

`void`

***

### delete()

```ts
delete(runId): Promise<void>;
```

Defined in: [packages/store-sqlite/src/store.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L273)

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

Defined in: [packages/store-sqlite/src/store.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L230)

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

Defined in: [packages/store-sqlite/src/store.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L239)

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

Defined in: [packages/store-sqlite/src/store.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L212)

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

Defined in: [packages/store-sqlite/src/store.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L220)

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

Defined in: [packages/store-sqlite/src/store.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L345)

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

Defined in: [packages/store-sqlite/src/store.ts:334](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L334)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`renew`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#renew)
