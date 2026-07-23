[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / SqliteStore

# Class: SqliteStore

Defined in: [packages/store-sqlite/src/store.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L98)

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

Defined in: [packages/store-sqlite/src/store.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L112)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`SqliteStoreOptions`](/api/@rulvar/store-sqlite/interfaces/SqliteStoreOptions.md) |

#### Returns

`SqliteStore`

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-fencedwrites"></a> `fencedWrites` | `readonly` | `true` | The fenced writes promise (fenced run state RFC, phase 2): every lease-carrying mutation of this store (append, putMeta, delete) verifies the lease is the current holder FOR THE MUTATED RUN, atomically with the mutation, and rejects stale or mismatched holders with the typed LeaseHeldError leaving nothing changed. | [packages/store-sqlite/src/store.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L106) |

## Accessors

### leaseTtlMs

#### Get Signature

```ts
get leaseTtlMs(): number;
```

Defined in: [packages/store-sqlite/src/store.ts:459](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L459)

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

Defined in: [packages/store-sqlite/src/store.ts:464](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L464)

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

Defined in: [packages/store-sqlite/src/store.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L256)

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

Defined in: [packages/store-sqlite/src/store.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L164)

#### Returns

`void`

***

### delete()

```ts
delete(runId, lease?): Promise<void>;
```

Defined in: [packages/store-sqlite/src/store.ts:351](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L351)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`delete`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#delete)

***

### getMeta()

```ts
getMeta(runId): Promise<RunMeta | undefined>;
```

Defined in: [packages/store-sqlite/src/store.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L301)

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

Defined in: [packages/store-sqlite/src/store.ts:310](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L310)

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

Defined in: [packages/store-sqlite/src/store.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L268)

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
putMeta(m, lease?): Promise<void>;
```

Defined in: [packages/store-sqlite/src/store.ts:285](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L285)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`putMeta`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#putmeta)

***

### release()

```ts
release(l): Promise<void>;
```

Defined in: [packages/store-sqlite/src/store.ts:512](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L512)

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

Defined in: [packages/store-sqlite/src/store.ts:501](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L501)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`renew`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#renew)

***

### transcripts()

```ts
transcripts(): SqliteTranscriptStore;
```

Defined in: [packages/store-sqlite/src/store.ts:390](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L390)

The fenced transcript twin (fenced run state RFC, F2): a
TranscriptStore whose blobs live in THIS store's database, beside
the lease rows, so a lease-carrying put or delete verifies the
current holder of the run the ref's leading path segment names
atomically with the blob mutation, in the same one-immediate-
transaction shape as the journal side. Sharing the connection is
what makes the capability implementable at all (a blob write and a
lease check in different domains cannot commit as one unit; with
':memory:' a separate connection would not even see the leases) and
keeps one close() lifecycle. Wire it as the engine's transcript
store next to this store as the journal: over the pair every
durable run mutation is fenced, which is what
`assertFencedWrites({ journal, transcripts })` verifies. The blob
cascade of `deleteRun`/`pruneRun` stays ENGINE-side, exactly as the
TranscriptStore contract says; the journal-side `delete(runId)`
never touches blob rows.

#### Returns

[`SqliteTranscriptStore`](/api/@rulvar/store-sqlite/interfaces/SqliteTranscriptStore.md)
